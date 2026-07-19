import type { CSSProperties } from 'react';
import { LogoLockup } from '@/src/components/Logo';
import { colors } from '@/src/lib/theme';

export default function PrivacyPage() {
  return (
    <main style={mainStyle}>
      <div style={{ marginBottom: 20 }}>
        <LogoLockup height={26} />
      </div>
      <h1 style={h1Style}>Privacy policy</h1>
      <p style={pStyle}>
        Last updated: this describes what the app actually does today, not a generic template — it
        will be revised if the app&apos;s behavior changes (e.g. if accounts or persistent storage are
        added later).
      </p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>What you enter and what happens to it</h2>
        <p style={pStyle}>
          The <code>/validate</code> form asks for details about your own project and infrastructure:
          a deployment URL, route paths, a Sitecore Experience Edge context id/site/language, a GitHub
          repo (and optionally a token), and a Vercel API token. When you submit, that data is sent once
          to this app&apos;s own <code>/api/checks</code> endpoint, which uses it to call the
          corresponding third-party API (Vercel, GitHub, or Sitecore Experience Edge) on your behalf, and
          returns the result to your browser.
        </p>
        <p style={pStyle}>
          <strong>Nothing you enter is written to a database, logged persistently, or shared with anyone
          else.</strong> There is currently no user account system and no server-side storage — each
          request is processed and the response returned; nothing about it is retained afterward.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Third-party services</h2>
        <p style={pStyle}>
          Because the checks work by calling real third-party APIs with credentials you provide, those
          requests are also subject to the relevant provider&apos;s own privacy policy:
        </p>
        <ul style={ulStyle}>
          <li>Vercel (build logs, deployment info) — vercel.com/legal/privacy-policy</li>
          <li>GitHub (repository contents) — docs.github.com/en/site-policy/privacy-policies</li>
          <li>Sitecore (Experience Edge) — sitecore.com/legal</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Cookies and tracking</h2>
        <p style={pStyle}>
          This app does not set any of its own cookies or run any analytics/tracking scripts. Standard
          hosting-infrastructure logs (e.g. Vercel&apos;s own request logs) may exist at the platform
          level outside this app&apos;s control.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Your credentials</h2>
        <p style={pStyle}>
          Tokens you paste in (Vercel, GitHub) are sent over HTTPS and used only to make the specific API
          calls the check you configured requires, for that one request. We&apos;d still recommend using
          scoped, limited-lifetime tokens rather than broad admin credentials, as general good practice
          regardless of what any tool claims to do with them.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Questions</h2>
        <p style={pStyle}>
          Open an issue on the project&apos;s{' '}
          <a
            href="https://github.com/akshanshdbusiness-gif/sitecore-ai-validator/issues"
            target="_blank"
            rel="noreferrer"
            style={{ color: colors.cyan }}
          >
            GitHub repository
          </a>
          .
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
