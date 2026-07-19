import type { CSSProperties } from 'react';
import Link from 'next/link';
import { colors } from '@/src/lib/theme';

const SITECORE_PLATFORM_URL = 'https://www.sitecore.com/platform';

/**
 * Text-only wordmark — no logo image/mark of any kind, to avoid any use of
 * Sitecore's own trademarked logo. "SitecoreAI" and "Validator" are kept as
 * visually and functionally separate elements: "SitecoreAI" links out to
 * Sitecore's platform page, "Validator" links back to this app's homepage.
 */
export function LogoLockup({ height = 22 }: { height?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: Math.round(height * 0.5) }}>
      <a href={SITECORE_PLATFORM_URL} target="_blank" rel="noreferrer" style={nameStyle(height)}>
        SitecoreAI
      </a>
      <span style={{ width: 1, height, background: colors.borderStrong, alignSelf: 'center' }} aria-hidden />
      <Link href="/" style={descriptorStyle(height)}>
        Validator
      </Link>
    </div>
  );
}

function nameStyle(height: number): CSSProperties {
  return {
    fontSize: height,
    fontWeight: 800,
    color: colors.textPrimary,
    letterSpacing: '-0.01em',
    lineHeight: 1,
    textDecoration: 'none',
  };
}

function descriptorStyle(height: number): CSSProperties {
  return {
    fontSize: Math.round(height * 0.62),
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: colors.teal,
    whiteSpace: 'nowrap',
    textDecoration: 'none',
  };
}
