import type { CSSProperties } from 'react';
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

/**
 * Full lockup: [ SitecoreAI logo ] | Validator — the SitecoreAI brand and the
 * "Validator" app descriptor kept as visually separate elements.
 */
export function LogoLockup({ height = 26 }: { height?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(height * 0.5) }}>
      <SitecoreAILogo height={height} />
      <span style={{ width: 1, height: Math.round(height * 0.72), background: colors.borderStrong }} aria-hidden />
      <span style={descriptorStyle(height)}>Validator</span>
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
  };
}
