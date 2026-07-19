import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('dns/promises', () => ({
  default: { lookup: vi.fn() },
}));

import dns from 'dns/promises';
import { assertSafeExternalUrl, assertSafeSitecoreEdgeUrl, UnsafeUrlError } from './urlSafety';

const mockedLookup = vi.mocked(dns.lookup);

function mockLookupResult(addresses: { address: string; family: number }[]) {
  // dns.lookup's promise-API type is overloaded on the `all` option; the
  // mock always returns the array form since urlSafety.ts always passes
  // `{ all: true }`, so this cast just satisfies the overload picked by
  // TS's inference rather than changing runtime behavior.
  mockedLookup.mockResolvedValue(addresses as never);
}

describe('assertSafeExternalUrl', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-https protocols', async () => {
    await expect(assertSafeExternalUrl('http://93.184.216.34')).rejects.toThrow(UnsafeUrlError);
  });

  it('rejects malformed URLs', async () => {
    await expect(assertSafeExternalUrl('not a url')).rejects.toThrow(UnsafeUrlError);
  });

  it('rejects the localhost hostname outright', async () => {
    await expect(assertSafeExternalUrl('https://localhost')).rejects.toThrow(UnsafeUrlError);
  });

  it.each(['10.0.0.1', '172.16.5.1', '192.168.1.1', '127.0.0.1', '169.254.169.254', '0.0.0.0'])(
    'rejects the private/reserved IPv4 literal %s without a DNS lookup',
    async (ip) => {
      await expect(assertSafeExternalUrl(`https://${ip}`)).rejects.toThrow(UnsafeUrlError);
      expect(mockedLookup).not.toHaveBeenCalled();
    }
  );

  it('rejects the IPv6 loopback and link-local literals', async () => {
    await expect(assertSafeExternalUrl('https://[::1]')).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeExternalUrl('https://[fe80::1]')).rejects.toThrow(UnsafeUrlError);
  });

  it('accepts a public IPv4 literal without needing DNS', async () => {
    const url = await assertSafeExternalUrl('https://93.184.216.34/x');
    expect(url.hostname).toBe('93.184.216.34');
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('rejects a hostname that resolves to a private IP', async () => {
    mockLookupResult([{ address: '10.1.2.3', family: 4 }]);
    await expect(assertSafeExternalUrl('https://internal.example.com')).rejects.toThrow(UnsafeUrlError);
  });

  it('accepts a hostname that resolves to a public IP', async () => {
    mockLookupResult([{ address: '93.184.216.34', family: 4 }]);
    const url = await assertSafeExternalUrl('https://example.vercel.app');
    expect(url.hostname).toBe('example.vercel.app');
  });

  it('rejects when DNS resolution fails', async () => {
    mockedLookup.mockRejectedValue(new Error('ENOTFOUND'));
    await expect(assertSafeExternalUrl('https://does-not-exist.example')).rejects.toThrow(UnsafeUrlError);
  });

  it('rejects if any resolved address is private, even if others are public', async () => {
    mockLookupResult([
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.1', family: 4 },
    ]);
    await expect(assertSafeExternalUrl('https://mixed.example.com')).rejects.toThrow(UnsafeUrlError);
  });
});

describe('assertSafeSitecoreEdgeUrl', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('accepts a *.sitecorecloud.io host', async () => {
    mockLookupResult([{ address: '93.184.216.34', family: 4 }]);
    const url = await assertSafeSitecoreEdgeUrl('https://edge-platform.sitecorecloud.io');
    expect(url.hostname).toBe('edge-platform.sitecorecloud.io');
  });

  it('rejects a public but non-sitecorecloud.io host, closing the edgeUrl SSRF bypass', async () => {
    mockLookupResult([{ address: '93.184.216.34', family: 4 }]);
    await expect(assertSafeSitecoreEdgeUrl('https://attacker.example.com')).rejects.toThrow(UnsafeUrlError);
  });

  it('rejects a private IP even if disguised with a sitecorecloud.io-like path', async () => {
    await expect(assertSafeSitecoreEdgeUrl('https://10.0.0.5')).rejects.toThrow(UnsafeUrlError);
  });
});
