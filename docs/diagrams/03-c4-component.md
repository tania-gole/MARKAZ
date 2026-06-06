# C4 Level 3 — Core domain & adapters

Inside packages/core and packages/adapters. The workflow engine is the only thing that reaches outward, always through an adapter. REAL / MANUAL / LATER is the integration status.

```mermaid
flowchart TB
    api["API / server routes (thin)"]

    subgraph core["packages/core — domain logic"]
        wf["Workflow engine<br/>state machine + event log"]
        ledger["Ledger<br/>double-entry"]
        rbac["RBAC<br/>roles + permissions"]
        roi["ROI / valuation"]
    end

    subgraph adapters["packages/adapters — integration interfaces"]
        esignA["E-sign"]
        idA["Identity"]
        govA["Trakheesi / DLD"]
        payA["Payment / escrow"]
    end

    db[("PostgreSQL")]
    store[("Document storage")]

    esignX["E-signature — REAL"]
    idX["UAE PASS — REAL if available"]
    govX["Trakheesi, DLD — MANUAL, recorded"]
    payX["Payment / escrow — LATER"]

    api --> rbac
    api --> wf
    api --> roi
    wf --> ledger
    rbac --> idA
    wf --> esignA
    wf --> govA
    wf --> payA
    core --> db
    core --> store
    esignA --> esignX
    idA --> idX
    govA --> govX
    payA --> payX
```
