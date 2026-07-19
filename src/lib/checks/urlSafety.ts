import dns from 'dns/promises';
import net from 'net';

export class UnsafeUrlError extends Error {}

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal', 'metadata.goog']);

function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true; // RFC1918 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918 172.16.0.0/12
    if (a === 192 && b === 168) return true; // RFC1918 192.168.0.0/16
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata 169.254.169.254
    if (a === 0) return true; // "this network"
    if (a >= 224) return true; // multicast/reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1') return true; // loopback
    if (normalized.startsWith('fe80:')) return true; // link-local
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // unique local fc00::/7
    if (normalized.startsWith('::ffff:')) {
      const embeddedV4 = normalized.split(':').pop() ?? '';
      if (net.isIPv4(embeddedV4)) return isPrivateOrReservedIp(embeddedV4);
    }
    return false;
  }
  return true; // unrecognized format — block rather than risk it
}

/**
 * Validates a user-supplied URL is safe for the server to fetch: https only,
 * not a known metadata/loopback hostname alias, and resolves to a public IP
 * (no RFC1918/loopback/link-local/cloud-metadata ranges). Every outbound
 * fetch in the check engine that's driven by client-supplied config
 * (deploymentUrl, sitecoreEdge.edgeUrl) must go through this first — without
 * it, POST /api/checks is a server-side-request-forgery primitive against
 * whatever internal network the deployment runs on.
 *
 * Known limitation: this resolves DNS once up front, then the actual fetch()
 * resolves again independently — a narrow DNS-rebinding window exists
 * between the two lookups. Full protection would require pinning the fetch
 * to the validated IP via a custom connection dispatcher; this check still
 * closes the primary exploit path (static private/metadata IPs and
 * non-rebinding hostnames) with proportionate complexity for this app.
 */
export async function assertSafeExternalUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError(`"${rawUrl}" is not a valid URL`);
  }

  if (parsed.protocol !== 'https:') {
    throw new UnsafeUrlError(`Only https:// URLs are allowed, got "${parsed.protocol}"`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new UnsafeUrlError(`Refusing to fetch blocked hostname "${hostname}"`);
  }

  // URL.hostname returns IPv6 literals bracketed (e.g. "[::1]"), which
  // net.isIP() and the IP-range checks below don't understand — strip the
  // brackets before treating it as a possible IP literal.
  const unbracketedHostname =
    hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;

  const addresses = net.isIP(unbracketedHostname)
    ? [unbracketedHostname]
    : await dns
        .lookup(hostname, { all: true })
        .then((records) => records.map((r) => r.address))
        .catch(() => {
          throw new UnsafeUrlError(`Could not resolve hostname "${hostname}"`);
        });

  if (addresses.length === 0 || addresses.some(isPrivateOrReservedIp)) {
    throw new UnsafeUrlError(`"${hostname}" resolves to a private or reserved IP address`);
  }

  return parsed;
}

/** Stricter allowlist for Sitecore Experience Edge specifically — must be a real sitecorecloud.io host. */
export async function assertSafeSitecoreEdgeUrl(rawUrl: string): Promise<URL> {
  const parsed = await assertSafeExternalUrl(rawUrl);
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== 'sitecorecloud.io' && !hostname.endsWith('.sitecorecloud.io')) {
    throw new UnsafeUrlError(`"${hostname}" is not a sitecorecloud.io host`);
  }
  return parsed;
}
