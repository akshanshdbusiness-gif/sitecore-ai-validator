import type { CSSProperties } from 'react';
import Link from 'next/link';
import { colors } from '@/src/lib/theme';

/**
 * The official SitecoreAI logo (mark + wordmark), served from
 * public/logo-sitecoreai.svg. The only edit to the official asset is
 * recoloring the near-black wordmark text to light so it reads on the app's
 * dark background — the dot mark and "AI" gradients are untouched.
 */
export function SitecoreAILogo({ height = 26 }: { height?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-sitecoreai.svg"
      alt="SitecoreAI"
      style={{ height, width: 'auto', display: 'block' }}
    />
  );
}

const SITECORE_PLATFORM_URL = 'https://www.sitecore.com/platform';

/**
 * Full lockup: [ SitecoreAI logo ] | Validator — kept as visually separate,
 * separately-linked elements. "SitecoreAI" links out to Sitecore's own
 * platform page; "Validator" links back to this app's homepage.
 */
export function LogoLockup({ height = 26 }: { height?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(height * 0.5) }}>
      <a
        href={SITECORE_PLATFORM_URL}
        target="_blank"
        rel="noreferrer"
        style={{ display: 'block', lineHeight: 0 }}
      >
        <SitecoreAILogo height={height} />
      </a>
      <span style={{ width: 1, height: Math.round(height * 0.72), background: colors.borderStrong }} aria-hidden />
      <Link href="/" style={descriptorStyle(height)}>
        Validator
      </Link>
    </div>
  );
}

function descriptorStyle(height: number): CSSProperties {
  return {
    fontSize: Math.round(height * 0.44),
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: colors.teal,
    whiteSpace: 'nowrap',
    textDecoration: 'none',
  };
}
