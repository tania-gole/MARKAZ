# Markaz Home — Build Roadmap to Pilot

**Goal:** a pilot-ready Markaz Home in roughly **8 weeks** (target end of July 2026). The client-facing commitment is **8–12 weeks** to leave buffer.
**Approach:** built fresh, foundation first, then the Home journey, with every external system behind an adapter. One engineer at ~20–25 hrs/week. English only for the pilot.

---

## Timeline

```mermaid
gantt
    title Markaz Home — 8 weeks to pilot
    dateFormat YYYY-MM-DD
    axisFormat %d %b
    section Foundation
    Monorepo, UAE infra, auth + RBAC               :f1, 2026-06-09, 7d
    Data model, ledger, workflow engine, adapters  :f2, after f1, 7d
    Foundation ready                               :milestone, m1, after f2, 0d
    section Core Home flow
    Listing flow, documents, Form A e-sign         :c1, after f2, 7d
    Search, listing detail, buyer prospectus       :c2, after c1, 7d
    Offers, atomic acceptance, transaction tracker :c3, after c2, 7d
    Demo-ready (core journey end to end)           :milestone, m2, after c3, 0d
    section Depth + hardening
    Transaction stages, docs, ledger, admin panel  :d1, after c3, 7d
    Notifications, security hardening, audit log    :d2, after d1, 7d
    Pilot candidate                                :milestone, m3, after d2, 0d
    section Pilot prep
    Tests, deploy to UAE staging, fixes, buffer    :p1, after d2, 7d
    Pilot-ready                                    :milestone, m4, after p1, 0d
```

---

## What each phase delivers

### Weeks 1–2 · Foundation → *Milestone: Foundation ready*
The groundwork that makes everything after it fast, and keeps Home ready for Invest later.
- Fresh monorepo (web, admin, mobile-later apps; core, db, types, adapters packages), strict TypeScript, linting, CI.
- Infrastructure in a **UAE region**: PostgreSQL and encrypted document storage; self-hosted auth with **real role-based access control**.
- The **property-first data model** with ownership as a relationship (supports joint ownership now and entities/SPVs later).
- The **double-entry ledger** and the **configurable workflow engine** as reusable foundations.
- **Adapter interfaces** for every external system (e-signature, identity, Trakheesi, DLD, payment).

### Weeks 3–5 · Core Home flow → *Milestone: Demo-ready*
The end-to-end journey a seller and buyer actually experience.
- **Week 3:** sellers list one or more properties, upload access-controlled documents, and sign Form A through the real e-signature integration. *(MKZ-H-001)*
- **Week 4:** buyers search and filter listings, open detail pages with investment data, and see the **buyer prospectus**, standard on every listing. *(MKZ-H-003, H-006)*
- **Week 5:** buyers make offers; sellers accept; acceptance **atomically** creates the tracked transaction and the progress tracker goes live. *(MKZ-H-004, H-005)*
- At this point the full journey is demonstrable, with the licensed government steps shown as they will work on go-live.

### Weeks 6–7 · Depth + hardening → *Milestone: Pilot candidate*
- **Week 6:** the transaction moves through its stages (deposit, NOC, transfer, handover) recorded behind adapters; per-stage documents; the ledger recording the 1% commission and movements; the **admin / operations panel** (pipeline + verifications). *(MKZ-H-005, H-007)*
- **Week 7:** email notifications; a full **security pass** (every endpoint guarded, file-upload controls, rate limiting, audit logging); the revenue / operations dashboard. *(MKZ-H-007, H-008)*

### Week 8 · Pilot prep → *Milestone: Pilot-ready*
- Integration tests on the two spine flows, bug-fixing, a data-residency and security review, deployment to a UAE-region staging environment, and buffer.

---

## Assumptions
- One engineer at ~20–25 hrs/week; the foundation is built before features.
- Licensed government steps (Trakheesi, DLD) are manual and recorded for the pilot; e-signature and likely UAE PASS are integrated.
- English only; Arabic is a later phase.

## Risks & dependencies
- **The foundation is the main schedule risk.** Building it properly (data model, ledger, workflow engine) is what protects Invest later, but it compresses feature time if it overruns. The 8–12 week client-facing range absorbs this.
- **Two open decisions:** holding client money (research in progress) and integration prioritisation against the licensing timeline (call pending). Neither blocks the foundation; both shape the later integration work.
- Feature-level details are confirmed just-in-time as each feature is reached, rather than all up front.
