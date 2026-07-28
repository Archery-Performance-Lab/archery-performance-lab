# ADR-002 – Domain Communication Through ACE

**Project:** Archery Performance Lab (APL)

**ADR ID:** ADR-002

**Status:** Accepted

**Date:** 2026-07-29

**Decision Makers:** Archery Performance Lab Team

---

# Context

As the APL architecture evolved, the platform was divided into independent domains.

Examples include:

- AMD
- ADB
- AED
- APD
- AKB
- AKG

A fundamental architectural question emerged:

How should domains communicate?

Allowing direct communication between domains would simplify some implementations but would introduce strong coupling, duplicated business logic and increasing maintenance costs.

---

# Decision

APL adopts a centralized orchestration model.

Every communication between domains shall be performed exclusively through ACE (APL Core Engine).

Domains shall never communicate directly.

---

# Architecture

```text
                 User Interface
                        │
                        ▼
                      ACE
                        │
      ┌─────────────────┼─────────────────┐
      ▼                 ▼                 ▼
    AMD               ADB               AED
      │                 │                 │
      └─────────────────┼─────────────────┘
                        │
                        ▼
                      APD
                        │
                        ▼
                  AKB / AKG / AIE
```

ACE is the only component allowed to coordinate interactions between domains.

---

# Allowed Communication

Examples:

ACE

↓

ADB

ACE

↓

AED

ACE

↓

APD

ACE

↓

AKB

ACE

↓

AKG

ACE

↓

AIE

---

# Forbidden Communication

Examples:

ADB → AED

AED → APD

AMD → AKB

AKG → ADB

AIE → APD

Domains shall never invoke each other directly.

---

# Rationale

This decision provides:

- Loose coupling
- Clear separation of responsibilities
- Centralized business validation
- Easier testing
- Improved scalability
- Independent evolution of domains
- Better maintainability

---

# Consequences

Every new domain introduced into APL shall expose services through ACE.

Business rules shall be implemented in ACE whenever they involve more than one domain.

Domains remain responsible only for their own data and internal consistency.

---

# Exceptions

No exceptions are currently allowed.

Future exceptions require a dedicated ADR.

---

# Alternatives Considered

## Alternative 1

Direct domain-to-domain communication.

Rejected because it increases coupling and distributes business rules across multiple domains.

---

## Alternative 2

Shared database communication.

Rejected because it violates domain ownership and compromises modularity.

---

## Alternative 3

Event-only communication.

Deferred.

APL may introduce asynchronous event-driven communication in the future without changing the orchestration principle.

---

# References

APL_SYSTEM_ARCHITECTURE.md

ACE_CORE_ENGINE.md

APL_DATA_MODEL.md

---

End of ADR-002
