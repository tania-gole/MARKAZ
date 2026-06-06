# Markaz Home — Project Instructions for Claude Code

<!-- The single source of behavioural truth, auto-loaded every session. Keep it tight (~200 lines). Hard enforcement lives in .claude/settings.json + hooks. Deep detail (diagrams, story specs, decision log) lives in /docs and is loaded on demand, do not paste it all in here. Update when a decision changes. -->

## What this project is
Markaz Home is a transaction-aware real-estate platform for Dubai/UAE (buy, sell, rent). It handles regulated data (Title Deeds, Emirates IDs) and a multi-party property transaction, so correctness, auditability, and security are first-class. The MVP is **Home only, Dubai only, English only**. Markaz Invest is deferred but the architecture must stay Invest-ready (see Design rules).

## How to work here (read first)
- **Tania is the sole engineer and is building this herself to fully own and understand it.** Your role is architect, mentor, reviewer, and pair, **not** an autonomous code generator.
- Default to explaining the approach and proposing small, reviewable steps. Do not generate large parts of the codebase unprompted. When asked for code, keep it scoped and explain the *why* so every part is understood.
- Plan before coding. Surface decisions; do not silently pick. One concern at a time.

## Built fresh — the old MVP is reference only
A previous MVP exists as a **read-only reference**. We are **building fresh**; do not extend it or copy its structure wholesale.
- Learn from what it did well: Docker/deploy posture, JWT fail-fast, the validation pipe, schema-entity lockstep, property search/filters, per-deal state history, sensible indexes, no cloud lock-in.
- Do NOT carry its debt: single `seller_id` (breaks design rule 2), no ledger (rule 4), identity fused with role + ad-hoc RBAC (rule 5), hand-rolled non-reusable state machine (rule 3), no migrations, fake-success stubs, demo-login always on, unguarded admin endpoints, PII plaintext, no tests/CI.

## Tech stack
- Monorepo: pnpm workspaces + Turborepo (v2 `tasks` key, not v1 `pipeline`). Node 24 LTS pinned via `.nvmrc` + `engines`; pnpm 10.18.0 via corepack (`packageManager` field in root `package.json`).
- Web portal and admin panel: Next.js 15 (App Router, React 19, TypeScript). **Two separate apps**, not one. Web on port 3000, admin on 3001.
- Mobile (later): Expo / React Native.
- Database: PostgreSQL 16 via Prisma 6 (parity with the eventual UAE-region managed Postgres). Local dev: `docker compose -f infrastructure/docker/docker-compose.yml up -d` (host port 5433 to coexist with any system Postgres). Validation: Zod (shared). Styling: Tailwind (introduced when the first real UI lands in Week 3).
- Auth: **self-hosted**, session-based (argon2id via `@node-rs/argon2` prebuilt binaries — no node-gyp; opaque 32-byte tokens hashed via SHA-256 before DB storage; httpOnly/SameSite=lax/Secure-gated-on-NODE_ENV cookies), identity stored in our own Postgres.
- **Hosting/region: UAE only (locked).** Database and document storage in a UAE region (AWS me-central-1, Azure UAE, or a UAE VPS). Web on Vercel. **Supabase is ruled out** (no UAE region). **No separate NestJS API** — business logic lives in `packages/core`, called by thin Next.js handlers.

## Repo layout
**Built:**
- `apps/web` — customer-facing Home portal (`(public)` / `(seller)` / `(buyer)` route groups, port 3000).
- `apps/admin` — internal operations/admin panel (port 3001; separate app for the security boundary).
- `packages/core` — domain logic. Built: workflow engine (`src/engine`), ledger (`src/ledger`), RBAC ownership layer (`src/rbac.ts`). Framework-agnostic; the only place business rules live.
- `packages/db` — Prisma schema + migrations + singleton client. **The only code that imports `@prisma/client`** — re-exports `Prisma` for every other package.
- `packages/types` — shared Zod schemas + `ForbiddenError` (the single shared exception class so auth/core stay siblings).
- `packages/adapters` — integration interfaces. Built: identity (fail-loud stub), esign (manual-recorded). Deferred: gov (route handlers use engine directly; swap-shape mismatch between manual decision-in and real decision-out), payment (no caller yet).
- `packages/auth` — self-hosted auth + RBAC permission layer. Built: argon2 password hashing, session lifecycle, register/login/logout, encryption stubs for Emirates ID, `PERMISSIONS` registry + `ROLE_PERMISSIONS` matrix, `userHasRole` / `userHasPermission` / `requirePermission`, `seedRbac()`.
- `infrastructure/docker` — local Postgres 16 (compose project name `markaz`; host port 5433).
- `docs/` — architecture, ERD, state machines, sequence flows, story specs.

**Deferred (added when their features land — don't scaffold ahead):**
- `apps/mobile` — Expo. Post-pilot.
- `packages/ui` — shared React components + design tokens. First real UI in Week 3 will introduce.
- `packages/notifications` — email / push / SMS behind an interface.
- `packages/config` — shared ESLint / TS / Tailwind config. Currently root-level config files (`tsconfig.base.json`, `eslint.config.mjs`, `prettier.config.mjs`); promote when Next-specific presets need composition.
- `packages/i18n` — Arabic / RTL seam.

## Architectural rules (do not violate without discussion)
- Business logic lives in `packages/core`, NOT in routes or components. The API is a thin layer that calls core.
- Shared types/validation live in `packages/types`. Do not redefine the same shape in two apps.
- The transaction tracker AND the listing flow are one **configuration-driven state machine with an append-only audit history**. Never hardcode per-stage if/else logic.
- Money is a **double-entry ledger** from day one, even though Home only records (does not hold) funds for now.
- Access control is **real role-based permissions** (Operations, Compliance, Support, Admin; Agent later with Premium) plus an ownership check. No single `isAdmin` flag.
- Every external system sits behind an **adapter interface** in `packages/adapters`. Integrate what is available now; keep licensed ones as recorded manual steps behind the same interface.
- **Only `@markaz/db` imports `@prisma/client`.** Every other package imports `Prisma` (including `Prisma.Decimal`, `Prisma.DbNull`, `Prisma.TransactionClient`, `Prisma.PostingGetPayload<...>`) from `@markaz/db`. Single ORM seam.
- **Workflow engine: `createEngine({ aggregateType: { machine, adapter } })`** in `packages/core/src/engine`. Per-aggregate persistence adapters; the engine knows nothing about specific tables. CAS on the status column for concurrency; status update + event insert in one `db.$transaction`. Append-only events enforced through the API surface (`transition()` is the only mutator). Creation events (`null → initialState`) are the feature's responsibility, not the engine's.
- **Ledger: signed Decimal, two tables, append-only** in `packages/core/src/ledger`. `Posting` carries metadata + currency; `PostingLine.amount` is `Decimal(14,2)`, positive = debit, negative = credit. A posting balances iff `SUM(amount) = 0`. Amounts are strings at the API boundary, sub-cent rejected via `AmountScaleError`, idempotency via optional `idempotencyKey` + unique constraint.
- **RBAC is TWO composable layers, not one.** `requirePermission(userId, permission)` in `@markaz/auth` (`PERMISSIONS` registry + `ROLE_PERMISSIONS` matrix in code; Admin lists every permission explicitly — no wildcard bypass); `requireOwnership(userId, resource)` in `@markaz/core` (per-resource resolver registry, no big switch; `ResourceType = property | listing | offer`, transaction deferred). Route handlers compose per action — AND, OR, conditional. No `canUserDoX` combiner. `ForbiddenError` lives in `@markaz/types`.
- **PII never plaintext.** Emirates ID stored as `Bytes` ciphertext (`emiratesIdEnc`) + deterministic SHA-256 hash for lookup (`emiratesIdHash`). Encryption helpers in `@markaz/auth` throw until Week 3 wires real crypto — no path silently stores plaintext. Errors that touch PII inputs (identity adapter, hash helpers) never echo the input.

## Design rules that keep Home Invest-ready (preserve these)
1. Property-first: the Property is the permanent record; listings, transactions, tenancies, ownership are time-bounded relationships on it.
2. Ownership is a relationship, and an Owner can be a person OR an entity (an Invest SPV slots in later with no schema change). Never a single `seller_id` FK.
3. One workflow engine powers Home now and Invest later.
4. One ledger; Invest will hold funds and reuse it.
5. Identity is separate from role and built to be reused across Home and Invest.

## Locked product decisions (Round 1 — answered)
- Revenue: the **buyer pays 1% commission** (the USP, half the market norm). No seller fee, no platform fee. Partner referrals vary per deal. The ledger records the 1% + referrals.
- Premium Managed deferred → **Self-Service is the only tier**. The **buyer prospectus is standard on every listing**. Market reports = future quarterly content section (placeholder).
- A seller can hold **multiple properties** (one-to-many).
- **Joint ownership:** multi-owner relationship + multi-signer e-signature; the flow is stage-gated until all owners sign.
- Pilot is **UAE-resident sellers only**; non-resident path soon, leave the identity seam.
- **Holding money (open):** interim is record, do not hold; ledger built so digital escrow can slot in once licensed.
- Integrations: real now where available (Form A e-sign; likely UAE PASS). Licensed steps (Trakheesi, DLD) are manual + recorded behind adapters.

## Conventions
- TypeScript strict mode. No `any` without a written reason. Strict flags in `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`, `verbatimModuleSyntax`. Consequences worth knowing: `process.env['X']` not `process.env.X`; `import type` for type-only imports; conditional spread (`...(x !== undefined ? { x } : {})`) for optional fields handed to Prisma.
- 2-space indent. Follow ESLint + Prettier; do not fight the formatter.
- Naming: components PascalCase, vars/functions camelCase, files kebab-case, DB tables snake_case via `@@map` / `@map` (Prisma models stay PascalCase, fields camelCase; SQL gets `user`, `password_hash`, etc.).
- Every schema change is a Prisma migration. Never edit the database by hand. For destructive Prisma renames (e.g. `@@map` rename of a table with data), use `prisma migrate dev --create-only`, hand-edit the SQL to `ALTER TABLE RENAME`, then apply.
- Validate all external input with a Zod schema at the boundary.
- **Status / kind / accountCode / role columns are strings, not Postgres enums.** Adding a value is config, never `ALTER TYPE`. App-side `as const` tuples + Zod recover compile-time safety.
- **Money is `Decimal(14, 2)` everywhere. Never Float.** Shares are `Decimal(10, 8)`. Decimal arithmetic via `Prisma.Decimal` (imported from `@markaz/db`).
- Tests for domain logic in `packages/core`. A new workflow transition or ledger rule needs a test. Cover the two spine flows (seller lists; buyer offer to atomic acceptance) first.
- **Test naming: `*.test.ts`** runs locally + CI without DB (mocks where needed). **`*.integration.test.ts`** runs only via `pnpm test:integration` (excluded by root `vitest.config.ts`; included by per-package `vitest.integration.config.ts`). DB-touching tests stay in the integration tier.
- Stage `pnpm-lock.yaml` whenever any `package.json` deps change — CI's `--frozen-lockfile` rejects drift.
- **English only for the pilot. No Arabic / RTL work now** — leave the i18n seam, but do not translate or build RTL.
- Australian/British spelling in copy. Amounts in AED. No em dashes in written docs.

## Using Claude Code effectively
- **CLAUDE.md hierarchy:** this root file is global. Add a scoped `CLAUDE.md` inside each app/package as it is built (e.g. `apps/web/CLAUDE.md`, `packages/db/CLAUDE.md`) holding only that area's local detail. Keep them short.
- **CLAUDE.local.md:** personal, gitignored overrides (see the template). Not shared.
- **.claude/settings.json:** permissions (allow/deny) + a post-edit lint hook. This is where hard rules live, not in prose.
- **.claudeignore:** keep node_modules, build output, env, and the lockfile out of context.
- **.mcp.json:** external tools over MCP (GitHub). **Never add Supabase.** Add Sentry later if useful.
- **Plan mode is the default** for non-trivial work: produce a plan, wait for approval, then build step by step.
- **Skills (`.claude/skills/`) and subagents (`.claude/agents/`):** add once patterns stabilise (e.g. a "prisma-migration" skill, a "core-domain-module" skill, a code-reviewer subagent). Do not pre-build these in week 1.

## Commands
- **Daily:** `pnpm dev` (runs both apps) · `pnpm build` · `pnpm lint` · `pnpm test` (unit) · `pnpm typecheck`
- **DB (require local Postgres up):** `docker compose -f infrastructure/docker/docker-compose.yml up -d` · `pnpm db:migrate` · `pnpm db:generate` · `pnpm db:seed` (idempotent RBAC seed)
- **Integration tests** (require local Postgres + DATABASE_URL): `pnpm test:integration` (root wrapper loads `.env`)
- **Formatting:** `pnpm format` (Prettier write) · `pnpm format:check`
- **Setup / housekeeping:** `pnpm install` · `pnpm clean`

## Workflow expectations
- Run `pnpm lint` and `pnpm test` before a change is considered done. If the change touches the DB or domain logic, also `pnpm test:integration`.
- Plan non-trivial, multi-file changes before editing. Small, reviewable commits.
- When touching `packages/core` or `packages/db`, check the change against the Invest-readiness rules above.
- When `package.json` deps change, stage `pnpm-lock.yaml` in the SAME commit — CI rejects drift via `--frozen-lockfile`.
- Migrations that warn destructively in non-interactive mode (e.g. tightening a column, renaming via `@@map` with data): generate via `prisma migrate dev --create-only`, hand-edit to add the safe path (`ALTER TABLE RENAME`, defensive `DO $$ ... $$` backfill), then apply.

## Safety — regulated data (important)
- Never commit secrets, credentials, `.env` files, or real user data.
- Never log or print Emirates IDs, Title Deeds, or other PII. Errors that touch PII inputs (identity adapter, hash helpers) MUST NOT echo the input in `.message`, `.stack`, or own properties. Unit tests assert this.
- Never run destructive DB commands (drop, truncate, reset, mass delete) against a shared environment. Ask first.
- Title Deeds, Emirates IDs, KYC docs are access-controlled: buyers must never read them; only Operations/Compliance roles. Enforced via the `Document.accessLevel` column + RBAC at read.
- File uploads need content-type checks, signed URLs, and access scoping. No demo-login in production. Guard every admin endpoint. Rate-limit auth and search.
- **Encryption fail-loud until wired:** `@markaz/auth.encryptEmiratesId` and `hashEmiratesId` throw until Week 3. Any code path that would store an Emirates ID before then fails loudly — no silent plaintext.
- **Append-only invariants** (Event log, Posting + PostingLine): enforced through the API surface today — `engine.transition` and `ledger.post` are the only mutators, neither exposes UPDATE/DELETE. DB-level `REVOKE UPDATE, DELETE` is deferred to the security pass; until then, going through the typed APIs is the contract.
- **`Document` has a DB-level `CHECK` constraint** enforcing exactly-one-parent (property / listing / transaction). Belt and braces beside the app-level helper.

## Build roadmap (8 weeks to pilot)
Foundation first (weeks 1-2), then the Home flow. Milestones: **(wk2)** Foundation ready ✓ · **(wk5)** Demo-ready · **(wk7)** Pilot candidate · **(wk8)** Pilot-ready. Full Gantt in `docs/diagrams/10-roadmap-gantt.md`. **Foundation milestone hit** (Blocks A–K below); Week 3 onwards is feature work, starting with MKZ-H-001.

### Foundation built (Blocks A–K, Weeks 1–2)
- **A · B:** monorepo + tooling — pnpm + Turborepo, strict TS, ESLint flat config, Prettier, Vitest, GitHub Actions CI on PRs.
- **C:** Next.js 15 in both apps; cross-package consumption proven via `transpilePackages` (types → core → web).
- **D:** Postgres 16 in Docker; Prisma 6 + first migration; singleton client via `globalThis`; `dotenv-cli` for per-script-cwd env loading.
- **F:** auth — argon2id passwords (`@node-rs/argon2`), session-based with SHA-256-hashed tokens, register/login/logout, RBAC scaffolding.
- **G:** property-first data model — User / Party / Property / Ownership / Listing / Offer / Transaction / Document / Event, snake_case tables, encrypted-PII column shape (`emiratesIdEnc` + `emiratesIdHash`), Document CHECK constraint.
- **H:** workflow engine + listing machine + Postgres service in CI (integration tests run against real DB; CAS concurrency proven).
- **I:** double-entry ledger — signed Decimal, idempotency keys, atomic Posting + lines, append-only API.
- **J:** adapter interfaces — identity stub (fail-loud, PII-safe errors) + esign manual; gov + payment deferred to their features.
- **K:** RBAC enforcement — 8-permission registry + role-permission matrix, `userHasPermission` + `requirePermission` (auth), `userOwns` + `requireOwnership` (core), idempotent `seedRbac`, `partyId` promoted to required after defensive backfill.
- **E (UAE region):** parked until pre-deploy.
- Test totals on `main`: ~77 unit, 40 integration, all green local + CI.

## Context and decisions
- Source of truth + live decision log: `docs/Markaz-Project-Context.md`.
- Diagrams: `docs/diagrams/` (C4 context/container/component, ERD, listing + transaction + offer state machines, sequence flows, roadmap).
- Story specs: `docs/stories/` (first one: MKZ-H-001).
- Round 1 answered. Two items open: holding money, and integration prioritisation/licensing (pending a call). Where undecided, code against the documented recommendation and leave a `// TODO(open: ...)` marker rather than guessing silently.

## Things NOT to do in the MVP
- Do not build Markaz Invest features (stay Invest-ready, do not scaffold Invest apps).
- Do not build Premium Managed unless told it is in scope.
- Do not build Arabic / RTL now.
- Do not integrate Trakheesi/DLD/bank APIs; those steps are manual and recorded behind adapters.
- Do not reintroduce a separate NestJS API, Supabase, multi-country/tenant config, or a scraping/ML data pipeline (these are out of scope, despite appearing in earlier reference structures).
- Do not add microservices, Kubernetes, or extra infrastructure complexity. One codebase, managed services.
- Do not build on top of the old MVP repo; it is reference only.
