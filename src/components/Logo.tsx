import type { CSSProperties } from 'react';
import { colors, gradients } from '@/src/lib/theme';

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoMarkGradient" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={colors.blue} />
          <stop offset="55%" stopColor={colors.cyan} />
          <stop offset="100%" stopColor={colors.purple} />
        </linearGradient>
      </defs>
      <path
        d="M20 2.5L36 11.25V28.75L20 37.5L4 28.75V11.25L20 2.5Z"
        stroke="url(#logoMarkGradient)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="17" cy="18" r="6.5" stroke="url(#logoMarkGradient)" strokeWidth="2" />
      <line
        x1="21.6"
        y1="22.6"
        x2="27.5"
        y2="28.5"
        stroke="url(#logoMarkGradient)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 18.2l2 2 3.8-4"
        stroke={colors.teal}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ size = 22 }: { size?: number }) {
  const nameStyle: CSSProperties = { fontSize: size, fontWeight: 800, color: colors.textPrimary };
  const aiStyle: CSSProperties = {
    background: gradients.accentText,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };
  const subStyle: CSSProperties = {
    fontSize: Math.round(size * 0.42),
    fontWeight: 700,
    letterSpacing: '0.22em',
    color: colors.teal,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05, gap: 2 }}>
      <span style={nameStyle}>
        Sitecore
        <span style={aiStyle}>AI</span>
      </span>
      <span style={subStyle}>VALIDATOR</span>
    </div>
  );
}

export function LogoLockup({ markSize = 40, textSize = 22 }: { markSize?: number; textSize?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <LogoMark size={markSize} />
      <Wordmark size={textSize} />
    </div>
  );
}
