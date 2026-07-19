# SitecoreAI Validator

Validate. Assure. Publish with confidence.

SitecoreAI Validator checks whether a Next.js + Sitecore deployment on Vercel actually built the
way it was supposed to. It exists because of a specific, easy-to-miss failure mode: a Sitecore
Experience Edge fetch fails at build time, `getStaticPaths`/`generateStaticParams` silently returns
an empty list, and the build quietly falls back to server-side rendering (SSR) instead of static
generation (SSG). Nothing throws, nothing breaks visibly — performance and SEO just degrade until
someone notices.

This app automates the checks you'd otherwise do by hand: reading build logs, checking cache
headers, diffing prerendered routes against the expected sitemap, and auditing the source for the
misconfigurations that cause this.

## What it checks

Five checks, run independently — each one works with whatever config you give it and reports
`skipped` if that config isn't provided:

| Check | What it does |
|---|---|
| **Experience Edge reachability** | Sends the exact GraphQL query the Sitecore Content SDK's `SitePathService` sends at build time, straight against your Experience Edge context |
| **JSS config audit** | Static analysis of your catch-all route file (`[[...path]]`) and `sitecore.config.ts` for known anti-patterns (e.g. `force-dynamic` alongside `generateStaticParams`, swallowed static-path fetch errors) — reads from a local path or a GitHub repo via the GitHub API |
| **Cache header check** | Fetches routes you specify on your live deployment and classifies them as prerendered vs. SSR via `x-vercel-cache`/`x-nextjs-prerender` headers |
| **Route coverage** | Fetches the full expected route list from Experience Edge, then samples each against your deployment for the same prerender signal |
| **Build log scan** | Pulls your latest Vercel build log and scans for known-bad text patterns, plus parses Next.js's own build-output route table (`○` static / `ƒ` dynamic) directly |

Full detail on every rule and pattern lives at `/docs` in the running app (rendered directly from
the same exported constants the checks use, so it can't drift out of sync).

## Routes

- **`/`** — landing page
- **`/validate`** — the form: enter your project/deployment details, run the checks, see results
- **`/docs`** — reference for what each check looks for
- **`/api/checks`** — `POST` endpoint the form calls; usable directly (curl/Postman) too

This is currently a standalone Next.js app, not yet wired into the Sitecore Marketplace SDK's
extension points — see [Status](#status) below.

## Getting started

```sh
npm install
npm run dev
```

Then open `/validate`. Every check is independent and optional — fill in only the section(s) you
want to run:

- **JSS config audit** needs either a local filesystem path (only works if you're running this app
  on the same machine as the checkout) or a GitHub repo (owner/name, optional branch/token) —
  GitHub mode works from anywhere this app is deployed, since it reads source via the GitHub API
  instead of the local disk.
- **Cache header check** / **route coverage** need your deployment URL (+ key routes, for the
  cache check).
- **Experience Edge reachability** / **route coverage** need your Sitecore Edge context id, site
  name, and language.
- **Build log scan** needs a Vercel API token and project ID.

See `.env.example` for the full list of fields the form/API accept.

## Testing

```sh
npm test              # unit tests (Vitest) — mocked fetch, no network or credentials needed
npm run test:coverage # same, with coverage
npm run test:checks   # live regression check: runs the JSS config audit against two fixed
                       # fixtures (scripts/fixtures/) and this project's own public GitHub repo
```

`npm run lint` and `npx tsc --noEmit` should both stay clean.

## Security

`/api/checks` accepts a deployment URL, a Sitecore Edge URL, and routes to probe from the request
body, then fetches them server-side — without validation, that's a server-side request forgery
(SSRF) primitive. `src/lib/checks/urlSafety.ts` guards every such fetch: HTTPS only, resolves DNS
and rejects private/loopback/link-local/cloud-metadata IP ranges, and applies a stricter
`*.sitecorecloud.io` allowlist for the Experience Edge URL specifically.

## Status

Built in phases, roughly following the original build plan:

- ✅ **Phase 1** — standalone check engine, tested (Vitest unit tests + live regression against
  real fixtures), reviewed for security issues (SSRF, since fixed)
- ✅ Bonus — a plain web UI (`/validate`, `/docs`, `/`) so the check engine is usable.

- ⬜ **Phase 2+** — Cloud Portal registration, private distribution, auth-gating `/api/checks` on
  the Marketplace SDK's app context before real customer credentials flow through it, public
  Marketplace submission

## License

This project is licensed under the terms specified in the [LICENSE](LICENSE) file.
