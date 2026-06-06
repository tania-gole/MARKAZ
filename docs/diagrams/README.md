# Markaz Home — diagrams

All architecture and process diagrams as Mermaid (renders on GitHub and in most editors). These are the durable, version-controlled source of the design set.

- **[01-c4-context.md](01-c4-context.md)** — C4 Level 1 — System context. Who uses Markaz Home and the external systems it touches. Government systems are manual/recorded for the pilot, not integrated.
- **[02-c4-container.md](02-c4-container.md)** — C4 Level 2 — Containers. The apps, the application layer (thin API + shared core), and the data layer. Region is set by the UAE residency decision.
- **[03-c4-component.md](03-c4-component.md)** — C4 Level 3 — Core domain & adapters. Inside packages/core and packages/adapters. The workflow engine is the only thing that reaches outward, always through an adapter. REAL / MANUAL / LATER is the integration status.
- **[04-erd.md](04-erd.md)** — Data model — ERD. Property-first model. Ownership is a relationship (N owners; person now, SPV later). Append-only TRANSACTION_EVENT and double-entry LEDGER_ENTRY are there from day one. DOCUMENT attaches to a property, listing, or transaction (nullable FKs in practice).
- **[05-listing-state-machine.md](05-listing-state-machine.md)** — Listing state machine (MKZ-H-001). The first feature on the workflow engine. The guard that matters: PendingSignature to PendingPermit needs ALL owners signed.
- **[06-transaction-lifecycle.md](06-transaction-lifecycle.md)** — Transaction state machine. The pizza tracker. Same workflow engine as the listing machine. Licensed steps (NOC, DLD transfer) are recorded manually for the pilot.
- **[07-offer-lifecycle.md](07-offer-lifecycle.md)** — Offer state machine. Offer states feeding the transaction. Accepted offers become a transaction atomically (see sequence 09).
- **[08-sequence-seller-listing.md](08-sequence-seller-listing.md)** — Sequence — Seller lists a property. End to end listing creation. Ownership verification and Trakheesi are manual Operations steps for the pilot.
- **[09-sequence-buyer-offer.md](09-sequence-buyer-offer.md)** — Sequence — Buyer offer to transaction. Search, offer, and the atomic acceptance that creates a transaction, rejects other open offers, and locks the listing in one operation.
- **[10-roadmap-gantt.md](10-roadmap-gantt.md)** — Build roadmap — 8 weeks to pilot. Foundation first (weeks 1-2), then the Home flow. Milestones at weeks 2, 5, 7, 8.
