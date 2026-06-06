# Markaz Home — Week 1 build plan (Foundation)

**Goal of Week 1:** a running, strictly-typed monorepo with shared packages wired, quality gates and CI green, a local Postgres with a working Prisma migration pipeline, and auth begun. No features yet.

**Working mode:** build-it-yourself with Claude Code as mentor/reviewer. For each block, ask Claude Code for a short plan first, approve it, then write the code yourself one step at a time. The old repo is reference only.

**End-of-week "done" looks like:** `pnpm dev` runs both apps, `turbo run typecheck lint test` is green, CI passes on a PR, a Prisma migration applies to local Postgres and a query returns, and a user can register + log in locally with a hashed password and a valid session.

**What's blocked on the team (not on you):** provisioning the *production* UAE-region database and storage needs a cloud account + budget sign-off and Jordan's confirmation of provider/region (from the kickoff email). Local dev does not depend on any of that, so Week 1 proceeds fully on local infra; prod provisioning runs in parallel as a decision.

---

## A. Monorepo skeleton — BL-001

- [ ] `git init` a fresh repo; pin Node with `.nvmrc` and `engines` in package.json; enable pnpm via corepack. *Why: reproducible toolchain for a solo dev across machines.*
- [ ] Root `package.json` (private) + `pnpm-workspace.yaml` listing `apps/*` and `packages/*`.
- [ ] Turborepo: `turbo.json` with a pipeline for `build`, `dev`, `lint`, `typecheck`, `test` and the dependency graph between them.
- [ ] Create the folders, each with its own `package.json` + `tsconfig.json`: `apps/web`, `apps/admin`, `packages/core`, `packages/db`, `packages/types`, `packages/adapters`.
- [ ] Wire workspace dependencies with `workspace:*` (web → core, types; admin → core, types; core → db, types; adapters → types).
- **Done when:** `pnpm install` resolves the workspace and `turbo run build` walks the graph without error.

## B. Tooling & quality gates — BL-002

- [ ] `tsconfig.base.json` with `strict: true` (plus `noUncheckedIndexedAccess`, `noImplicitOverride`); every package extends it. *Why: strict types are the cheapest bug-catcher you have as a one-person team.*
- [ ] ESLint (flat config) + Prettier, shared from the root.
- [ ] Root scripts wired through turbo: `typecheck` (`tsc --noEmit` per package), `lint`, `format`, `test`.
- [ ] Vitest baseline + one trivial passing test to prove the runner.
- [ ] CI: a GitHub Actions workflow on pull requests that installs, then runs `typecheck`, `lint`, `test`.
- [ ] (Optional) husky + lint-staged for a pre-commit check.
- **Done when:** `turbo run typecheck lint test` is green locally and CI passes on a throwaway PR.

## C. Apps wired — part of BL-001

- [ ] Scaffold `apps/web` (Next.js, App Router, TypeScript) with a minimal landing page.
- [ ] Scaffold `apps/admin` as a separate Next.js app with a minimal shell. *Why: admin is a distinct surface with its own access model (RBAC matrix); keep it separate from day one.*
- [ ] Prove cross-package wiring: define one trivial Zod schema/type in `packages/types`, import it in both `apps/web` and `packages/core`, and confirm typecheck passes.
- **Done when:** both apps run under `pnpm dev` and the shared type imports cleanly across packages.

## D. Database & migration pipeline (local) — BL-003

- [ ] `docker-compose.yml` with a local Postgres service; `.env` with `DATABASE_URL`; `.env.example` committed (not `.env`).
- [ ] `packages/db`: initialise Prisma (`schema.prisma` with the postgres datasource and client generator).
- [ ] Add one trivial model, run `prisma migrate dev` to prove the migration flow, generate the client, and export a single db client from `packages/db`.
- [ ] Call that client from `packages/core` (not directly from the app) to keep data access transport-agnostic.
- **Done when:** a migration applies to local Postgres, the client generates, and a query returns through core.

## E. Production infra plan (decision, partly blocked) — BL-003

- [ ] Document the prod hosting shape: web on Vercel; managed Postgres in a **UAE region**, provider pending Jordan's confirmation. Note the candidates (AWS RDS `me-central-1`, Azure Database for PostgreSQL UAE North, or a UAE VPS) and the residency requirement. *Supabase stays ruled out (no UAE region).*
- [ ] Note the object-storage choice for documents: access-controlled, encrypted, UAE-region (S3-compatible in `me-central-1` or Azure Blob UAE); for dev, MinIO or local. This becomes the storage adapter in Week 2 (BL-008).
- **Done when:** the provider options and residency constraint are written down and the open decision is flagged to Jordan. (No provisioning until the account/budget is confirmed.)

## F. Auth foundation begun — BL-004 (spans Weeks 1–2)

- [ ] Choose the self-hosted auth approach and write down the tradeoffs (e.g. Lucia/Oslo primitives, or a hand-rolled session with argon2id + secure cookies). Keep session verification usable from both apps.
- [ ] Add `User` and `Session` models to Prisma (the start of the identity model; the full property-first data model is Week 2, BL-005).
- [ ] Implement register, login, session issue/verify, logout, with argon2id password hashing and secure, httpOnly cookies.
- [ ] Sketch the RBAC model (`Role`, `Permission`) and the two-layer enforcement pattern from the RBAC matrix — a role guard *and* an ownership check. Design and stub this in Week 1; implement fully in Week 2.
- **Done when (Week 1 portion):** a user can register and log in locally against hashed credentials with a valid session, and the RBAC approach is decided and stubbed.

## G. Close-out

- [ ] `README` with setup/run instructions; commit; merge a clean PR through CI.
- [ ] Friday timesheet; short weekly progress note to Jordan.
- [ ] Update the project context/status doc to reflect foundation progress.

---

## If time runs short (priority order)

The non-negotiable Week 1 spine is **A → B → C → D**: a typed, tested, CI-checked monorepo with a working local database and migration pipeline. That alone is a solid week and unblocks everything. **F (auth)** is allowed to spill into Week 2 — the backlog already has it spanning Weeks 1–2. **E** is mostly a decision plus a message to Jordan, so it costs little and shouldn't crowd out the spine.

## Running this with Claude Code

Open each block with a plan request, for example: *"Plan block A only — the monorepo skeleton. List the files you'd create and the key choices (pnpm workspace layout, turbo pipeline), no code yet. Wait for my approval."* Approve, then build step by step, you writing and it reviewing. Don't let it scaffold all six packages in one shot; do one, understand it, move on.
