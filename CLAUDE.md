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
- Monorepo: pnpm workspaces + Turborepo.
- Web portal and admin panel: Next.js (App Router, React, TypeScript). **Two separate apps**, not one.
- Mobile (later): Expo / React Native.
- Database: PostgreSQL via Prisma. Validation: Zod (shared). Styling: Tailwind.
- Auth: **self-hosted**, session-based (argon2id + httpOnly/Secure/SameSite cookies), identity stored in our own Postgres.
- **Hosting/region: UAE only (locked).** Database and document storage in a UAE region (AWS me-central-1, Azure UAE, or a UAE VPS). Web on Vercel. **Supabase is ruled out** (no UAE region). **No separate NestJS API** — business logic lives in `packages/core`, called by thin Next.js handlers.

## Repo layout
- `apps/web` — customer-facing Home portal (public, seller, buyer route groups)
- `apps/admin` — internal operations/admin panel (separate app: distinct access + security boundary)
- `apps/mobile` — Expo app (later)
- `packages/core` — domain logic: workflow engine, ledger, RBAC, ROI. Framework-agnostic, the only place business rules live.
- `packages/db` — Prisma schema + migrations + client (the only code that talks to Postgres)
- `packages/types` — shared types and Zod schemas (one definition per shape)
- `packages/adapters` — integration interfaces (e-sign, identity/UAE PASS, Trakheesi, DLD, payment), each with a manual/stub impl now and a real one later
- `packages/auth` — self-hosted auth + RBAC enforcement helpers (guards, ownership checks)
- `packages/ui` — shared React components + design tokens
- `packages/notifications` — email now, push/SMS later, behind an interface
- `packages/config` — shared ESLint / TypeScript / Tailwind config
- `packages/i18n` — English only now; a stub seam for Arabic/RTL later (no RTL work now)
- `infrastructure/docker` — local Postgres (and MinIO for storage later)
- `docs/` — architecture, ADRs, story specs, diagrams (Mermaid in `docs/diagrams/`)
- `tests/` — integration and e2e

## Architectural rules (do not violate without discussion)
- Business logic lives in `packages/core`, NOT in routes or components. The API is a thin layer that calls core.
- Shared types/validation live in `packages/types`. Do not redefine the same shape in two apps.
- The transaction tracker AND the listing flow are one **configuration-driven state machine with an append-only audit history**. Never hardcode per-stage if/else logic.
- Money is a **double-entry ledger** from day one, even though Home only records (does not hold) funds for now.
- Access control is **real role-based permissions** (Operations, Compliance, Support, Admin; Agent later with Premium) plus an ownership check. No single `isAdmin` flag.
- Every external system sits behind an **adapter interface** in `packages/adapters`. Integrate what is available now; keep licensed ones as recorded manual steps behind the same interface.

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
- TypeScript strict mode. No `any` without a written reason.
- 2-space indent. Follow ESLint + Prettier; do not fight the formatter.
- Naming: components PascalCase, vars/functions camelCase, files kebab-case, DB tables snake_case.
- Every schema change is a Prisma migration. Never edit the database by hand.
- Validate all external input with a Zod schema at the boundary.
- Tests for domain logic in `packages/core`. A new workflow transition or ledger rule needs a test. Cover the two spine flows (seller lists; buyer offer to atomic acceptance) first.
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
<!-- Update once the repo is scaffolded. -->
- Install `pnpm install` · Dev `pnpm dev` · Build `pnpm build` · Lint `pnpm lint` · Test `pnpm test` · Typecheck `pnpm typecheck`
- DB migrate (dev) `pnpm db:migrate` · Generate Prisma client `pnpm db:generate`

## Workflow expectations
- Run `pnpm lint` and `pnpm test` before a change is considered done.
- Plan non-trivial, multi-file changes before editing. Small, reviewable commits.
- When touching `packages/core` or `packages/db`, check the change against the Invest-readiness rules above.

## Safety — regulated data (important)
- Never commit secrets, credentials, `.env` files, or real user data.
- Never log or print Emirates IDs, Title Deeds, or other PII.
- Never run destructive DB commands (drop, truncate, reset, mass delete) against a shared environment. Ask first.
- Title Deeds, Emirates IDs, KYC docs are access-controlled: buyers must never read them; only Operations/Compliance roles.
- File uploads need content-type checks, signed URLs, and access scoping. No demo-login in production. Guard every admin endpoint. Rate-limit auth and search.

## Build roadmap (8 weeks to pilot)
Foundation first (weeks 1-2), then the Home flow. Milestones: **(wk2)** Foundation ready · **(wk5)** Demo-ready · **(wk7)** Pilot candidate · **(wk8)** Pilot-ready. Full Gantt in `docs/diagrams/10-roadmap-gantt.md`. Do not jump to features before the foundation milestone.

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
