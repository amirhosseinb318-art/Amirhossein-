# AI Crisis Radar

A private, invitation-only crisis-intelligence dashboard. It collects approved public
feeds, clusters reports into events, keeps **verified facts separate from attributed
claims, analysis and unknowns**, and only delivers high-impact alerts after a human
administrator approves them.

Persian-first (RTL) with a full English (LTR) experience, dark-first design, and a
responsive layout built for sustained monitoring work rather than a marketing page.

---

## Status — read this first

This repository is a working, tested application. It is also explicit about what is *not*
configured in a given deployment:

| Capability | State in this repository |
| --- | --- |
| UI, routing, RTL/LTR, design system | Implemented and built |
| Authentication (password, invitations, sessions, RBAC) | Implemented, server-enforced |
| Event verification workflow + audit trail | Implemented, unit-tested |
| Ingestion pipeline (collect → normalise → dedupe → cluster) | Implemented; sources seeded **disabled** |
| AI analysis adapters + citation enforcement | Implemented; falls back to a labelled extractive mode without a key |
| Web Push delivery | Implemented; disabled until VAPID keys are set |
| Supabase (Postgres + RLS) store | Implemented adapter + migration, **not exercised** here (no credentials) |
| Scheduled collection | Endpoint exists; **you must configure a scheduler** |
| Email/SMS delivery | Not implemented |
| Supabase Auth | **Not used.** Auth is in-app (scrypt + signed HttpOnly cookie) |
| Realtime subscriptions | Not used; pages re-render on request/refresh |

**Demo mode** (the default when Supabase is not configured) uses a local JSON file store
and four synthetic events. Every synthetic record is labelled `Demo`, uses the reserved
`.invalid` TLD, and is never mixed into a live feed. No real news is shown without
collection having actually run.

---

## Quick start

```bash
npm install
npm run setup:env     # generates .env.local with random secrets + demo password
npm run dev           # http://localhost:3000
```

The demo password is printed by `setup:env`; demo users are
`admin@demo.local`, `analyst@demo.local` and `viewer@demo.local`.

```bash
npm test              # 50 unit tests
npm run typecheck
npm run lint
npm run build && npm start
```

Reset synthetic demo data (destructive, explicit flag required):

```bash
npm run db:reset-demo
```

---

## Architecture

```
Browser (RSC + small client islands, service worker for push)
   │  signed HttpOnly session cookie
   ▼
Next.js App Router (server components)
   ├── /api/* route handlers — validation, CSRF origin check, rate limits, RBAC
   ├── lib/auth        scrypt passwords · JWT session · invitations · throttling
   ├── lib/verification explicit state machine (human-only transitions)
   ├── lib/alerts      approval policy (high impact ⇒ human review)
   ├── lib/ingestion   collector → rss parser → de-dupe → cluster → event creation
   ├── lib/ai          provider adapters · prompt hardening · schema + citation checks
   └── lib/store       Repository interface
          ├── LocalRepository    .data/store.json (demo / single instance)
          └── SupabaseRepository PostgreSQL `records` table + RLS (production)
                                     ▲
                     scheduler ──────┘  GET /api/cron/ingest (Bearer CRON_SECRET)
```

Key modules:

- `src/lib/verification.ts` — allowed transitions and evidence requirements.
- `src/lib/alerts/policy.ts` — when an alert may be delivered at all.
- `src/lib/ingestion/*` — collection, parsing, per-source de-duplication, clustering.
- `src/lib/ai/*` — adapters, nonce-delimited untrusted blocks, JSON schema validation,
  citation verification, injection flagging.
- `supabase/migrations/0001_init.sql` — schema, RLS policies, immutable audit trigger.

---

## Environment variables

All variables are server-side except `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, which is public by
design (it is the browser push public key). Never expose `SUPABASE_SERVICE_ROLE_KEY`,
`AI_API_KEY`, `SESSION_SECRET` or `CRON_SECRET` to the client.

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_URL` | prod | Origin for invitation links and CSRF origin checks |
| `SESSION_SECRET` | prod | ≥32-byte secret for HS256 session cookies |
| `DEMO_MODE` | — | `true` = local store + demo accounts; default is true only when Supabase is absent |
| `DEMO_SEED_PASSWORD` | demo | Password for seeded demo accounts |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | first boot | Bootstrap the first administrator when no users exist |
| `SUPABASE_URL` | prod | Supabase project URL |
| `SUPABASE_ANON_KEY` | prod | Reserved for client-side/Realtime use; not used by the server adapter |
| `SUPABASE_SERVICE_ROLE_KEY` | prod | **Server-only** write access |
| `AI_PROVIDER` | — | `auto` (default), `openai`, `anthropic`, `none` |
| `AI_API_KEY` | for model | Provider key |
| `AI_BASE_URL` | — | OpenAI-compatible base URL (default `https://api.openai.com/v1`) |
| `AI_MODEL` | — | Model id |
| `AI_TIMEOUT_MS` | — | Request timeout (default 25s) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | for push | Web Push keys |
| `VAPID_SUBJECT` | for push | `mailto:` contact |
| `CRON_SECRET` | for ingestion | Bearer token for `/api/cron/ingest` |
| `INGEST_USER_AGENT_CONTACT` | recommended | Contact in collector User-Agent |
| `INGEST_MIN_INTERVAL_MS` | — | Per-source poll interval (default 5 min) |
| `RESPECT_ROBOTS` | — | Default `true`; do not disable without permission |
| `ALERT_AUTO_APPROVE` + `ALERT_POLICY_TESTED` | — | Both required to auto-approve severity-4 alerts; severity 5 always reviewed |
| `ALLOW_INSECURE_COOKIES` | — | Local HTTP testing only |

---

## Going live (step by step)

### 1. Create the database

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor (or `supabase db push`).
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
4. Set `DEMO_MODE=false`, `SESSION_SECRET`, `APP_URL`, and `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
5. Start the app once. The bootstrap administrator is created only when no users exist.
   Remove `ADMIN_PASSWORD` from the environment afterwards and sign in through `/sign-in`.

> The server writes with the service role; RLS still constrains any direct client access.
> The audit trigger rejects updates and deletes on `auditLogs` even for that role.

### 2. Enable permitted sources

Sources ship **disabled**. Open **Admin → Sources**, review each source's terms and feed
URL, then enable it. The catalogue contains documented public feeds (USGS, GDACS, NWS,
ReliefWeb, BBC, Guardian, Al Jazeera). Confirm each feed's current terms yourself; the
seeded notes are a starting point, not legal advice.

The collector:

- identifies itself with a contact User-Agent;
- honours `robots.txt` for the feed path (`RESPECT_ROBOTS=true`);
- enforces a per-source minimum interval and follows HTTP 429 with backoff;
- uses conditional requests (`ETag` / `If-Modified-Since`) where offered;
- caps response size at 2 MB and times out at 12 s;
- records every run with counts and errors, and surfaces the last error per source.

### 3. Run collection on a schedule

Monitoring is only live while the scheduler runs. The UI shows the last collection time and
warns when it is stale.

```bash
# Verify manually (after setting CRON_SECRET)
curl -sS -X POST https://your-host/api/cron/ingest \
  -H "Authorization: Bearer $CRON_SECRET"
```

Examples:

**Vercel** (`vercel.json`):
```json
{ "crons": [{ "path": "/api/cron/ingest", "schedule": "*/10 * * * *" }] }
```

**systemd timer**:
```ini
[Timer]
OnCalendar=*:0/10
Persistent=true
```
with a service that runs the same `curl` command and keeps `CRON_SECRET` in an
`EnvironmentFile` with `0600` permissions.

**GitHub Actions**: schedule a workflow that curls the endpoint with a repository secret.

### 4. Enable AI analysis (optional)

Set `AI_PROVIDER=openai` (or `anthropic`) and `AI_API_KEY`. Any OpenAI-compatible endpoint
works via `AI_BASE_URL` (OpenRouter, Azure-compatible gateways, vLLM, Ollama).

Without a key the workspace stays functional in a **labelled extractive mode**: it quotes
stored report titles, computes coverage from stored records, invents nothing, and says so
in the UI. Analysis failures are stored and shown; they never fall back silently to
fabricated prose.

### 5. Enable Web Push (optional)

```bash
npx web-push generate-vapid-keys
```

Put the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, the private key in
`VAPID_PRIVATE_KEY`, and set `VAPID_SUBJECT`. Without keys the notification centre still
works in-app and the push controls explain that push is unavailable. Denied browser
permission is handled explicitly; expired subscriptions (HTTP 404/410) are pruned.

---

## Verification and alert safety (the rules the code enforces)

Status is one axis, analytical confidence another, severity a third. They are never merged.

```
unverified ──► developing ──► corroborated ──► verified
     │            │  ▲            │  ▲             │
     └────────────┴──┴────────────┘  └─────────────┘
                        retracted (terminal)
```

- Automated ingestion can create events only as `unverified`. A model can *suggest* a
  status but cannot apply one.
- `corroborated` requires **two independent sources**; `verified` additionally requires
  **at least one primary source** and, for severity 4–5, an **administrator**.
- Every transition requires a written reason (≥10 chars) and citations to reports already
  attached to the event. Unknown evidence IDs are rejected.
- High-impact alerts (severity ≥4) wait in `pending_review`; nothing is delivered until an
  administrator approves. Severity 5 always requires review. Retractions always propagate.
- Administrators can record a correction note on any event; it is shown permanently on the
  event page and written to the audit trail. Retractions go through the status workflow,
  propagate to readers, and are terminal: a new event must be created if the situation
  changes, so the correction stays visible.
- The UI states that absence of evidence is not evidence of absence, and never presents
  casualty figures, evacuations or military claims as established fact.

---
## AI guardrails

- All article text is placed inside untrusted_source blocks carrying a per-request nonce.
- The nonce and any forged closing tags are stripped from source content; instruction-like
  phrases are flagged and shown to the reviewer.
- The system prompt forbids outside knowledge, invented citations and tool use.
- Output must satisfy a strict JSON schema; invalid output is rejected and reported.
- Every citation is checked against reports actually attached to the event. Unknown IDs are
  removed and uncited factual findings are dropped (citationsDropped is shown).
- Coverage counts are computed from stored records, not taken from the model.
- verified and retracted can never be suggested.
- Model output is stored as a reviewable analysis run; it never mutates the event.

---

## Security notes

- Passwords: scrypt with per-user salt; constant-time comparison; dummy verification for
  unknown emails to equalise timing.
- Sessions: HS256 JWT in an HttpOnly, SameSite=Lax cookie; role and suspension are re-read
  from the store on every request so changes take effect immediately.
- Invitations: 32-byte random token, only its SHA-256 hash is stored, single use, expiring,
  revocable, rate-limited on redemption.
- RBAC: enforced in every route handler and server page, never only in the UI.
- CSRF: mutation endpoints reject cross-origin Origin headers and rely on SameSite cookies.
- Validation: Zod schemas on every write endpoint; URLs restricted to http(s); feed URLs
  must be https.
- Rate limits: sign-in (per identity and per IP) and invitation redemption are throttled.
  They are in-process; put a shared limiter in front for multi-instance deployments.
- Audit trail: admin actions, sign-ins, analysis runs and every status change are recorded;
  the database trigger makes audit rows immutable.
- Push subscriptions are scoped to their owner; notification reads are authorised server-side.
- Errors returned to clients are generic; details stay in server logs.
- Security headers (nosniff, frame-deny, referrer policy, permissions policy) are set in
  next.config.ts.

### Known limitations / hardening backlog

1. Single-instance rate limiter. Back it with Redis or a Supabase table when running more
   than one instance.
2. Local JSON store is single-writer. Use Supabase for any real deployment.
3. No email/SMS alerts; only in-app and Web Push.
4. No Supabase Auth or Realtime. Auth is in-app; data refreshes on navigation/refresh.
5. In-process ingestion lock is not distributed. Run the scheduler against one instance or
   add a Postgres advisory lock.
6. No automated evaluation of analysis quality; human review remains mandatory.
7. Translation is not automated. Source text is stored verbatim in both locale fields; the
   UI says so rather than inventing a translation.
8. Persian/Latin webfonts load from Google Fonts at runtime with a system fallback stack.
   For air-gapped deployments, self-host Vazirmatn and Inter and remove the stylesheet link.

### Credential rotation

If any secret leaks:

1. Rotate SESSION_SECRET (invalidates all sessions immediately), CRON_SECRET, and
   SUPABASE_SERVICE_ROLE_KEY in the Supabase dashboard.
2. Rotate AI_API_KEY at the provider and set a spend limit.
3. Regenerate VAPID keys and remove stale subscriptions (DELETE via the UI or table).
4. Force password resets for affected accounts; review Admin, Audit for unexpected actions.
5. Remove the exposed value from git history before pushing again, then redeploy.

---

## Testing

    npm test          # 50 tests across 6 files
    npm run typecheck
    npm run lint
    npm run build

Coverage focuses on the rules that must not regress:

| Area | Tests |
| --- | --- |
| Verification state machine | system cannot verify; 2 independent sources; primary source required; admin required for severity 4 to 5; short reason; unknown evidence; retracted is terminal; invalid jumps |
| De-duplication | URL canonicalisation; tracking-parameter stripping; per-source duplicates; cross-source reports kept for corroboration; batch duplicates; Persian/Arabic normalisation |
| Authentication rules and RBAC | viewer read-only; analyst transitions; admin-only review/management; role ordering; unauthenticated throws |
| Notification authorisation | recipient-only reads; admin review access; preference matching; quiet hours across midnight; high-impact gating; retraction propagation |
| AI guardrails | JSON schema rejection; invented citation removal; uncited finding removal; coverage from records; verified cannot be suggested; nonce/tag stripping; injection flags |
| Ingestion parsing | RSS/Atom parsing; HTML stripping; malformed feed rejection; category/severity conservatism; clustering thresholds |

---

## Project structure

    src/app/                 routes: overview, feed, events, analysis, notifications, admin, settings, auth
    src/app/api/             protected route handlers (auth, events, analysis, notifications, push, admin, cron)
    src/components/          UI primitives, shell, event, analysis, notification, admin, settings components
    src/i18n/                typed Persian/English dictionaries and server locale helpers
    src/lib/                 domain logic: auth, verification, alerts, ingestion, ai, store, rbac, validation
    src/lib/store/           repository interface + local JSON and Supabase adapters
    supabase/migrations/     production schema, RLS policies, immutable audit trigger
    tests/                   unit tests and fixtures
    public/                  service worker, manifest, icon

---

## Demo data vs collected data

- Demo records are flagged isDemo, use the reserved .invalid TLD and say so in their own
  titles and summaries.
- The layout renders a persistent demo strip, every card carries a Demo chip, and the local
  store is reported as the data source.
- The ingestion pipeline only reads and writes non-demo events. Demo rows can never be
  clustered with collected reports.
- Deleting the demo store forces a clean reseed on the next request.

---

## Operational checklist

- [ ] DEMO_MODE=false and Supabase configured (or consciously single-instance local)
- [ ] Migration applied; RLS enabled and forced
- [ ] Bootstrap admin created, bootstrap password removed from the environment
- [ ] Sources reviewed, enabled deliberately, terms confirmed
- [ ] Scheduler configured and last-run timestamp advancing
- [ ] AI provider configured or the heuristic mode accepted
- [ ] VAPID keys configured and a test push received on a real device
- [ ] Alert policy reviewed; severity-5 review confirmed
- [ ] Audit log reviewed
- [ ] Backups/point-in-time recovery enabled on Postgres
- [ ] Rate limiting moved to shared storage if running more than one instance

---

## Verification performed in this build

- npm run build completes with all routes compiled as dynamic server routes.
- npm test: 50 tests passing.
- npm run typecheck: clean.
- npm run lint: clean.
- Manual HTTP checks: sign-in, RBAC on admin routes, event detail, analysis run, invalid and
  valid status transitions, alert approval, unauthenticated API rejection, cron secret
  enforcement, RTL/LTR rendering.

No claim is made that live collection or model calls were exercised without credentials:
those paths are implemented, guarded, and documented, and fail visibly rather than
pretending to work.
