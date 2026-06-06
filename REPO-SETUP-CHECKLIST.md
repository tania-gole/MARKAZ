# Markaz — repo setup checklist

The orchestration from empty directory to ready-for-the-first-feature. Phases 0-2 are organisation (fast); Phase 3 is the actual foundation build (the Week 1 guide carries the detail); Phase 4 is the gate; Phase 5 is where features begin.

> Work each block in Claude Code in mentor mode: ask for a plan, approve it, then write the code yourself. The detailed per-block explanations and prompts are in `Markaz-Week-1-Setup-Guide.md`.

---

## Phase 0 — Create the folder skeleton

- [ ] Create a fresh repo `markaz/` (not inside the old MVP). `git init`.
- [ ] Create the top-level shape: `apps/`, `packages/`, `infrastructure/docker/`, `docs/`, `tests/`, `.github/workflows/`, `.claude/`.
- [ ] Create the app folders: `apps/web/`, `apps/admin/`.
- [ ] Create the package folders: `packages/{core,db,types,adapters,auth,ui,notifications,config,i18n}/`.
- [ ] Create the docs folders: `docs/{architecture/decisions,diagrams,stories,process-flows}/`.
- [ ] (You can create empty folders now and let each block fill them, or let the Block A prompt scaffold them. Either works.)

## Phase 1 — Drop in the context

- [ ] Put `CLAUDE.md` at the repo root.
- [ ] Copy all diagram files into `docs/diagrams/` (the 10 Mermaid files + the index README).
- [ ] Put the story spec in `docs/stories/` (MKZ-H-001).
- [ ] Put `Markaz-Project-Context.md` in `docs/` as the living decision log.
- [ ] Add a short `README.md` at the root (what the repo is, how to run, links to `docs/`).

## Phase 2 — Wire up Claude Code functionalities

From `claude-code-templates/` (see its README for placement):

- [ ] `.claudeignore` at root.
- [ ] `.claude/settings.json` at root (permissions + post-edit lint hook). Verify the hooks schema against current Claude Code docs.
- [ ] `.mcp.json` at root with the GitHub server. **Do not add Supabase.** Verify the current GitHub MCP server config.
- [ ] Copy `CLAUDE.local.md.example` to `CLAUDE.local.md`; add `CLAUDE.local.md` to `.gitignore`.
- [ ] Plan to add a scoped `CLAUDE.md` inside each app/package *as you build it* (`apps/web/CLAUDE.md`, `packages/db/CLAUDE.md`, etc.), not all up front.
- [ ] Note for later (not now): a `prisma-migration` skill, a `core-domain-module` skill, and a `code-reviewer` subagent, once the patterns exist to encode.
- [ ] Run `/init` in Claude Code if you want it to confirm it has picked up CLAUDE.md and the settings.

## Phase 3 — Build the foundation (Week 1-2)

Detail and prompts in `Markaz-Week-1-Setup-Guide.md`. Order matters.

- [ ] **Block A — monorepo skeleton** (BL-001): pnpm workspace, turbo.json, the app/package wiring with `workspace:*`. *Done when `pnpm install` resolves and `turbo run build` walks the graph.*
- [ ] **Block B — tooling & gates** (BL-002): strict `tsconfig.base.json`, ESLint + Prettier, Vitest baseline, CI workflow. *Done when `turbo run typecheck lint test` is green and CI passes a PR.*
- [ ] **Block C — apps wired**: `apps/web` and `apps/admin` minimal, plus a shared Zod type imported across packages. *Done when both run under `pnpm dev` and the shared type imports cleanly.*
- [ ] **Block D — local DB & migrations** (BL-003): docker-compose Postgres, Prisma init, one migration, client exported from `db`, a query through `core`. *Done when a migration applies and a query returns.*
- [ ] **Block E — prod infra decision** (BL-003): write `docs/infra.md` (Vercel + UAE-region Postgres options + storage), flag provider/region + account/budget to Jordan. No provisioning.
- [ ] **Block F — auth started** (BL-004, spans wk1-2): self-hosted session auth (argon2id, secure cookies), `User`/`Session` models, register/login/logout, RBAC model + two-layer pattern stubbed. *Done (wk1) when a user can register and log in locally.*

Then in Week 2: finish RBAC, the property-first data model + migrations (BL-005), the double-entry ledger skeleton (BL-006), the config-driven workflow engine + event log (BL-007), and the adapter interfaces with manual/stub impls (BL-008).

## Phase 4 — Foundation done (the gate)

Do not start features until all of these are true:

- [ ] `pnpm dev` runs both apps; `turbo run typecheck lint test` is green; CI passes.
- [ ] Migrations apply cleanly to a fresh database; the Prisma client generates.
- [ ] The property-first data model exists (Property, Ownership, User/identity, Listing, Offer, Transaction, TransactionEvent, Document, LedgerEntry).
- [ ] Auth works (register/login/session) with hashed passwords; RBAC enforces role guard + ownership check.
- [ ] The workflow engine can run a trivial state machine and write an append-only event.
- [ ] The double-entry ledger can record a balanced entry.
- [ ] Adapter interfaces exist for e-sign, identity, government, payment, with manual/stub impls.
- [ ] Secrets are in env, not committed; no PII is logged; admin endpoints are guarded.
- [ ] **(wk2) Foundation-ready milestone reached.**

## Phase 5 — Move to the first feature

- [ ] Open `docs/stories/Markaz-H-001-Story-Breakdown.md`.
- [ ] Confirm the H-001 Round 2 questions with Jordan (identity method, manual ownership, photos) before building.
- [ ] Add `apps/web/CLAUDE.md` scoped to the listing flow.
- [ ] Build MKZ-H-001 on the foundation: the listing state machine runs on the workflow engine you just built.

---

**Reality check:** Phases 0-2 are an afternoon. Phase 3 is the real work (one to two weeks). Don't let the organising phases expand to fill the time, the value is in the foundation build and then H-001.
