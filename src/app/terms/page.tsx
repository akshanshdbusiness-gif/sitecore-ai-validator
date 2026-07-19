import type { CSSProperties } from 'react';
import { LogoLockup } from '@/src/components/Logo';
import { colors } from '@/src/lib/theme';

export default function TermsPage() {
  return (
    <main style={mainStyle}>
      <div style={{ marginBottom: 20 }}>
        <LogoLockup markSize={32} textSize={18} />
      </div>
      <h1 style={h1Style}>Terms and conditions</h1>
      <p style={pStyle}>
        Plain-language terms for using SitecoreAI Validator. This isn&apos;t a substitute for
        professional legal advice — if this app is ever offered commercially, these terms should be
        reviewed by counsel first.
      </p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>What this is</h2>
        <p style={pStyle}>
          SitecoreAI Validator checks whether a Next.js + Sitecore deployment on Vercel actually built
          the way it was supposed to (static generation vs. an unnoticed server-side-rendering
          fallback). It reports what it finds — it does not modify your project, your deployment, or
          any third-party account in any way.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Provided as-is</h2>
        <p style={pStyle}>
          The underlying code is licensed under the Apache License, Version 2.0 — see the{' '}
          <a
            href="https://github.com/akshanshdbusiness-gif/sitecore-ai-validator/blob/dev/LICENSE"
            target="_blank"
            rel="noreferrer"
            style={{ color: colors.cyan }}
          >
            LICENSE
          </a>{' '}
          file. Consistent with that license, this app is provided &quot;as is&quot;, without warranty of
          any kind. The checks are heuristics built against real APIs and real build output — they&apos;re
          useful signals, not a guarantee of correctness, and results should be verified against your own
          judgment before you act on them.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Your responsibilities</h2>
        <ul style={ulStyle}>
          <li>
            You&apos;re responsible for the credentials (Vercel tokens, GitHub tokens) you choose to enter
            — use scoped, limited-permission tokens where possible.
          </li>
          <li>
            You&apos;re responsible for having the right to inspect whatever GitHub repo, Vercel project,
            or Sitecore Experience Edge context you point this app at.
          </li>
          <li>Don&apos;t use this app to probe infrastructure you don&apos;t have permission to access.</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Changes</h2>
        <p style={pStyle}>
          This is an actively-developed tool and both its functionality and these terms may change. See{' '}
          <a
            href="https://github.com/akshanshdbusiness-gif/sitecore-ai-validator"
            target="_blank"
            rel="noreferrer"
            style={{ color: colors.cyan }}
          >
            the GitHub repository
          </a>{' '}
          for the current state of the project.
        </p>
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
