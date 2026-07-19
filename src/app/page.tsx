import Link from 'next/link';
import type { CSSProperties } from 'react';
import { LogoLockup } from '@/src/components/Logo';
import { EyeIcon, LightningIcon, PeopleIcon, ShieldCheckIcon } from '@/src/components/Icons';
import { colors, gradients } from '@/src/lib/theme';

const VALUE_PROPS = [
  { Icon: ShieldCheckIcon, title: 'Accurate', body: 'Checks against real build data' },
  { Icon: LightningIcon, title: 'Fast', body: 'Automate. Save time.' },
  { Icon: EyeIcon, title: 'Transparent', body: 'Clear and explainable' },
  { Icon: PeopleIcon, title: 'Collaborative', body: 'Built for teams' },
];

export default function HomePage() {
  return (
    <main style={mainStyle}>
      <section style={heroStyle}>
        <LogoLockup height={40} />
        <p style={taglineStyle}>Validate. Assure. Publish with confidence.</p>
        <p style={purposeStyle}>
          SitecoreAI Validator ensures content quality, compliance and accuracy, helping teams validate,
          assure and publish with confidence. It checks whether a Next.js + SitecoreAI deployment on Vercel
          actually built the way it was supposed to.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
          <Link href="/validate" style={primaryButtonStyle}>
            Run a validation
          </Link>
          <Link href="/docs" style={secondaryButtonStyle}>
            How it works
          </Link>
        </div>
      </section>

      <section style={{ marginTop: 48 }}>
        <div style={valueGridStyle}>
          {VALUE_PROPS.map(({ Icon, title, body }) => (
            <div key={title} style={valueCardStyle}>
              <Icon size={26} />
              <strong style={{ color: colors.textPrimary, fontSize: 15 }}>{title}</strong>
              <span style={{ color: colors.textSecondary, fontSize: 13 }}>{body}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

const mainStyle: CSSProperties = {
  maxWidth: 820,
  margin: '0 auto',
  padding: '64px 20px 80px',
};

const heroStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
};

const taglineStyle: CSSProperties = {
  marginTop: 24,
  fontSize: 20,
  fontWeight: 700,
  color: colors.textPrimary,
};

const purposeStyle: CSSProperties = {
  marginTop: 10,
  maxWidth: 560,
  color: colors.textSecondary,
  lineHeight: 1.6,
  fontSize: 15,
};

const primaryButtonStyle: CSSProperties = {
  padding: '11px 22px',
  background: gradients.button,
  color: colors.background,
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  textDecoration: 'none',
};

const secondaryButtonStyle: CSSProperties = {
  padding: '11px 22px',
  background: 'transparent',
  border: `1px solid ${colors.borderStrong}`,
  color: colors.textPrimary,
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
};

const valueGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 14,
};

const valueCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '18px 16px',
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  background: colors.surface,
};
