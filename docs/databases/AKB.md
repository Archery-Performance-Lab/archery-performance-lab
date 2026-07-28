# AKB – APL Knowledge Base

**Project:** Archery Performance Lab (APL)

**Document ID:** APL-DB-005

**Version:** 1.0.0

**Status:** Approved

**Authors:** Archery Performance Lab Team

**Language:** English

**License:** MIT

**Last Updated:** 2026-07-29

---

# 1. Purpose

The APL Knowledge Base (AKB) is the official technical knowledge domain of Archery Performance Lab.

Unlike the other databases, AKB does not store physical components or performance data.

AKB stores validated technical knowledge.

Its purpose is to transform collected data into actionable technical information.

---

# 2. Scope

AKB stores:

- Technical Rules
- Reference Values
- Tuning Procedures
- Compatibility Rules
- Calculation Models
- Engineering Formulae
- Coaching Guidelines
- Scientific References
- Best Practices
- Validation Rules

---

# 3. Architecture

```text
AKB
│
├── Technical Rules
├── Reference Values
├── Formula Library
├── Compatibility Rules
├── Procedures
├── Recommendations
├── Scientific References
├── Standards
└── Glossary
```

Each entity owns its own lifecycle.

Relationships are managed through AKG.

---

# 4. Design Principles

AKB follows these principles:

- Knowledge-oriented
- Evidence-based
- Versioned
- Traceable
- Extensible
- Source referenced
- Technology independent

Knowledge shall always be distinguishable from measured data.

---

# 5. Technical Rule Entity

Stores formal technical rules.

Examples:

- Brace Height recommendations
- Tiller recommendations
- Nocking Point procedures
- Button adjustment rules
- String twist recommendations

Each rule includes:

- UUID
- Title
- Description
- Applicability
- Source
- Confidence Level
- Version

---

# 6. Reference Value Entity

Stores validated reference ranges.

Examples:

- Recommended FOC
- Brace Height ranges
- String strand recommendations
- Recommended point weight
- Recommended arrow length

Each value includes:

- Minimum
- Maximum
- Unit
- Conditions
- Confidence Level

Reference values are not mandatory values.

They are guidance.

---

# 7. Formula Library

Stores engineering and performance formulae.

Examples:

- FOC
- Arrow Mass
- Kinetic Energy
- Momentum
- Dynamic Spine
- Arrow Speed
- Group Diameter

Each formula stores:

- Formula Name
- Mathematical Expression
- Variables
- Units
- Applicability
- References

---

# 8. Compatibility Rules

Stores compatibility knowledge.

Examples:

- Shaft ↔ Point
- Shaft ↔ Pin
- Pin ↔ Nock
- Limb ↔ String
- Riser ↔ Limb

Rules may contain:

- Mandatory compatibility
- Recommended compatibility
- Unsupported combinations

---

# 9. Procedures

Stores standardized procedures.

Examples:

- Bare Shaft Tuning
- Walk Back Tuning
- Paper Tuning
- Button Calibration
- Brace Height Adjustment
- Limb Alignment
- Center Shot Adjustment

Each procedure includes:

- Objective
- Required Equipment
- Steps
- Expected Result
- Validation Criteria

---

# 10. Recommendations

Stores coaching recommendations.

Examples:

- Beginner recommendations
- Intermediate recommendations
- Elite recommendations

Recommendations are advisory only.

They never override measured data.

---

# 11. Scientific References

Stores references to:

- Scientific papers
- Technical publications
- Manufacturer documentation
- Federation documents
- Internal validation studies

AKB stores metadata only.

Original documents remain external.

---

# 12. Standards

Stores references to:

- APL Standards
- FITA / World Archery standards
- ISO references (where applicable)
- Internal engineering standards

---

# 13. Glossary

Stores official terminology.

Every technical term has:

- Official Name
- Definition
- Synonyms
- Related Terms
- Source

The glossary ensures consistent terminology across the platform.

---

# 14. Confidence Level

Every knowledge item includes a confidence level.

Supported values:

- Manufacturer
- Scientific Literature
- Federation
- APL Validated
- Community Validated
- Experimental

Confidence level is independent from verification status.

---

# 15. Versioning

Knowledge evolves.

Historical versions are preserved.

No knowledge item is overwritten.

Superseded versions remain available for historical analysis.

---

# 16. Relationship with Other Domains

AKB provides knowledge to:

- ACE
- AIE
- AKG
- ADB
- AED
- APD

AKB never modifies operational data.

It provides technical interpretation only.

---

# 17. Relationship with AI

The Intelligence Engine (AIE) may query AKB to:

- validate recommendations
- explain calculations
- retrieve reference values
- support technical analysis

AIE shall never invent technical rules.

Every recommendation must be traceable to AKB.

---

# 18. References

APL_SYSTEM_ARCHITECTURE.md

APL_DATA_MODEL.md

APL-STD-001 – Component Identification Standard

ADB.md

AED.md

AMD.md

APD.md

---

End of Document
