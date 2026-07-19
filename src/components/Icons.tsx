import { colors } from '@/src/lib/theme';

interface IconProps {
  size?: number;
  color?: string;
}

const baseProps = (size: number, color: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: color,
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function ShieldCheckIcon({ size = 22, color = colors.cyan }: IconProps) {
  return (
    <svg {...baseProps(size, color)}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function LightningIcon({ size = 22, color = colors.blue }: IconProps) {
  return (
    <svg {...baseProps(size, color)}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

export function EyeIcon({ size = 22, color = colors.purple }: IconProps) {
  return (
    <svg {...baseProps(size, color)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function PeopleIcon({ size = 22, color = colors.teal }: IconProps) {
  return (
    <svg {...baseProps(size, color)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.5 14.2c2.4.4 4.5 2.5 4.5 5.8" />
    </svg>
  );
}
