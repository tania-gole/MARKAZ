# Markaz Home — Week 1 setup guide (explanations + Claude Code prompts)

This pairs each Week 1 block with (1) an explanation of the tech and why we're using it, and (2) a Claude Code prompt to execute it. Prompts are in fenced blocks so you can copy them directly.

**How to use it:** run the kickoff prompt once to orient Claude Code, then work one block per session (A–C can share a session if you have time). Always let it produce a plan first, read the plan, approve it, then write the code yourself with it reviewing. You're building this to understand it, so if a plan step isn't clear, ask it to explain before you write anything.

---

## Kickoff (run once)

The point of this is to load all the design context into Claude Code's head and lock the working mode before any code exists.

```
Read CLAUDE.md and everything in /docs (context, architecture, ERD, state
machines, sequence flows, component view, RBAC, roadmap, the Week 1 plan, and
the H-001 spec). Then summarise back to me, a few lines each: the MVP scope,
the five design rules, the target architecture (monorepo shape + packages),
and the working mode you will follow.

We are building fresh. The old repo is reference only. Do not write any code yet.
```

---

## Block A — Monorepo skeleton

**Monorepo.** One repository holding several apps (web, admin, later mobile) plus shared packages, instead of a separate repo per piece. Markaz needs the web app, a separate admin app, and shared domain logic and types to all stay in lockstep. A monorepo gives you one source of truth, atomic commits across boundaries (change a type and its consumers in one PR), and one toolchain. The cost is a bit more tooling setup, which is exactly what this block pays for.

**pnpm.** The package manager. We choose it over npm/yarn for three reasons: first-class workspaces (it links your local packages together), speed and disk efficiency (it stores each package version once and hardlinks it), and a *strict* `node_modules` layout that prevents "phantom dependencies", you can only import packages you actually declared, which catches a real class of bugs. Local packages link with the `workspace:*` protocol, so there's no publishing and no version drift.

**Turborepo.** A task runner that understands the dependency graph between your packages. When you run `turbo run build`, it builds packages in the correct order, in parallel where possible, and caches results so unchanged packages aren't rebuilt. For a solo dev the practical wins are: one command across everything, correct ordering for free, and fast incremental runs.

**The package split.** This is where the design rules become structure:
- `packages/core` — domain logic (the business rules), written to be transport-agnostic so it doesn't depend on Next.js. This is where listing/offer/transaction logic lives.
- `packages/db` — Prisma schema, migrations, and the generated client. The *only* place that talks to Postgres.
- `packages/types` — shared Zod schemas and the TypeScript types inferred from them. One definition of a "Property" used everywhere.
- `packages/adapters` — the integration interfaces (e-sign, identity, government, payment) so external systems sit behind seams.

The dependency direction matters: apps depend on `core` and `types`; `core` depends on `db` and `types`; nothing depends on the apps. That keeps the apps thin and the logic testable.

```
Block A — monorepo skeleton only.

First give me a plan (no code): the workspace layout (pnpm-workspace.yaml,
root package.json), the turbo.json pipeline (build, dev, lint, typecheck,
test), and the empty app/package folders with their dependency wiring
(web/admin -> core, types; core -> db, types; adapters -> types) using
workspace:*. Explain the key choices and any decisions you are making, and
wait for my approval.

Then build it one file at a time: explain each file before I write it, and
review what I write. Pin Node with .nvmrc and engines, and use corepack for pnpm.

End state: pnpm install resolves the workspace and `turbo run build` walks the
graph on the empty packages.
```

---

## Block B — Tooling & quality gates

**TypeScript strict mode.** Turning on `strict` (plus `noUncheckedIndexedAccess` and a couple of others) makes the compiler reject the bugs that bite hardest: accessing something that might be `null`/`undefined`, implicit `any`, unhandled cases. As a solo dev you don't have a second pair of eyes on every line, so the compiler *is* your reviewer. `noUncheckedIndexedAccess` in particular makes array and object lookups return `T | undefined`, forcing you to handle the missing case.

**ESLint + Prettier.** Two different jobs. ESLint catches likely-bug patterns and enforces conventions (it's a linter). Prettier just formats code consistently so you never think about or argue over style. We use ESLint's flat config (the current format). Together they remove bikeshedding and catch mistakes before they run.

**Vitest.** The test runner. It's fast, ESM-native, and has a Jest-compatible API, so it fits the TS ecosystem cleanly. We set up a baseline plus one trivial test now so the harness exists from day one; you'll write the real tests on the H-001 flows as you build them and harden in Week 8.

**GitHub Actions CI.** A workflow that runs typecheck, lint, and test automatically on every pull request. Even solo, CI is worth it: it guarantees `main` always passes the gates, kills "works on my machine," and is the seed of your deploy pipeline later.

**husky + lint-staged (optional).** A pre-commit hook that lints and formats only the files you're committing. It catches issues before they even reach CI. Optional because CI already covers it; nice for fast feedback.

```
Block B — tooling and quality gates only. Do not add app features.

Plan first (no code): a strict tsconfig.base.json (and how each package
extends it), ESLint flat config + Prettier, the turbo scripts for typecheck /
lint / test / format, a Vitest baseline with one trivial test, and a GitHub
Actions workflow that runs typecheck + lint + test on pull requests. Explain
why each strict TS flag is on. Wait for my approval, then build step by step
with me writing.

End state: `turbo run typecheck lint test` is green locally and CI passes on a
throwaway PR.
```

---

## Block C — Apps wired

**Next.js (App Router).** Next.js is the React framework we'll build the UI on: file-based routing, server-side rendering, API routes, and a first-class deploy story on Vercel (our chosen web host). The App Router is its current routing model, with server components (so you can fetch data close to the database through `core`), nested layouts, and server actions. We use it because it's where Next.js is heading and it suits server-side data access.

**Why admin is a separate app.** The admin/operations surface has a different audience (internal ops, not the public), a different access posture (the RBAC matrix), and a different security and deploy boundary. Standing it up as its own app now is free; carving it out of the public app later is painful.

**Zod, as the wiring proof.** Zod is a schema library: you define a schema once, get a TypeScript type from it via `z.infer`, and validate untrusted input at runtime (API bodies, form data). This matters because TypeScript types vanish at runtime, Zod gives you both the type and a runtime guard from a single definition. Defining one schema in `packages/types` and importing it in both an app and `core` is the cleanest proof that the monorepo wiring actually works.

```
Block C — wire the two apps. No business features yet.

Plan first (no code): scaffold apps/web (Next.js App Router, TypeScript) with
a minimal landing page, apps/admin as a separate Next.js app with a minimal
shell, and a proof-of-wiring where one Zod schema in packages/types is
imported by both apps/web and packages/core. Explain the App Router choice and
why admin is a separate app. Wait for approval, then build step by step.

End state: both apps run under `pnpm dev`, and the shared type imports cleanly
across packages.
```

---

## Block D — Database & migration pipeline (local)

**Docker / docker-compose for local Postgres.** Rather than installing Postgres on your OS, we define it as a service in `docker-compose.yml` pinned to a specific version. One command spins up the exact same database for you now and for any future teammate, with no "which Postgres version?" drift.

**PostgreSQL.** A relational, ACID-compliant database. Markaz's data is deeply relational and money-adjacent, ownership relationships, a double-entry ledger, transaction histories, which is exactly Postgres's strength, and it's available in UAE regions (our residency requirement).

**Prisma.** Our ORM, migration tool, and type-safe client in one. You define your models once in `schema.prisma`; Prisma generates a client whose queries are type-checked against that schema (a typo'd field is a compile error), and `prisma migrate` turns every schema change into a versioned SQL migration file. That versioning is the thing the reference repo lacked, it had a single `init.sql` that drifts. With migrations, the schema's history is tracked and ordered, and you can rebuild the database from scratch reproducibly.

**Why only `core` talks to the db.** The app calls functions in `core`; `core` uses the db client. Keeping data access out of the Next.js layer keeps the business logic transport-agnostic and unit-testable, and means the same logic could later serve a mobile app or a job runner without change.

```
Block D — local database and the migration pipeline. No real domain models
yet beyond one trivial proof model.

Plan first (no code): a docker-compose Postgres service, .env and
.env.example with DATABASE_URL, Prisma initialised in packages/db (datasource
+ generator), one trivial model, the migrate flow, the generated client
exported from packages/db, and a trivial query called from packages/core (not
from the app). Explain Prisma's schema-first model, why migrations are
versioned, and why only core talks to the db. Wait for approval, then build
step by step.

End state: a migration applies to local Postgres, the client generates, and a
query returns through core.
```

---

## Block E — Production infra (decision, mostly docs)

This block is a written decision plus a question for Jordan, not provisioning. **Vercel** hosts the web app (excellent Next.js support, preview deploys per PR, a global CDN). The **database** must be managed Postgres in a **UAE region** for residency, with the provider still open (AWS RDS `me-central-1`, Azure Database for PostgreSQL UAE North, or a UAE VPS). **Object storage** for sensitive documents (Title Deed, Emirates ID) must be access-controlled and encrypted, also UAE-region; locally you can use MinIO or the filesystem. Supabase stays explicitly out because it has no UAE region. The reason this is a decision and not a task: provisioning needs a cloud account, budget sign-off, and Jordan's confirmation of provider/region.

```
Block E — production infra decision (documentation, minimal code).

Help me write a short docs/infra.md recording: web on Vercel; managed Postgres
in a UAE region with the provider options (AWS RDS me-central-1, Azure Database
for PostgreSQL UAE North, or a UAE VPS) and the residency requirement; the
object-storage choice for sensitive documents (access-controlled, encrypted,
UAE region) with MinIO or local for dev; and a clearly flagged open question
for Jordan on provider/region and account/budget. Keep Supabase explicitly out
(no UAE region). No provisioning.
```

---

## Block F — Auth foundation (spans Weeks 1–2)

**Why self-hosted auth.** We're not using a hosted auth SaaS because user identity (PII, Emirates ID) must stay in the UAE region, and we want control and no per-user cost. So we run auth ourselves.

**Session-based, with secure cookies.** The plan is server-side sessions: a session record in the database plus an `httpOnly`, `Secure`, `SameSite` cookie holding the session id. `httpOnly` keeps JavaScript from reading it (limits XSS token theft), `Secure` keeps it to HTTPS, `SameSite` limits CSRF. Server sessions are easy to revoke (delete the row), which is safer for a web app than long-lived tokens sitting in browser storage. The specific helper library for this moves fast, so decide it during planning (current lightweight primitives, or a hand-rolled approach), the *pattern* is what matters, not the brand.

**argon2id for passwords.** Passwords are hashed with argon2id, a memory-hard algorithm that's the current best-practice for password storage. We never store plaintext or weak hashes, the reference repo storing PII in plaintext was a launch blocker, so this is non-negotiable.

**RBAC, two layers.** From the RBAC matrix: a *role guard* answers "can this role perform this kind of action," and an *ownership check* answers "is this actually the user's own resource." You need both, the reference repo had only a single admin flag, which is why a buyer could in principle touch the wrong record. This week you decide the approach and stub the model (`Role`, `Permission`) and the guard/ownership pattern; you implement it fully in Week 2.

```
Block F — start auth. This spans Weeks 1–2; Week 1 target is working
register/login locally plus RBAC stubbed.

Plan first (no code): the self-hosted auth approach with tradeoffs
(session-based with httpOnly + Secure + SameSite cookies vs alternatives), the
User and Session Prisma models, register / login / logout / session-verify
with argon2id hashing, and a stub of the RBAC model (Role, Permission) plus the
two-layer enforcement pattern (role guard + ownership check) from /docs.
Explain why self-hosted (residency), why session-based, and why argon2id. Wait
for approval, then build step by step. We implement RBAC fully in Week 2, just
lay the pattern this week.

End state (Week 1): a user can register and log in locally against a hashed
password with a valid session; the RBAC approach is decided and stubbed.
```

---

## Close-out (Block G)

Write a `README` with setup/run instructions, merge a clean PR through CI, then do the Friday timesheet and a short progress note to Jordan, and update the project status doc.

**Priority if the week gets tight:** A → B → C → D is the non-negotiable spine (a typed, tested, CI-checked monorepo with a working local database). Auth (F) may spill into Week 2, the backlog already plans for that. E is just a decision and a message, so it shouldn't crowd the spine.
