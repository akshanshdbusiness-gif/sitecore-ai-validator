import Link from 'next/link';
import type { CSSProperties } from 'react';
import { LogoLockup } from '@/src/components/Logo';
import { colors } from '@/src/lib/theme';

const REPO_URL = 'https://github.com/akshanshdbusiness-gif/sitecore-ai-validator';

export default function SupportPage() {
  return (
    <main style={mainStyle}>
      <div style={{ marginBottom: 20 }}>
        <LogoLockup markSize={32} textSize={18} />
      </div>
      <h1 style={h1Style}>Support</h1>
      <p style={pStyle}>
        SitecoreAI Validator is a small, actively-developed tool. If something isn&apos;t working the
        way you&apos;d expect, here&apos;s how to get help.
      </p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Report a bug or ask a question</h2>
        <p style={pStyle}>
          The best way to reach us is through the project&apos;s GitHub Issues — that&apos;s where bugs,
          questions, and feature requests are tracked and answered.
        </p>
        <a href={`${REPO_URL}/issues/new`} target="_blank" rel="noreferrer" style={buttonStyle}>
          Open an issue on GitHub
        </a>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Understand what the checks do</h2>
        <p style={pStyle}>
          Before reporting an unexpected result, check <Link href="/docs" style={linkStyle}>/docs</Link> —
          it documents exactly what each of the five checks looks for and why, rendered directly from the
          same code the checks run, so it can&apos;t be out of date.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Common issues</h2>
        <ul style={ulStyle}>
          <li>
            <strong>A check says &quot;skipped&quot;</strong> — that check is missing required config
            (e.g. a Vercel token, or a Sitecore Edge context id). Nothing is wrong; fill in that section
            of the form if you want that check to run.
          </li>
          <li>
            <strong>&quot;Local path&quot; is grayed out</strong> — that option only works when you&apos;re
            running this app yourself on the same machine as the project you&apos;re checking. Use GitHub
            repo mode instead on a hosted deployment.
          </li>
          <li>
            <strong>A check fails on your own credentials/URL</strong> — double check the value is correct
            and reachable; see <Link href="/docs" style={linkStyle}>/docs</Link> for what each check
            actually calls out to.
          </li>
        </ul>
      </section>
    </main>
  );
}

const mainStyle: CSSProperties = {
  maxWidth: 820,
  margin: '0 auto',
  padding: '40px 20px 64px',
};

const h1Style: CSSProperties = {
  fontSize: 22,
  margin: '0 0 12px',
  color: colors.textPrimary,
};

const sectionStyle: CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: '18px 20px',
  marginBottom: 20,
  background: colors.surface,
};

const h2Style: CSSProperties = {
  fontSize: 16,
  marginTop: 0,
  marginBottom: 8,
  color: colors.textPrimary,
  fontWeight: 700,
};

const pStyle: CSSProperties = {
  color: colors.textSecondary,
  lineHeight: 1.6,
  fontSize: 14,
};

const ulStyle: CSSProperties = {
  color: colors.textSecondary,
  lineHeight: 1.7,
  fontSize: 14,
  paddingLeft: 20,
};

const linkStyle: CSSProperties = {
  color: colors.cyan,
};

const buttonStyle: CSSProperties = {
  display: 'inline-block',
  marginTop: 4,
  padding: '9px 18px',
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 8,
  color: colors.textPrimary,
  fontSize: 13,
  fontWeight: 600,
  textDecoration: 'none',
};
