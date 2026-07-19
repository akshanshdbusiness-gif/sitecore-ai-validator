'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import Link from 'next/link';
import type { CheckSummary, CheckStatus } from '@/src/lib/checks';
import { LogoLockup } from '@/src/components/Logo';
import { colors, gradients, statusColors } from '@/src/lib/theme';

type ProjectSourceType = 'local' | 'github';

interface FormState {
  projectSourceType: ProjectSourceType;
  localProjectPath: string;
  githubOwner: string;
  githubRepo: string;
  githubRef: string;
  githubToken: string;
  deploymentUrl: string;
  keyRoutes: string;
  routeCoverageLimit: string;
  edgeContextId: string;
  edgeSiteName: string;
  edgeLanguage: string;
  vercelToken: string;
  vercelProjectId: string;
  vercelTeamId: string;
  vercelDeploymentId: string;
}

const EMPTY_FORM: FormState = {
  projectSourceType: 'github',
  localProjectPath: '',
  githubOwner: '',
  githubRepo: '',
  githubRef: '',
  githubToken: '',
  deploymentUrl: '',
  keyRoutes: '',
  routeCoverageLimit: '25',
  edgeContextId: '',
  edgeSiteName: '',
  edgeLanguage: 'en',
  vercelToken: '',
  vercelProjectId: '',
  vercelTeamId: '',
  vercelDeploymentId: '',
};

function StatusBadge({ status }: { status: CheckStatus }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 12px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        color: status === 'skipped' ? colors.textSecondary : colors.background,
        background: statusColors[status],
        textTransform: 'uppercase',
      }}
    >
      {status}
    </span>
  );
}

export default function ValidatePage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  // null until the effect below runs client-side — avoids assuming either
  // way before we can actually check window.location.
  const [isLocalHost, setIsLocalHost] = useState<boolean | null>(null);

  useEffect(() => {
    // "Local path" only works when the server handling /api/checks is the
    // same machine as the browser — true for `npm run dev`/`npm start`
    // locally, never true once this is deployed (e.g. to Vercel). Checking
    // the browser's own hostname is a reasonable proxy for that, since this
    // app's client and server are normally co-located.
    const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    setIsLocalHost(local);
    setForm((prev) => ({ ...prev, projectSourceType: local ? 'local' : 'github' }));
  }, []);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const projectSource =
      form.projectSourceType === 'local'
        ? form.localProjectPath
          ? { type: 'local' as const, path: form.localProjectPath }
          : undefined
        : form.githubOwner && form.githubRepo
          ? {
              type: 'github' as const,
              owner: form.githubOwner,
              repo: form.githubRepo,
              ref: form.githubRef || undefined,
              token: form.githubToken || undefined,
            }
          : undefined;

    const config = {
      projectSource,
      deploymentUrl: form.deploymentUrl || undefined,
      keyRoutes: form.keyRoutes
        ? form.keyRoutes
            .split(',')
            .map((route) => route.trim())
            .filter(Boolean)
        : undefined,
      routeCoverageLimit: form.routeCoverageLimit ? Number(form.routeCoverageLimit) : undefined,
      sitecoreEdge:
        form.edgeContextId && form.edgeSiteName && form.edgeLanguage
          ? { contextId: form.edgeContextId, siteName: form.edgeSiteName, language: form.edgeLanguage }
          : undefined,
      vercel:
        form.vercelToken && form.vercelProjectId
          ? {
              token: form.vercelToken,
              projectId: form.vercelProjectId,
              teamId: form.vercelTeamId || undefined,
              deploymentId: form.vercelDeploymentId || undefined,
            }
          : undefined,
    };

    try {
      const res = await fetch('/api/checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      setResult((await res.json()) as CheckSummary);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={mainStyle}>
      <header style={{ marginBottom: 28 }}>
        <LogoLockup />
        <p style={{ color: colors.textSecondary, marginTop: 16, marginBottom: 4, maxWidth: 560 }}>
          Enter your project&apos;s details below and run the checks. Nothing is stored — every field is
          sent straight through to the corresponding API for this one run only. Leave a section blank to
          skip its check.
        </p>
        <Link href="/docs" style={{ fontSize: 13, color: colors.cyan, textDecoration: 'none' }}>
          What do these checks look for? →
        </Link>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>JSS config audit</legend>
          <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
            <label style={radioLabelStyle}>
              <input
                type="radio"
                name="projectSourceType"
                checked={form.projectSourceType === 'github'}
                onChange={() => update('projectSourceType', 'github')}
              />
              GitHub repo
            </label>
            <label style={isLocalHost === false ? radioLabelDisabledStyle : radioLabelStyle}>
              <input
                type="radio"
                name="projectSourceType"
                checked={form.projectSourceType === 'local'}
                disabled={isLocalHost === false}
                onChange={() => update('projectSourceType', 'local')}
              />
              Local path{isLocalHost === false ? ' (unavailable on this deployment)' : ''}
            </label>
          </div>

          {form.projectSourceType === 'github' ? (
            <>
              <p style={hintTextStyle}>
                Works from anywhere this app is deployed — reads your project&apos;s source straight from
                GitHub&apos;s API instead of the local disk. Want to see a flagged result before trying your
                own project? Owner <code>akshanshdbusiness-gif</code>, repo{' '}
                <code>sitecore-ai-validator</code> ({' '}
                <a
                  href="https://github.com/akshanshdbusiness-gif/sitecore-ai-validator"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: colors.cyan }}
                >
                  view on GitHub
                </a>
                ) will return <strong>fail</strong> — it&apos;s this tool&apos;s own repo, which
                intentionally includes a broken test fixture under <code>scripts/fixtures/</code> used to
                verify the audit logic itself, not a real Sitecore project.
              </p>
              <Field
                label="Repo owner"
                value={form.githubOwner}
                onChange={(v) => update('githubOwner', v)}
                placeholder="your-org-or-username"
              />
              <Field
                label="Repo name"
                value={form.githubRepo}
                onChange={(v) => update('githubRepo', v)}
                placeholder="your-nextjs-repo"
              />
              <Field
                label="Branch/tag/SHA (optional — defaults to the repo's default branch)"
                value={form.githubRef}
                onChange={(v) => update('githubRef', v)}
                placeholder="main"
              />
              <Field
                label="GitHub token (optional — required for private repos)"
                value={form.githubToken}
                onChange={(v) => update('githubToken', v)}
                placeholder="ghp_..."
                type="password"
              />
            </>
          ) : (
            <Field
              label="Local project path"
              value={form.localProjectPath}
              onChange={(v) => update('localProjectPath', v)}
              placeholder="C:\path\to\your\nextjs-project"
              hint="Absolute path to a Next.js project's root, checked out on this machine (the one running npm run dev right now)."
            />
          )}
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Cache header check &amp; route coverage</legend>
          <Field
            label="Deployment URL"
            value={form.deploymentUrl}
            onChange={(v) => update('deploymentUrl', v)}
            placeholder="https://your-site.vercel.app"
          />
          <Field
            label="Key routes (comma-separated)"
            value={form.keyRoutes}
            onChange={(v) => update('keyRoutes', v)}
            placeholder="/, /about, /products"
          />
          <Field
            label="Route coverage sample size"
            value={form.routeCoverageLimit}
            onChange={(v) => update('routeCoverageLimit', v)}
            placeholder="25"
            type="number"
          />
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Experience Edge reachability &amp; route coverage</legend>
          <Field
            label="Edge context ID"
            value={form.edgeContextId}
            onChange={(v) => update('edgeContextId', v)}
            placeholder="matches SITECORE_EDGE_CONTEXT_ID"
          />
          <Field
            label="Site name"
            value={form.edgeSiteName}
            onChange={(v) => update('edgeSiteName', v)}
            placeholder="matches NEXT_PUBLIC_DEFAULT_SITE_NAME"
          />
          <Field
            label="Language"
            value={form.edgeLanguage}
            onChange={(v) => update('edgeLanguage', v)}
            placeholder="en"
          />
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Build log scan</legend>
          <Field
            label="Vercel token"
            value={form.vercelToken}
            onChange={(v) => update('vercelToken', v)}
            placeholder="Vercel REST API token"
            type="password"
          />
          <Field
            label="Vercel project ID"
            value={form.vercelProjectId}
            onChange={(v) => update('vercelProjectId', v)}
            placeholder="prj_..."
          />
          <Field
            label="Vercel team ID (optional)"
            value={form.vercelTeamId}
            onChange={(v) => update('vercelTeamId', v)}
            placeholder="team_..."
          />
          <Field
            label="Deployment ID (optional, defaults to latest production)"
            value={form.vercelDeploymentId}
            onChange={(v) => update('vercelDeploymentId', v)}
            placeholder="dpl_..."
          />
        </fieldset>

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Running checks…' : 'Run checks'}
        </button>
      </form>

      {error && <p style={{ color: statusColors.fail, marginTop: 16 }}>{error}</p>}

      {result && (
        <section style={{ marginTop: 32 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 700 }}>
            Overall: <StatusBadge status={result.overallStatus} />
          </h2>
          <p style={{ color: colors.textMuted, fontSize: 13 }}>
            Generated at {new Date(result.generatedAt).toLocaleString()}
          </p>

          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            {result.checks.map((check) => (
              <div key={check.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{check.name}</strong>
                  <StatusBadge status={check.status} />
                </div>
                <p style={{ margin: '8px 0 0', color: colors.textSecondary }}>{check.summary}</p>
                {check.details && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', color: colors.textMuted, fontSize: 13 }}>
                      Details
                    </summary>
                    <pre style={preStyle}>{JSON.stringify(check.details, null, 2)}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <label style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
      {hint && <span style={hintTextStyle}>{hint}</span>}
    </label>
  );
}

const mainStyle: CSSProperties = {
  maxWidth: 820,
  margin: '0 auto',
  padding: '40px 20px 64px',
};

const fieldsetStyle: CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: '18px 20px',
  background: colors.surface,
};

const legendStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  padding: '0 6px',
  color: colors.textPrimary,
};

const radioLabelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  color: colors.textSecondary,
};

const radioLabelDisabledStyle: CSSProperties = {
  ...radioLabelStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
};

const hintTextStyle: CSSProperties = {
  fontSize: 12,
  color: colors.textMuted,
  marginTop: 0,
};

const inputStyle: CSSProperties = {
  padding: '9px 12px',
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 8,
  fontSize: 14,
  width: '100%',
  boxSizing: 'border-box',
  background: colors.surfaceRaised,
  color: colors.textPrimary,
  fontFamily: 'inherit',
};

const buttonStyle: CSSProperties = {
  justifySelf: 'start',
  padding: '11px 24px',
  background: gradients.button,
  color: colors.background,
  border: 'none',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const cardStyle: CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: '14px 18px',
  background: colors.surface,
};

const preStyle: CSSProperties = {
  background: colors.surfaceRaised,
  padding: 12,
  borderRadius: 8,
  fontSize: 12,
  overflowX: 'auto',
  color: colors.textSecondary,
  border: `1px solid ${colors.border}`,
};
