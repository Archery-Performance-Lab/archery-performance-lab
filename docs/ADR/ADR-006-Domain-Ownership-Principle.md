# ADR-006 – Domain Ownership Principle

**Project:** Archery Performance Lab (APL)

**ADR ID:** ADR-006

**Status:** Accepted

**Date:** 2026-07-29

**Decision Makers:** Archery Performance Lab Team

---

# Context

APL is composed of multiple independent domains, each responsible for a specific area of knowledge or operational data.

Examples include:

- AMD – Manufacturer Database
- ADB – Arrow Database
- AED – Equipment Database
- APD – Performance Database
- AKB – Knowledge Base
- AKG – Knowledge Graph

As the architecture evolved, it became necessary to formally define ownership of domain data.

Without explicit ownership rules, multiple domains could modify the same information, leading to inconsistent data, duplicated business logic and unclear responsibilities.

---

# Decision

Each APL domain is the exclusive owner of its own data.

Only the owning domain may create, modify, validate or delete its internal records.

Other domains may access domain data only through services exposed by ACE.

Direct modification of another domain's data is strictly prohibited.

---

# Domain Ownership

Each domain owns its complete data model.

Examples:

| Domain | Owns |
|---------|------|
| AMD | Manufacturers, Brands, Categories, Families, Series, Variants |
| ADB | Arrow Components |
| AED | Bow Equipment |
| APD | Performance Records |
| AKB | Technical Knowledge |
| AKG | Relationships |

Ownership includes:

- Data structure
- Validation rules
- Versioning
- Internal consistency
- Lifecycle management

---

# Responsibilities

Each domain is responsible for:

- Data integrity
- Internal validation
- Version control
- Historical preservation
- Business rules specific to the domain

Cross-domain business logic belongs to ACE.

---

# Data Access

External domains may:

- Read data through ACE
- Request validation through ACE
- Use domain services through ACE

External domains shall never:

- Modify records directly
- Bypass validation
- Access internal persistence mechanisms

---

# Architecture

```text
                 User Interface
                        │
                        ▼
                      ACE
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
      AMD             ADB             AED
        │               │               │
        ▼               ▼               ▼
 Domain Data      Domain Data     Domain Data
```

Every domain controls its own data.

ACE coordinates communication.

---

# Rationale

The Domain Ownership Principle provides:

- Clear responsibilities
- Strong modularity
- Independent evolution
- Simplified maintenance
- Improved scalability
- Better testability

Each domain becomes an autonomous and well-defined component.

---

# Consequences

Every new domain introduced into APL shall:

- Own its own data
- Validate its own data
- Version its own data
- Preserve its own history

No domain may become responsible for another domain's information.

---

# Historical Preservation

Ownership includes historical records.

Domains shall preserve previous versions whenever applicable.

Historical information remains under the responsibility of the owning domain.

---

# Validation

Domain-specific validation is performed by the owning domain.

Cross-domain validation is coordinated by ACE.

Example:

Equipment compatibility:

- AED validates equipment data.
- ADB validates arrow data.
- ACE validates the complete configuration.

---

# Exceptions

No exceptions are currently permitted.

Future exceptions require a dedicated ADR.

---

# Alternatives Considered

## Alternative 1

Shared ownership between domains.

Rejected because responsibilities become ambiguous and maintenance complexity increases.

---

## Alternative 2

Centralized ownership inside ACE.

Rejected because ACE is an orchestration layer, not a business data owner.

---

## Alternative 3

Exclusive ownership per domain.

Accepted because it guarantees clear responsibilities, maintainability and scalability.

---

# Relationship with Other ADRs

This decision complements:

- ADR-002 – Domain Communication Through ACE
- ADR-003 – Separation of Raw Data and Derived Data
- ADR-004 – Official Product Classification Hierarchy
- ADR-005 – Explainable Analytical Model

Together these ADRs define the fundamental architectural principles of APL.

---

# References

ACE_CORE_ENGINE.md

APL_SYSTEM_ARCHITECTURE.md

APL_DATA_MODEL.md

AMD.md

ADB.md

AED.md

APD.md

AKB.md

AKG.md

---

End of ADR-006
