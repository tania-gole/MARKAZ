# Markaz — monorepo structure

The reconciled structure: lean enough to ship a Home pilot in eight weeks by one developer, shaped so Invest and the future slot in without a rewrite. It keeps the strong Claude Code operating layer from the reference structure and drops the parts that conflict with locked decisions (NestJS APIs, Supabase, multi-country, scaffolded Invest, scraping/ML).

## The tree

```
markaz/
├── CLAUDE.md                     # Root project brain — auto-loaded every session
├── CLAUDE.local.md               # Personal overrides — gitignored
├── .claude/
│   ├── settings.json             # Permissions + hooks (shared, committed)
│   ├── skills/                   # Custom skills — add as patterns stabilise (not week 1)
│   └── agents/                   # Subagents e.g. code-reviewer — add later
├── .mcp.json                     # External tools (GitHub). NOT Supabase.
├── .claudeignore                 # Keep noise out of context
│
├── .gitignore
├── .nvmrc                        # Pinned Node version
├── package.json                  # Root, private, workspaces
├── pnpm-workspace.yaml
├── turbo.json                    # Task pipeline (build, dev, lint, typecheck, test)
├── tsconfig.base.json            # Strict TS base, extended per package
│
├── .github/
│   └── workflows/
│       └── ci.yml                # lint -> typecheck -> test -> build on PRs
│
├── apps/
│   ├── web/                      # Markaz Home (Next.js App Router)
│   │   ├── CLAUDE.md             # Scoped context for the web app
│   │   ├── package.json
│   │   └── app/
│   │       ├── (public)/         # Search, listing detail, marketing
│   │       ├── (seller)/         # List & manage properties, offers
│   │       └── (buyer)/          # Offers, transaction tracker
│   │
│   └── admin/                    # Operations & Admin (separate app)
│       ├── CLAUDE.md
│       ├── package.json
│       └── app/
│           └── (ops)/            # Verifications, pipeline, revenue
│   # apps/invest-web/  -> future, deferred, not scaffolded now
│   # apps/mobile/      -> future (Expo)
│
├── packages/
│   ├── core/                     # Domain logic (framework-agnostic)
│   │   ├── CLAUDE.md             #   workflow engine, ledger, RBAC, ROI, listings, offers, transactions
│   │   └── ...
│   ├── db/                       # Prisma schema, migrations, client (only DB access)
│   │   ├── CLAUDE.md
│   │   └── ...
│   ├── types/                    # Shared Zod schemas + inferred TS types
│   ├── adapters/                 # Integration interfaces: e-sign, identity, gov, payment
│   ├── auth/                     # Self-hosted session auth + RBAC enforcement helpers
│   ├── ui/                       # Shared React components + design tokens
│   ├── notifications/            # Email now; push/SMS later (behind an interface)
│   ├── config/                   # Shared ESLint / TypeScript / Tailwind config
│   └── i18n/                     # English now; stub seam for Arabic/RTL later
│
├── infrastructure/
│   └── docker/
│       └── docker-compose.yml    # Local Postgres (+ MinIO for storage later)
│
├── docs/
│   ├── architecture/
│   │   └── decisions/            # ADRs — one short file per significant decision
│   ├── diagrams/                 # All Mermaid diagrams (the design set)
│   ├── stories/                  # Per-story build specs (first: MKZ-H-001)
│   ├── process-flows/
│   └── Markaz-Project-Context.md # Living source of truth + decision log
│
└── tests/
    ├── integration/
    └── e2e/
```

## Why it is shaped this way

**Apps are thin; logic lives in packages.** `apps/web` and `apps/admin` are presentation + thin route handlers. All business rules live in `packages/core`, which depends on nothing framework-specific. That keeps the logic testable in isolation and lets a future mobile app or job runner reuse it. The dependency direction is one-way: apps -> core -> db/types; nothing depends on the apps.

**Admin is its own app, not a route group.** The reference structure folded admin into the Home app as an `(admin)/` route group. We keep it separate because it has a different audience (internal ops), a different access posture (the RBAC matrix), and a cleaner security and deploy boundary. Splitting later is painful; splitting now is free. (If you ever decide the leaner single-app route-group is worth the tradeoff, that is a deliberate call to make, not a default.)

**The package set encodes the design rules.** `db` is the only thing that touches Postgres. `types` is the single definition of each shape. `adapters` is where every external system hides behind an interface (the integration pillar from Q9). `core` holds the workflow engine, ledger, RBAC, and ROI, the four things the reference repo got wrong. `auth`, `ui`, `notifications`, `config`, and `i18n` are shared concerns lifted (with renames) from the reference structure because they are genuinely useful.

**Diagrams and decisions are version-controlled (diagrams-as-code).** Mermaid in `docs/diagrams/` renders on GitHub and never goes stale in a screenshot. ADRs in `docs/architecture/decisions/` record *why* a choice was made so future-you (or a future teammate) is not guessing.

## What we took from the reference structure, and what we dropped

**Adopted (the operating layer):** the CLAUDE.md hierarchy (root + scoped per app/package), `CLAUDE.local.md`, `.claude/settings.json`, `.claudeignore`, `.mcp.json`, ADRs, the shared `config`/`ui`/`notifications` packages, and the `docs` + `tests` layout. This was the reference author's real strength.

**Dropped or deferred (conflicts with locked decisions):**
- **Separate NestJS APIs** (`home-api`, `invest-api`) -> Next.js + `core`. Less to run and deploy for a solo pilot; logic is still cleanly separated in `core`.
- **Supabase** (MCP + `infrastructure/supabase/`) -> UAE-region Postgres + Prisma. Supabase has no UAE region (Round 1 Q8).
- **Multi-country** (`tenant-config`, SingPass/myGovID adapters) -> Dubai/UAE only. The i18n and adapter seams leave room for later.
- **Scaffolded Invest** (`invest-web`, `invest-api`, tokens/kyc/yields modules) -> Invest is deferred. The architecture stays Invest-*ready* (design rules), but we do not build the apps now.
- **`data-pipeline`** (DLD fetch, Bayut scrape, ML model) -> out of scope. DLD is manual, scraping is a ToS/legal risk, and the pilot uses a simple ROI calc, not an ML model.

## How it serves MVP and future

| Future need | How this structure absorbs it |
|---|---|
| Markaz Invest | Add `apps/invest-web`; reuse `core` (workflow engine, ledger), `db` (Property + Ownership already support SPV owners), `auth`, `types`. No rewrite. |
| Holding money / escrow | The double-entry ledger already exists; swap the payment adapter from LATER to REAL. |
| Real Trakheesi/DLD/UAE PASS | Swap the manual adapter impl for a real one behind the same interface. No caller changes. |
| Mobile app | Add `apps/mobile` (Expo); it consumes the same `core` and `types`. |
| Arabic / RTL | The `i18n` seam is in place; turn it on when needed. |
| A second engineer | Scoped CLAUDE.md files, ADRs, and the design set onboard them fast; CI guards the gates. |
| Multi-country (if ever) | A `tenant-config` package can be added later; nothing here blocks it, but we do not pay for it now. |
