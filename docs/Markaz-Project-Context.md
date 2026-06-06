# Markaz — Project Context & Working Memory

**Last updated:** 5 June 2026
**Maintained by:** Tania (lead product + sole engineer)

> Read this first in any new working session. It is the single source of truth for what we are building, the decisions made so far, where every artifact lives, and what happens next. Update the "Status" line and the decisions log whenever something changes.

---

## 1. What Markaz is

Markaz is a UAE real-estate platform built as two connected products plus a flywheel:

- **Markaz Home** — a transaction-aware property marketplace (buy, sell, rent) for Dubai and eventually wider UAE. Differentiators: it owns the transaction (not just the listing), surfaces investment-grade data (ROI/IRR/price per sqft) on every listing, and charges no seller commission.
- **Markaz Invest** — a regulated fractional-ownership product. Properties are held in SPVs, tokenised, and sold to KYC-verified investors who earn rental dividends and can trade on a secondary market.
- **The flywheel** — Invest-funded properties exit through Home with a "Markaz Certified" badge and an exclusive listing window. Home generates trusted users with capital for Invest; Invest creates premium inventory for Home.

Launch geography: Dubai / Abu Dhabi.

---

## 2. Current scope decision (the most important section)

- **The MVP is Markaz Home only.** Invest is **not** in this build. Tania may start pieces of it if time allows, but it is not committed.
- **Groundwork is built to be Invest-ready** so adding Invest later is not a rebuild (see the design rules in section 7).
- **Target:** a pilot-ready Home in roughly **8 weeks** (end of July 2026). The client-facing commitment is phrased as **8–12 weeks** to leave buffer.
- **Resourcing:** Tania solo, **20–25 hrs/week**, rate **AED 92 / USD 25 per hour**, weekly billing with a Friday timesheet, scope agreed at the start of each week.
- **Eventual full scope** (beyond MVP): customer-facing web portal, mobile app, admin back-office panel.

---

## 3. The people

- **Jordan** — founder, authored the user stories, primary recipient of the questions.
- **Matt, Nick** — founders (the kick-off email is addressed to Jordan and Matt).
- **Tania** — lead product and sole engineer.
- **Legal / counsel** — needed for data residency, hold-vs-record funds, the Invest regulator choice, Form A e-signature enforceability, and joint-ownership signing.

---

## 4. Source materials and artifacts (where everything lives)

**From the founder / prior analysis:**
- **User Stories Workshop** — Jordan's original, 20 stories (11 Home, 8 Invest, 1 flywheel). The canonical source; all questions trace back to it.
- **Scope of Work** — derived document: exec summary, actors, product breakdown, property lifecycle, property-first data model, the seven-stage transaction tracker, money flows. **Status: needs a cleanup pass** (a few typos, e.g. "SPV that owns a single platform" should read "single property"; a duplicated NOC line; and the five design rules should be folded into the data-model section).
- **Open-Questions bank** — 50 questions with P0/P1/P2 priorities, receipts, and owners. **Internal backlog only**, never handed to Jordan raw. This is the safety net we draw Round 2 from.
- **22 working-session docs** — per-story deep dives plus 7 cross-cutting issues. **Internal reference only.**

**Produced for sending:**
- **Round 1 questions doc** (for Jordan) — current and accuracy-checked.
- **Kick-off email** (to Jordan + Matt) — engagement terms.
- **Week-1 plan email** (to Jordan) — how we work, Round 1/Round 2 explained, week-1 build plan, setup items needed.
- **WhatsApp nudge** — short heads-up to send alongside the emails.
- **Setup & organisational checklist** — 25 setup tasks (Task / Description / Why We Need / Who Can Set Up / Cost / Required for MVP), grouped in dependency order. Lives in 6. Tech.

---

## 5. How we run decisions (the round structure)

- **Round 1 (now):** 9 build-blocking / foundation questions + 1 parallel jurisdiction item. Goes to Jordan with the SoW as context. Answers gate the build.
- **Round 2 (after Round 1 answers):** see section 8. Not a fixed list; it is whatever survives Round 1, asked just-in-time, feature by feature.
- **Round 3 (parked):** everything Markaz Invest, picked up on its own legal/licensing timeline.
- **Engineer decisions + design rules:** communicated to Jordan over **WhatsApp once he confirms Groups 1–4**, not placed in the formal questions doc.

---

## 6. Round 1 questions (summary + recommendations)

Canonical version lives in the Round 1 questions doc. Summary for quick recall:

1. **Revenue on a commission-free Self-Service sale** — what Markaz charges and who pays. (No rec; business call.)
2. **Is Premium Managed in the pilot?** — Rec: leave it out, ship Self-Service only.
3. **Buyer platform/agency fee?** — (No rec; business call.)
4. **One seller account, multiple properties?** — Rec: one-to-many.
5. **Jointly owned properties?** — Rec: model multiple owners now; one primary signer for the pilot.
6. **UAE-residents-only or non-resident sellers?** — Rec: residents only for the pilot.
7. **Does Markaz hold money or only record it?** — Rec: record, don't hold (avoids payment licensing). Legal call.
8. **Must all data be hosted in the UAE?** — Rec: default to a UAE region. Legal call.
9. **Manual ops or system integration for the gated steps?** — Rec: manual for the pilot. (Form A still needs a valid e-signature.) **This is the highest-leverage answer; it collapses most of Round 2.**

**Parallel item (not a build-blocker):** Which regulator for Invest — ADGM (FSRA) or DIFC (DFSA)? Start now because the legal lead time is long.

---

## 7. Decisions locked and engineer-owned

**Engineer-owned (no founder input needed):**
- Property identifier: internal ID with the DLD Title Deed number (or Oqood for off-plan) stored alongside.
- Real role-based access control from the start (Admin, Operations, Agent, Compliance, Support), not a single admin flag. Buyers cannot see Title Deeds or identity documents.
- The transaction tracker is a configuration-driven, auditable workflow engine, not hardcoded step logic.

**Invest-aware design rules (locked now so Home never needs a rebuild for Invest):**
1. Property-first data model: the property is permanent; listings, transactions, tenancies are time-bounded relationships on it.
2. Ownership is a relationship, and an owner can be a person or an entity, so an Invest SPV slots in later with no schema change.
3. One workflow engine runs the Home tracker now and the Invest fundraise/exit flows later.
4. A double-entry ledger from day one, even though Home only records money; Invest holds funds and uses the same ledger.
5. Identity is built to be reused, so a verified Home user carries into Invest later.

---

## 8. Round 2 plan (how it works once Round 1 lands)

Round 2 is **not a fixed list**; it is whatever survives Round 1.

1. **Apply Round 1 answers to the question bank.** Mark each of the 50 questions (and the working-session items) as: answered, made moot, or still open.
2. **Let the answers prune it.** Most of the bank collapses here:
   - Item 9 = manual ops → all integration-detail questions (Trakheesi API, DLD integration, per-developer NOC, KYC provider) become manual runbooks, not build questions.
   - Item 2 = Premium out → all Premium questions drop.
   - Item 7 = record, don't hold → payment-provider questions drop.
   - Item 6 = residents only → offshore/non-resident questions drop.
   - Items 4 and 5 settle the core data-model questions.
3. **What remains is feature-shaping (P1).** Examples: ROI/IRR formula, offer threshold and counter defaults, off-plan vs completed handling, currency and language, market-data source, AI concierge scope and liability, property history and re-listing/de-duplication, document-access specifics.
4. **Ask just-in-time, feature by feature, in build order.** Small batches in the same neutral, story-referenced format as Round 1, sent as the build reaches each area. No big dump. This matches what Jordan was told to expect in the week-1 email.
5. **Log every answer in this file** (decisions log below) so nothing is lost between sessions.

The 50-question bank is the safety net: we draw each Round 2 batch from it, curated and sequenced, never handed over raw.

---

## 9. Tech and infrastructure intent

- **Web app:** Vercel.
- **Database:** a managed Postgres database; **region depends on item 8.** If data must stay in the UAE, the realistic options are AWS me-central-1 or Azure UAE.
- **Supabase caveat:** Supabase has **no UAE region** (nearest are Mumbai and Frankfurt/London), and UAE ISPs (Etisalat, Du) temporarily blocked Supabase projects in late 2025 / early 2026. So Supabase is only viable if the residency answer is not UAE-only. The kick-off email therefore does **not** name a specific database provider.
- **Accounts:** company-owned from day one (company email, company payment method), a Markaz GitHub organisation, all sized to a monthly budget cap (TBD by Jordan).

---

## 10. Open / pending items

**Awaiting Jordan:**
- Round 1 answers (especially the week-1 gating ones: Q4, Q5, Q8, Q9).
- Confirmation of engagement terms.
- Setup items: company email, company payment method, domain + DNS access, go-ahead for the GitHub org, monthly budget cap.

**To produce (Tania + Claude):**
- SoW cleanup pass (typos + fold in the design rules).
- Post-confirmation WhatsApp carrying the engineer decisions and design rules (send once Jordan confirms Groups 1–4).
- Round 2 batches (after Round 1 answers, per section 8).

---

## 10b. File organisation (where documents live in Drive)

The shared Drive is organised by **business function**, not by project. Markaz build documents therefore spread across folders 5 and 6, with engagement/contract items in 2 or 4. Mapping:

| Document | Folder |
|----------|--------|
| Project context file (this doc) | 6. Tech |
| Setup & organisational checklist | 6. Tech |
| Architecture / infrastructure / codebase docs (as created) | 6. Tech |
| User stories (Jordan's original) | 5. Requirements/workflows/user stories |
| Scope of Work + Exec Summary | 5. Requirements |
| Round 1 questions doc | 5. Requirements |
| 50-question bank + 22 working-session docs (internal only) | 5. Requirements (internal subfolder) |
| Kick-off email / agreed engagement terms | 2. Legal or 4. Accounts/Expenses/Approvals |

**Conventions:**
- Folder **5** = "what we're building" (definitions, plans, requirements). Folder **6** = "how we're building and running it" (tech execution, living state).
- Keep the polished, founder-facing requirements docs separate from the internal-only question bank and working docs (a subfolder inside 5).
- **Do not** create a separate top-level "Markaz build" or "MVP" folder — it would cut across the functional structure and cause duplication.
- **Suggested addition:** a tracking subfolder inside 6 (e.g. `6.1 Project tracking`) for living state — the decisions log, the checklist as it is ticked off, and weekly status updates — so they don't get buried among technical specs. Not urgent; worth it once weekly updates and Round 2 logs accumulate.
- Minor: the folder numbering currently sorts out of order (1, 3, 4, 2, 5, 6, 7); renumber if they are meant to read as a sequence.

---

## 11. Decisions log

Record each confirmed decision here with the date, so the project's history is never lost.

| Date | Decision | Source |
|------|----------|--------|
| 1 Jun 2026 | MVP scope = Markaz Home only; Invest deferred but groundwork built Invest-ready | Scope discussion |
| 1 Jun 2026 | Target 8 weeks internal / 8–12 weeks client-facing; solo, 20–25 hrs/week, AED 92/hr | Kick-off email |
| 5 Jun 2026 | Revenue: buyer pays 1% commission (USP, half market norm); no seller or platform fee; partner referrals per-deal | Round 1 Q1, Q3 |
| 5 Jun 2026 | Premium deferred to a later phase; buyer prospectus is standard on all listings; market reports become a future quarterly content section | Round 1 Q2 |
| 5 Jun 2026 | Sellers can hold multiple properties (one-to-many) | Round 1 Q4 |
| 5 Jun 2026 | Joint ownership: multi-owner relationship + multi-signer e-signature; transaction stage-gated until all owners sign | Round 1 Q5 |
| 5 Jun 2026 | Pilot is UAE-resident sellers only; non-resident path planned soon, identity seam left open | Round 1 Q6 |
| 5 Jun 2026 | Data residency = UAE (locked). UAE region only (AWS me-central-1 / Azure UAE / UAE VPS). Supabase ruled out | Round 1 Q8 |
| 5 Jun 2026 | External systems built behind adapter interfaces; integrate what is available now (e-sign, likely UAE PASS); licensed steps (Trakheesi, DLD) manual-recorded until approvals | Round 1 Q9 |
| 5 Jun 2026 | OPEN: holding client money (digital escrow) pending Jordan's research; interim = record-don't-hold, ledger built escrow-ready | Round 1 Q7 |
| 5 Jun 2026 | Build approach: build fresh; existing MVP repo + diagrams are reference only, not built on; Tania sole builder for full ownership and understanding | Strategy |

---

## 12. Glossary (UAE real-estate and Invest terms)

- **Trakheesi** — DLD's listing-permit system; every Dubai listing needs a permit number.
- **Form A** — RERA listing agreement the seller signs to list.
- **Form F** — RERA-standard binding sale contract (the MOU) signed by buyer and seller.
- **Oqood** — off-plan property registration (vs a Title Deed for completed property).
- **DLD** — Dubai Land Department; owns the Title Deed registry, charges the 4% transfer fee.
- **RERA** — Real Estate Regulatory Agency (under DLD); licenses agents.
- **Ejari** — Dubai's tenancy-contract registration system.
- **NOC** — No Objection Certificate from the developer, required before a transfer; varies by developer.
- **DEWA** — Dubai Electricity and Water Authority (move-in services).
- **Trustee Office** — DLD-approved office that handles transfer paperwork and can hold the deposit.
- **SPV** — Special Purpose Vehicle; the legal entity that holds an Invest property.
- **NAV** — Net Asset Value per token.
- **Carry** — the platform's share of investment gains above a hurdle, on the Invest side.
- **ADGM / FSRA** — Abu Dhabi Global Market and its regulator. **DIFC / DFSA** — the Dubai equivalent. Two different free zones and rule books; the Invest jurisdiction question is choosing between them.

---

## Status (update this line each session)

**As of 5 Jun 2026:** Round 1 answered by Jordan and decisions logged (section 11). Two items remain open: holding client money (Q7, Jordan researching digital escrow) and integration strategy (Q9, a call to be scheduled). Build approach set: fresh build, existing repo and diagrams as reference only, Tania sole builder. Design diagram set complete (system context, container, ERD, transaction + offer state machines, sequence flows). Next: reply to Jordan, first-call agenda, then the build roadmap.
