# ADR-001 – Separation of Equipment and Accessories Domains

**Project:** Archery Performance Lab (APL)

**ADR ID:** ADR-001

**Status:** Accepted

**Date:** 2026-07-29

**Decision Makers:** Archery Performance Lab Team

---

# Context

During the design of the APL Equipment Database (AED), it emerged that some entities represented physical components permanently mounted on the bow, while others represented personal equipment used by the athlete.

Initially, all these elements were grouped within the same domain.

As the project evolved, it became evident that this approach mixed two conceptually different categories.

---

# Decision

APL separates bow-mounted equipment from athlete accessories into two independent domains.

## AED – APL Equipment Database

AED manages only components physically mounted on the bow.

Examples:

- Risers
- Limbs
- Strings
- Arrow Rests
- Buttons
- Sights
- Clickers
- Stabilizer System
- Dampers
- Weights
- V-Bars
- Extenders
- Side Rods

---

## AAD – APL Accessory Database

AAD manages personal equipment and accessories used by the athlete.

Examples:

- Finger Tabs
- Finger Slings
- Bow Slings
- Chest Guards
- Arm Guards
- Quivers
- Bow Stands
- Bow Cases
- Backpacks
- Binoculars
- Scopes
- Tripods
- Training Accessories

---

# Rationale

The separation improves:

- domain clarity
- scalability
- maintainability
- modularity
- future extensibility

Bow components and personal accessories have different lifecycles, compatibility rules and analytical relevance.

Keeping them in separate domains simplifies both implementation and future development.

---

# Consequences

The following changes apply:

- AED contains only bow-mounted components.
- AAD becomes a new independent domain.
- Equipment Setup references both AED and AAD when required.
- Future modules shall respect this separation.

No changes are required to APL-STD-001.

The APL Component ID remains valid for both domains.

---

# Alternatives Considered

## Alternative 1

Store every physical object inside AED.

Rejected because it mixes different conceptual domains.

---

## Alternative 2

Create a generic Equipment entity.

Rejected because it reduces modularity and complicates future extensions.

---

# References

APL_SYSTEM_ARCHITECTURE.md

APL_DATA_MODEL.md

AED.md

Future: AAD.md

---

End of ADR-001
