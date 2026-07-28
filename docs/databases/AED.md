# AED – APL Equipment Database

**Project:** Archery Performance Lab (APL)

**Document ID:** APL-DB-002

**Version:** 1.0.0

**Status:** Approved

**Authors:** Archery Performance Lab Team

**Language:** English

**License:** MIT

**Last Updated:** 2026-07-29

---

# 1. Purpose

The APL Equipment Database (AED) is the official equipment domain of Archery Performance Lab.

AED provides a standardized, versioned and extensible repository for every bow-related component managed by APL.

Its objectives are:

- standardize equipment definitions
- eliminate duplicate records
- validate compatibility
- simplify equipment configuration
- support performance analysis
- preserve historical data

AED stores technical component definitions only.

Athlete equipment configurations are managed by the Equipment Setup entity defined in the APL Data Model.

---

# 2. Scope

AED manages every bow-related component.

The domain includes:

- Risers
- Limbs
- Strings
- Sights
- Clickers
- Arrow Rests
- Buttons
- Stabilizers
- Dampers
- Weights
- V-Bars
- Extenders
- Side Rods
- Finger Tabs
- Slings
- Quivers
- Bow Cases
- Accessories
- Compatibility Rules

---

# 3. Architecture

AED is a functional domain composed of independent entities.

```text
AED
│
├── Risers
├── Limbs
├── Strings
├── Sights
├── Clickers
├── ArrowRests
├── Buttons
├── Stabilizers
├── Dampers
├── Weights
├── VBars
├── Extenders
├── SideRods
├── FingerTabs
├── Slings
├── Quivers
├── BowCases
├── Accessories
└── Compatibility
```

Each entity owns its own data model.

Relationships are managed by ACE.

---

# 4. Design Principles

AED follows the architecture principles defined by APL.

- Component-oriented
- Modular
- Extensible
- Versioned
- Immutable identifiers
- Technology independent
- Compatible with APL-STD-001

Each entity may evolve independently.

---

# 5. Riser Entity

Stores:

- UUID
- APL Component ID
- Manufacturer
- Product Family
- Model
- Handedness
- Length
- Material
- Weight
- Finish
- Mounting Standard
- ILF Compatibility
- Release Date
- End of Production
- Verification Status

---

# 6. Limb Entity

Stores:

- UUID
- APL Component ID
- Manufacturer
- Product Family
- Model
- Length
- Nominal Poundage
- Core Material
- Facing Material
- ILF Compatibility
- Recommended Brace Height
- Recommended String Length
- Verification Status

---

# 7. String Entity

Stores:

- UUID
- APL Component ID
- Manufacturer
- Material
- Strand Count
- Serving Material
- Center Serving Diameter
- End Serving Diameter
- Length
- Twist Range
- Verification Status

---

# 8. Sight Entity

Stores:

- UUID
- APL Component ID
- Manufacturer
- Model
- Handedness
- Extension Length
- Weight
- Micro Adjustment
- Verification Status

---

# 9. Clicker Entity

Stores:

- UUID
- APL Component ID
- Manufacturer
- Model
- Material
- Length
- Thickness
- Verification Status

---

# 10. Arrow Rest Entity

Stores:

- UUID
- APL Component ID
- Manufacturer
- Model
- Type
- Material
- Verification Status

---

# 11. Button Entity

Stores:

- UUID
- APL Component ID
- Manufacturer
- Model
- Spring Range
- Thread Size
- Weight
- Verification Status

---

# 12. Stabilizer System

The stabilizer system is divided into independent entities:

- Long Rod
- Side Rod
- Extender
- V-Bar
- Damper
- Weight

Each entity owns:

- UUID
- Component ID
- Manufacturer
- Model
- Length
- Weight
- Material
- Thread Standard
- Verification Status

---

# 13. Accessories

AED stores optional equipment such as:

- Finger Tabs
- Slings
- Quivers
- Bow Cases
- Training Accessories

Each accessory owns its own entity.

---

# 14. Compatibility

Compatibility is managed as an independent entity.

Examples:

- Riser ↔ Limbs
- Riser ↔ Sight
- Riser ↔ Button
- Riser ↔ Arrow Rest
- Limbs ↔ String
- Stabilizer ↔ Weight
- Extender ↔ V-Bar

Validation is performed by ACE.

---

# 15. Automatic Population

When the user selects:

Manufacturer

↓

Product Family

↓

Model

APL automatically retrieves all available technical specifications.

Manual data entry is minimized.

---

# 16. Verification Status

Supported values:

- Manufacturer Verified
- APL Verified
- Community Verified
- Experimental
- Deprecated

Verification history is preserved.

---

# 17. Versioning

Every entity supports versioning.

Historical revisions remain permanently available.

APL Component IDs are immutable.

---

# 18. Relationship with Other Domains

AED interacts with:

AMD

↓

ADB

↓

APD

↓

AKB

↓

AKG

All interactions are managed exclusively by ACE.

---

# 19. References

APL_SYSTEM_ARCHITECTURE.md

APL_DATA_MODEL.md

APL-STD-001 – Component Identification Standard

Future references:

APL-STD-003 – Equipment Database Standard

---

End of Document
