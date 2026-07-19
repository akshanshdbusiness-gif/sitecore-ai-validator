/**
 * SitecoreAI Validator brand kit tokens. Palette, gradients, and status
 * colors are pulled directly from the brand kit (logo, dashboard mockup,
 * color swatches); "warn"/"fail" aren't in the 6-swatch palette itself but
 * are chosen to read clearly against the dark navy background and match
 * the amber/red dots shown in the brand kit's dashboard mockup legend.
 */
export const colors = {
  background: '#0D0F1A',
  surface: '#141726',
  surfaceRaised: '#1B1F33',
  border: 'rgba(245, 246, 250, 0.08)',
  borderStrong: 'rgba(245, 246, 250, 0.16)',
  textPrimary: '#F5F6FA',
  textSecondary: '#9AA1B5',
  textMuted: '#6B7280',
  blue: '#256EFF',
  cyan: '#00D4FF',
  teal: '#00E6A8',
  purple: '#A259FF',
  gray: '#6B7280',
} as const;

export const statusColors = {
  pass: colors.teal,
  warn: '#FFC145',
  fail: '#FF5C7A',
  skipped: colors.gray,
} as const;

export const gradients = {
  brand: `linear-gradient(135deg, ${colors.blue} 0%, ${colors.cyan} 55%, ${colors.teal} 100%)`,
  accentText: `linear-gradient(90deg, ${colors.blue} 0%, ${colors.purple} 100%)`,
  button: `linear-gradient(90deg, ${colors.blue} 0%, ${colors.cyan} 100%)`,
} as const;

export const fontFamily = "var(--font-manrope), Manrope, system-ui, sans-serif";
