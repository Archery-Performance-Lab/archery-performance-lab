# AMD – APL Manufacturer Database

**Project:** Archery Performance Lab (APL)

**Document ID:** APL-DB-003

**Version:** 1.0.0

**Status:** Approved

**Authors:** Archery Performance Lab Team

**Language:** English

**License:** MIT

**Last Updated:** 2026-07-29

---

# 1. Purpose

The APL Manufacturer Database (AMD) is the official manufacturer domain of Archery Performance Lab.

AMD provides the centralized repository for manufacturers and their product structures.

Its objectives are to:

- provide a single source of truth for manufacturers;
- standardize manufacturer identification;
- organize product hierarchies;
- manage product lifecycle;
- support guided component selection;
- eliminate duplicated manufacturer information.

AMD stores manufacturer and product classification data only.

Technical specifications belong to the dedicated component domains (ADB, AED, AAD, etc.).

---

# 2. Scope

AMD manages:

- Manufacturers
- Brands
- Product Categories
- Product Families
- Product Series
- Product Variants
- Product Lifecycle
- Official Resources

---

# 3. Architecture

```text
AMD
│
├── Manufacturers
├── Brands
├── Categories
├── Families
├── Series
├── Variants
├── Lifecycle
└── Resources
```

Each entity owns its own data model.

Relationships are managed exclusively by ACE.

---

# 4. Design Principles

AMD follows the APL architectural principles.

- Single Source of Truth
- Modular
- Extensible
- Versioned
- Immutable Identifiers
- Technology Independent

---

# 5. Manufacturer Entity

Stores:

- UUID
- Manufacturer Code
- Official Name
- Country
- Headquarters
- Official Website
- Logo
- Description
- Foundation Year (optional)
- Status
- Verification Status

Examples of Manufacturer Codes:

- EA = Easton
- WIN = Wiawis
- SKY = Skylon
- CAR = Carbon Express
- PAN = Pandarus

Manufacturer Codes are unique.

---

# 6. Brand Entity

Some manufacturers own one or more commercial brands.

Each Brand stores:

- UUID
- Brand Name
- Parent Manufacturer
- Website
- Status

Relationship:

Manufacturer

↓

Brand

↓

Products

---

# 7. Product Category

Defines the primary classification of products.

Examples:

- Arrow Shafts
- Points
- Inserts
- Pins
- Bushings
- Nocks
- Vanes
- Risers
- Limbs
- Strings
- Sights
- Arrow Rests
- Buttons
- Stabilizers
- Accessories

---

# 8. Product Family

Represents a commercial family.

Examples:

Easton

↓

X10

↓

ACE

↓

A/C/E

Wiawis

↓

ATF-DX

↓

META DX

↓

NS-XP

Every Family belongs to one Category.

---

# 9. Product Series

Represents a specific series or generation.

Examples:

- 3.2
- 4.0
- 25"
- 27"
- 68"

The interpretation depends on the product category.

---

# 10. Product Variant

Represents technical variations.

Examples:

- Barrelled
- Parallel
- Foam
- Wood
- Left Hand
- Right Hand

Variants are category-specific.

---

# 11. Product Lifecycle

Each product includes a lifecycle status.

Supported values:

- Development
- Prototype
- Released
- Active
- Updated
- Discontinued
- Legacy

Lifecycle information enables APL to:

- identify obsolete products;
- preserve historical configurations;
- warn users when discontinued products are selected;
- maintain compatibility with historical data.

Lifecycle history shall always be preserved.

---

# 12. Official Resources

AMD stores references to official manufacturer documentation.

Examples:

- Product Catalogs
- Technical Manuals
- Specification Sheets
- Official Images
- Product Pages

Whenever possible, resources are versioned.

---

# 13. Product Hierarchy

Products are organized according to the following hierarchy.

```text
Manufacturer
│
├── Category
│   ├── Family
│   │   ├── Series
│   │   │   └── Variant
```

This hierarchy is used internally by APL to organize manufacturer catalogs.

---

# 14. Official Product Classification

APL adopts a universal product classification hierarchy.

Every physical component managed by APL shall follow the same classification model.

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

This hierarchy is mandatory for every component domain, including but not limited to:

- ADB – Arrow Database
- AED – Equipment Database
- AAD – Accessory Database
- Future component domains

The hierarchy guarantees:

- consistent identification;
- guided user selection;
- standardized APIs;
- interoperability between domains;
- long-term scalability.

No component domain may redefine this hierarchy.

Only the **Technical Specification** level may vary according to the component category.

---

# 15. Automatic Selection

AMD supports cascading selection.

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

After the selection process, ACE retrieves technical information from the appropriate component domain.

Examples:

Arrow components → ADB

Bow equipment → AED

Athlete accessories → AAD

---

# 16. Versioning

Manufacturers and product structures support versioning.

Historical information shall never be overwritten.

Every relevant modification creates a new revision while preserving previous versions.

---

# 17. Verification Status

Supported values:

- Manufacturer Verified
- APL Verified
- Community Verified
- Experimental
- Deprecated

Verification history shall always be preserved.

---

# 18. Relationship with Other Domains

AMD provides manufacturer and product classification information to:

- ADB
- AED
- AAD
- APD
- AKB
- AKG

AMD never communicates directly with other domains.

All interactions are managed by ACE.

---

# 19. References

APL_SYSTEM_ARCHITECTURE.md

APL_DATA_MODEL.md

APL-STD-001 – Component Identification Standard

ADB.md

AED.md

Future:

AAD.md

---

End of Document
