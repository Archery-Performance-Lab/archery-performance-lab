# ADR-004 – Official Product Classification Hierarchy

**Project:** Archery Performance Lab (APL)

**ADR ID:** ADR-004

**Status:** Accepted

**Date:** 2026-07-29

**Decision Makers:** Archery Performance Lab Team

---

# Context

APL manages a wide variety of physical components, including:

- Arrow Components
- Bow Equipment
- Athlete Accessories
- Future Component Domains

During the design of AMD (APL Manufacturer Database), it became evident that every physical component should follow the same classification model.

Without a common hierarchy, each domain could introduce its own structure, resulting in inconsistent APIs, duplicated logic and reduced interoperability.

A universal product classification model was therefore required.

---

# Decision

APL adopts a single official product classification hierarchy.

Every physical component managed by APL shall follow the same structure.

```text
Manufacturer
        ↓
Category
        ↓
Family
        ↓
Series
        ↓
Variant
        ↓
Technical Specification
```

This hierarchy is mandatory across the entire platform.

---

# Definitions

## Manufacturer

The company responsible for designing or producing the product.

Examples:

- Easton
- Wiawis
- Hoyt
- Win&Win
- Beiter

---

## Category

The primary functional classification.

Examples:

- Arrow Shafts
- Points
- Risers
- Limbs
- Strings
- Sights
- Stabilizers

---

## Family

Commercial product family.

Examples:

- X10
- ACE
- META DX
- NS-XP

---

## Series

Generation or commercial series.

Examples:

- 3.2
- 4.0
- 25"
- 27"
- 68"

Series meaning depends on the category.

---

## Variant

Specific technical variation.

Examples:

- Barrelled
- Parallel
- Foam
- Wood
- Left Hand
- Right Hand

---

## Technical Specification

Stores measurable technical properties.

Examples:

Arrow Shaft:

- Spine
- Length
- Mass
- Straightness

Riser:

- Length
- Material
- Weight
- Handedness

Technical Specification is the only level whose attributes vary by category.

---

# Architecture

```text
Manufacturer
        │
        ▼
Category
        │
        ▼
Family
        │
        ▼
Series
        │
        ▼
Variant
        │
        ▼
Technical Specification
```

This hierarchy is shared by all component domains.

---

# Rationale

The hierarchy provides:

- Consistent terminology
- Standardized APIs
- Guided user selection
- Simplified database design
- Better interoperability
- Long-term scalability

---

# Consequences

All present and future component domains shall adopt this hierarchy.

Examples include:

- ADB
- AED
- AAD
- Future equipment domains

No domain may redefine or bypass the official classification.

---

# Validation

ACE validates every component according to the official hierarchy.

Incomplete classifications shall not be accepted.

---

# Exceptions

No exceptions are currently allowed.

Any future modification requires a dedicated ADR.

---

# Alternatives Considered

## Alternative 1

Allow each domain to define its own hierarchy.

Rejected because it would increase complexity and reduce interoperability.

---

## Alternative 2

Use a flat product list.

Rejected because it does not scale as the number of components increases.

---

## Alternative 3

Adopt a universal classification hierarchy.

Accepted because it ensures consistency across the entire platform.

---

# References

AMD.md

ADB.md

AED.md

APL_DATA_MODEL.md

APL_SYSTEM_ARCHITECTURE.md

ACE_CORE_ENGINE.md

---

End of ADR-004
