import Link from 'next/link';
import type { CSSProperties } from 'react';
import { JSS_AUDIT_RULES, LOG_PATTERNS } from '@/src/lib/checks';
import { LogoLockup } from '@/src/components/Logo';
import { colors, statusColors } from '@/src/lib/theme';

function SeverityBadge({ severity }: { severity: 'fail' | 'warn' }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        color: colors.background,
        background: statusColors[severity],
        textTransform: 'uppercase',
      }}
    >
      {severity}
    </span>
  );
}

export default function DocsPage() {
  return (
    <main style={mainStyle}>
      <Link href="/validate" style={{ fontSize: 13, color: colors.cyan, textDecoration: 'none' }}>
        ← Back to validator
      </Link>
      <div style={{ margin: '16px 0 20px' }}>
        <LogoLockup height={26} />
      </div>
      <h1 style={{ fontSize: 22, margin: '0 0 4px', color: colors.textPrimary }}>How the checks work</h1>
      <p style={{ color: colors.textSecondary, marginBottom: 24, lineHeight: 1.5 }}>
        Five checks, all aimed at one failure mode: a Sitecore Experience Edge fetch that fails at build
        time and gets silently swallowed, so a page that was supposed to be statically generated (SSG)
        quietly falls back to server-side rendering (SSR) instead. Nothing breaks visibly — performance and
        SEO just degrade until someone notices.
      </p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Experience Edge reachability</h2>
        <p style={pStyle}>
          Sends the exact GraphQL query the Sitecore Content SDK&apos;s <code>SitePathService</code> sends at
          build time to resolve SSG paths (<code>getPagePaths</code> / <code>getAppRouterStaticParams</code>),
          straight against your Experience Edge context. If that call fails or times out during a real build,
          this is the failure that eventually shows up as empty static paths.
        </p>
        <ul style={ulStyle}>
          <li><strong>fail</strong> — Edge is unreachable or returned a GraphQL error</li>
          <li><strong>warn</strong> — Edge responded, but slowly enough to risk timing out a build&apos;s fetch</li>
          <li><strong>pass</strong> — Edge responded quickly and cleanly</li>
          <li><strong>skipped</strong> — no Edge context id / site name / language configured</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>JSS config audit</h2>
        <p style={pStyle}>
          Static analysis of your project&apos;s catch-all route file (<code>[[...path]]</code>, App Router or
          Pages Router) and <code>sitecore.config.ts</code>, looking for source-level misconfigurations that
          cause the same silent-SSR-fallback failure without needing a live build at all. Reads from either a
          local filesystem path or a GitHub repo via the GitHub API.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Rule</th>
                <th style={thStyle}>Severity</th>
                <th style={thStyle}>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {JSS_AUDIT_RULES.map((rule) => (
                <tr key={rule.id}>
                  <td style={tdStyle}>{rule.label}</td>
                  <td style={tdStyle}>
                    <SeverityBadge severity={rule.severity} />
                  </td>
                  <td style={tdStyle}>{rule.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Cache header check</h2>
        <p style={pStyle}>
          Fetches a handful of routes you specify on your live deployment and reads the response headers
          Vercel and Next.js emit: <code>x-nextjs-prerender: 1</code> marks a statically prerendered page;{' '}
          <code>x-vercel-cache: HIT/STALE/PRERENDER</code> means it was served from the edge cache. A route
          that comes back <code>x-vercel-cache: MISS</code> with a <code>no-store</code>/<code>private</code>{' '}
          cache-control header is being rendered fresh on every request — the live signature of SSR instead of
          the SSG you expected. This is a heuristic based on response headers, not a platform guarantee.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Route coverage (prerendered path diff)</h2>
        <p style={pStyle}>
          Fetches your site&apos;s full expected route list straight from Experience Edge (the same source
          <code> getStaticPaths</code>/<code>generateStaticParams</code> reads from), then samples each one
          against your live deployment using the same header heuristic as the cache header check. Routes that
          come back looking like SSR instead of prerendered are exactly the pages that should have gone
          through static generation but silently didn&apos;t.
        </p>
        <p style={pStyle}>
          Note: Vercel&apos;s deployment-files API only exposes the source files uploaded for a deployment, not
          the build output (<code>.next/server/...</code>), so this check can&apos;t directly diff against
          Vercel&apos;s internal prerender manifest — live header inspection is the closest achievable signal.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Build log scan</h2>
        <p style={pStyle}>
          Pulls your latest production deployment&apos;s build log from the Vercel REST API and scans it for a
          small, deliberately narrow set of known-bad patterns — not a general-purpose build-log linter, just
          signatures of this one failure mode.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Pattern</th>
                <th style={thStyle}>Severity</th>
                <th style={thStyle}>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {LOG_PATTERNS.map((entry) => (
                <tr key={entry.pattern.source}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>/{entry.pattern.source}/</td>
                  <td style={tdStyle}>
                    <SeverityBadge severity={entry.severity} />
                  </td>
                  <td style={tdStyle}>{entry.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={pStyle}>
          It also parses Next.js&apos;s own build-output route table directly — the lines like{' '}
          <code>├ ƒ /api/checks</code> and <code>└ ○ /validate</code> every <code>next build</code> prints.{' '}
          <code>○</code> means a route was actually prerendered (static); <code>ƒ</code> means it was rendered
          dynamically on demand. If your catch-all route (<code>[[...path]]</code>) shows <code>ƒ</code> instead
          of <code>○</code>, that&apos;s Next.js itself confirming SSG didn&apos;t happen — the most direct
          signal this check can get, stronger than any regex pattern.
        </p>
      </section>

      <p style={{ ...pStyle, color: colors.textMuted, fontSize: 13 }}>
        These lists live in{' '}
        <code>src/lib/checks/jssConfigAudit.ts</code> and <code>src/lib/checks/buildLogScan.ts</code> as named,
        exported constants — this page renders them directly rather than a copy, so it can&apos;t drift out of
        sync with what the checks actually do.
      </p>
    </main>
  );
}

const mainStyle: CSSProperties = {
  maxWidth: 820,
  margin: '0 auto',
  padding: '40px 20px 64px',
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
  lineHeight: 1.5,
  fontSize: 14,
};

const ulStyle: CSSProperties = {
  color: colors.textSecondary,
  lineHeight: 1.6,
  fontSize: 14,
  paddingLeft: 20,
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
  marginTop: 8,
};

const thStyle: CSSProperties = {
  textAlign: 'left',
  borderBottom: `1px solid ${colors.border}`,
  padding: '6px 8px',
  color: colors.textMuted,
  fontWeight: 600,
};

const tdStyle: CSSProperties = {
  borderBottom: `1px solid ${colors.border}`,
  padding: '8px',
  verticalAlign: 'top',
  color: colors.textSecondary,
};
