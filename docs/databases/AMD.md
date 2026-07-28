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

AMD centralizes information about manufacturers and their product catalogs.

Its objectives are:

- provide a single source of manufacturer information
- standardize manufacturer identification
- organize product hierarchies
- manage product lifecycle
- support automatic component selection
- eliminate duplicated manufacturer data

AMD stores manufacturer information only.

Technical specifications are managed by the appropriate component domains.

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

Relationships are managed by ACE.

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
- Website
- Logo
- Description
- Foundation Year (optional)
- Status
- Verification Status

Manufacturer Code is unique.

Example:

EA = Easton

WIN = Wiawis

SKY = Skylon

---

# 6. Brand Entity

Some manufacturers own multiple brands.

The Brand entity stores:

- UUID
- Brand Name
- Parent Manufacturer
- Website
- Status

Example:

Manufacturer

↓

Brand

↓

Products

---

# 7. Product Category

Defines the main product classification.

Examples:

- Arrow Shafts
- Points
- Inserts
- Pins
- Nocks
- Vanes
- Risers
- Limbs
- Strings
- Sights
- Stabilizers
- Accessories

---

# 8. Product Family

Represents a commercial product family.

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

Families belong to one Product Category.

---

# 9. Product Series

Represents a specific generation or series within a family.

Examples:

3.2

4.0

25"

27"

68"

Series definitions depend on the product category.

---

# 10. Product Variant

Represents technical variations.

Examples:

Barrelled

Parallel

Foam

Wood

Right Hand

Left Hand

Variants are category-dependent.

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

Lifecycle information allows APL to:

- identify obsolete products
- preserve historical configurations
- warn users about discontinued components
- maintain compatibility with historical data

Lifecycle history shall be preserved.

---

# 12. Official Resources

Stores references to manufacturer documentation.

Examples:

- Product Catalogs
- Technical Manuals
- Specification Sheets
- Official Images
- Product Pages

Resources are versioned whenever possible.

---

# 13. Product Hierarchy

Products are organized using a hierarchical structure.

```text
Manufacturer
│
├── Category
│   ├── Family
│   │   ├── Series
│   │   │   └── Variant
```

This hierarchy is used throughout APL for guided selection.

---

# 14. Automatic Selection

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
```

After selection, ACE retrieves technical information from the appropriate domain.

Example:

Arrow → ADB

Equipment → AED

---

# 15. Versioning

Manufacturers and product structures support versioning.

Historical data are never overwritten.

Changes create new revisions while preserving previous records.

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

# 17. Relationship with Other Domains

AMD provides manufacturer information to:

- ADB
- AED
- APD
- AKB
- AKG

AMD never exchanges data directly.

All interactions are coordinated by ACE.

---

# 18. References

APL_SYSTEM_ARCHITECTURE.md

APL_DATA_MODEL.md

APL-STD-001 – Component Identification Standard

ADB.md

AED.md

---

End of Document
