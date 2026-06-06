# Data model — ERD

Property-first model. Ownership is a relationship (N owners; person now, SPV later). Append-only TRANSACTION_EVENT and double-entry LEDGER_ENTRY are there from day one. DOCUMENT attaches to a property, listing, or transaction (nullable FKs in practice).

```mermaid
erDiagram
    USER ||--o{ SESSION : has
    USER ||--o{ OWNERSHIP : "owner in"
    PROPERTY ||--o{ OWNERSHIP : "owned via"
    USER ||--o{ USER_ROLE : assigned
    ROLE ||--o{ USER_ROLE : "granted to"
    ROLE ||--o{ ROLE_PERMISSION : has
    PERMISSION ||--o{ ROLE_PERMISSION : in
    PROPERTY ||--o{ LISTING : "listed as"
    LISTING ||--o{ OFFER : receives
    USER ||--o{ OFFER : "makes (buyer)"
    LISTING ||--o| TRANSACTION : "results in"
    OFFER ||--o| TRANSACTION : "accepted into"
    TRANSACTION ||--o{ TRANSACTION_EVENT : logs
    TRANSACTION ||--o{ LEDGER_ENTRY : records
    PROPERTY ||--o{ DOCUMENT : has
    LISTING ||--o{ DOCUMENT : has
    TRANSACTION ||--o{ DOCUMENT : has

    USER {
        uuid id PK
        string email
        string phone
        string emiratesId "PII - access controlled"
        string residencyStatus
        datetime createdAt
    }
    SESSION {
        uuid id PK
        uuid userId FK
        datetime expiresAt
    }
    ROLE {
        uuid id PK
        string name "Operations|Compliance|Support|Admin"
    }
    PERMISSION {
        uuid id PK
        string action
        string resource
    }
    USER_ROLE {
        uuid userId FK
        uuid roleId FK
    }
    ROLE_PERMISSION {
        uuid roleId FK
        uuid permissionId FK
    }
    PROPERTY {
        uuid id PK
        string type
        int bedrooms
        decimal sizeSqft
        string location
        string deedRef "Title Deed or Oqood"
        datetime createdAt
    }
    OWNERSHIP {
        uuid id PK
        uuid propertyId FK
        uuid ownerId FK "person now, SPV later"
        decimal share
    }
    LISTING {
        uuid id PK
        uuid propertyId FK
        decimal askingPrice
        string status "Draft..Live"
        string tier "Self-Service"
        decimal minNotificationPrice
        datetime createdAt
    }
    OFFER {
        uuid id PK
        uuid listingId FK
        uuid buyerId FK
        decimal amount
        string financingMethod "cash|mortgage"
        string status "submitted..accepted"
        datetime expiresAt
    }
    TRANSACTION {
        uuid id PK
        uuid listingId FK
        uuid offerId FK
        string status "MOU..Completed"
        datetime createdAt
    }
    TRANSACTION_EVENT {
        uuid id PK
        uuid transactionId FK
        string fromState
        string toState
        uuid actorId FK
        string reason
        datetime createdAt
    }
    LEDGER_ENTRY {
        uuid id PK
        uuid transactionId FK
        string account
        decimal debit
        decimal credit
        string currency "AED"
        datetime createdAt
    }
    DOCUMENT {
        uuid id PK
        string type "TitleDeed|Oqood|FormA"
        string storageKey
        string accessLevel
        uuid uploadedById FK
        datetime createdAt
    }
```
