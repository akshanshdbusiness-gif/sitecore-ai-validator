import Link from 'next/link';
import type { CSSProperties } from 'react';
import { colors } from '@/src/lib/theme';

const LINKS = [
  { href: '/', label: 'Website' },
  { href: '/docs', label: 'Docs' },
  { href: '/support', label: 'Support' },
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms and conditions' },
];

export function Footer() {
  return (
    <footer style={footerStyle}>
      <nav style={navStyle}>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} style={linkStyle}>
            {link.label}
          </Link>
        ))}
      </nav>
      <p style={copyStyle}>© {new Date().getFullYear()} SitecoreAI Validator</p>
      <p style={disclaimerStyle}>
        Sitecore is a registered trademark of Sitecore Corporation A/S. SitecoreAI Validator is an
        independent community project and is not affiliated with, sponsored by, or endorsed by Sitecore.
      </p>
    </footer>
  );
}

const footerStyle: CSSProperties = {
  maxWidth: 820,
  margin: '0 auto',
  padding: '24px 20px 40px',
  borderTop: `1px solid ${colors.border}`,
};

const navStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 16,
  marginBottom: 10,
};

const linkStyle: CSSProperties = {
  fontSize: 13,
  color: colors.textSecondary,
  textDecoration: 'none',
};

const copyStyle: CSSProperties = {
  fontSize: 12,
  color: colors.textMuted,
  margin: 0,
};

const disclaimerStyle: CSSProperties = {
  fontSize: 11,
  color: colors.textMuted,
  margin: '6px 0 0',
  lineHeight: 1.5,
  maxWidth: 640,
};
