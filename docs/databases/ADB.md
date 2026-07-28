# ADB – APL Arrow Database

**Project:** Archery Performance Lab (APL)

**Document ID:** APL-DB-001

**Version:** 1.0.0

**Status:** Approved

**Authors:** Archery Performance Lab Team

**Language:** English

**License:** MIT

**Last Updated:** 2026-07-29

---

# 1. Purpose

The APL Arrow Database (ADB) is the official arrow component domain of Archery Performance Lab.

ADB provides a standardized, versioned and extensible repository for every component used to build an arrow configuration.

Its objectives are:

- ensure technical consistency
- eliminate duplicated definitions
- validate component compatibility
- simplify user configuration
- support performance analysis
- preserve historical information

ADB stores technical component definitions only.

Athlete configurations are managed by the Arrow Setup entity defined in the APL Data Model.

---

# 2. Scope

ADB manages every component related to arrow construction.

The domain includes:

- Arrow Shafts
- Points
- Inserts
- Pins
- Bushings
- Nocks
- Vanes
- Wraps
- Adhesives (optional)
- Compatibility Rules

ADB does not store athlete-specific configurations.

---

# 3. Architecture

ADB is a functional domain composed of independent entities.

```text
ADB
│
├── ArrowShafts
├── Points
├── Inserts
├── Pins
├── Bushings
├── Nocks
├── Vanes
├── Wraps
├── Adhesives
└── Compatibility
```

Each entity owns its own data model.

Relationships are managed by ACE.

---

# 4. Design Principles

ADB follows the architecture principles defined by APL.

- Component-oriented
- Modular
- Extensible
- Versioned
- Immutable identifiers
- Technology independent
- Compatible with APL-STD-001

Each entity may evolve independently.

---

# 5. ArrowShaft Entity

Represents every arrow shaft available inside APL.

Stores:

- UUID
- APL Component ID
- Manufacturer
- Product Family
- Product Series
- Variant
- Spine
- Material
- Profile
- Outer Diameter
- Inner Diameter
- GPI
- Maximum Length
- Recommended Point Range
- Compatible Components
- Verification Status
- Release Date
- End of Production (optional)

---

# 6. Shaft Profile

Supported values

- Barrelled
- Parallel

Future profiles may be introduced without changing the architecture.

---

# 7. Point Entity

Stores:

- UUID
- APL Component ID
- Manufacturer
- Product Family
- Material
- Weight
- Length
- Diameter
- Compatible Shafts

Supported materials include:

- Stainless Steel
- Tungsten
- Brass
- Aluminum

---

# 8. Insert Entity

Stores:

- UUID
- APL Component ID
- Manufacturer
- Model
- Material
- Weight
- Thread Type
- Compatible Shafts

---

# 9. Pin Entity

Stores:

- UUID
- APL Component ID
- Manufacturer
- Model
- Material
- Weight
- Compatible Shafts
- Compatible Nocks

---

# 10. Bushing Entity

Stores:

- UUID
- APL Component ID
- Manufacturer
- Material
- Weight
- Compatible Shafts
- Compatible Nocks

---

# 11. Nock Entity

Stores:

- UUID
- APL Component ID
- Manufacturer
- Model
- Size
- Material
- Weight
- Color
- Compatible Pins
- Compatible Bushings

---

# 12. Vane Entity

Stores:

- UUID
- APL Component ID
- Manufacturer
- Model
- Material
- Length
- Height
- Weight
- Shape
- Recommended Offset
- Recommended Helical

---

# 13. Wrap Entity

Stores:

- UUID
- APL Component ID
- Manufacturer
- Length
- Width
- Thickness
- Weight
- Color

---

# 14. Adhesive Entity (Optional)

Stores:

- UUID
- APL Component ID
- Manufacturer
- Product
- Type
- Intended Use

This entity is optional and may be expanded in future releases.

---

# 15. Compatibility Entity

Compatibility is managed as an independent entity.

Relationships include:

- Shaft ↔ Point
- Shaft ↔ Insert
- Shaft ↔ Pin
- Shaft ↔ Bushing
- Pin ↔ Nock
- Bushing ↔ Nock
- Shaft ↔ Vane (recommendation)

Compatibility rules are validated by ACE.

---

# 16. Automatic Population

When the user selects:

Manufacturer

↓

Product Family

↓

Series

↓

Variant

↓

Technical Specification

APL automatically retrieves every available technical property from ADB.

Manual data entry is minimized.

---

# 17. Verification Status

Each component stores its verification level.

Supported values:

- Manufacturer Verified
- APL Verified
- Community Verified
- Experimental
- Deprecated

Verification history shall be preserved.

---

# 18. Versioning

Every entity supports versioning.

Technical revisions generate new entity versions.

APL Component IDs remain immutable.

Historical information is never deleted.

---

# 19. Relationship with Other Domains

ADB interacts with:

AMD

Manufacturer information

↓

AED

Equipment compatibility

↓

APD

Performance analysis

↓

AKB

Technical knowledge

↓

AKG

Knowledge relationships

ADB never communicates directly with other domains.

All interactions are managed by ACE.

---

# 20. References

APL_SYSTEM_ARCHITECTURE.md

APL_DATA_MODEL.md

APL-STD-001 – Component Identification Standard

Future references:

APL-STD-002 – Arrow Database Standard

---

End of Document
