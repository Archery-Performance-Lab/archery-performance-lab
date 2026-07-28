# AKG – APL Knowledge Graph

**Project:** Archery Performance Lab (APL)

**Document ID:** APL-DB-006

**Version:** 1.0.0

**Status:** Approved

**Authors:** Archery Performance Lab Team

**Language:** English

**License:** MIT

**Last Updated:** 2026-07-29

---

# 1. Purpose

The APL Knowledge Graph (AKG) is the official relationship domain of Archery Performance Lab.

AKG stores semantic relationships between entities managed by APL.

Unlike traditional databases, AKG does not duplicate information.

It stores how entities are connected.

---

# 2. Scope

AKG manages relationships between:

- Athletes
- Equipment
- Arrow Configurations
- Manufacturers
- Components
- Performances
- Environmental Conditions
- Technical Rules
- Procedures
- Analytics

---

# 3. Architecture

```text
AKG
│
├── Nodes
├── Relationships
├── Relationship Types
├── Metadata
├── Inference Rules
└── History
```

Every node references an existing entity.

No operational data is stored inside AKG.

---

# 4. Design Principles

AKG follows the APL architectural principles.

- Graph-oriented
- Non-duplicative
- Traceable
- Versioned
- Explainable
- Extensible

Relationships are first-class entities.

---

# 5. Node Entity

A Node represents an existing object managed by APL.

Examples:

- Athlete
- Riser
- Limb
- Arrow Shaft
- Point
- Training Session
- Competition
- Formula
- Procedure

Each node stores:

- UUID
- Node Type
- External Reference
- Version

---

# 6. Relationship Entity

Relationships connect two nodes.

Each relationship stores:

- UUID
- Source Node
- Target Node
- Relationship Type
- Confidence
- Creation Date
- Version

Relationships are directional unless explicitly defined as bidirectional.

---

# 7. Relationship Types

Examples:

- uses
- contains
- belongs_to
- manufactured_by
- compatible_with
- measured_in
- validated_by
- calculated_from
- references
- derived_from
- recommends
- replaces

New relationship types may be introduced without modifying the graph structure.

---

# 8. Metadata

Each relationship may contain metadata.

Examples:

- Valid From
- Valid To
- Confidence Level
- Source
- Notes

Metadata allows historical reconstruction of the graph.

---

# 9. Inference Rules

Inference Rules allow ACE and AIE to derive new knowledge.

Example:

Athlete

↓

uses

↓

Equipment Setup

↓

contains

↓

Riser

↓

manufactured_by

↓

Manufacturer

APL may infer:

Athlete uses equipment manufactured by Manufacturer.

Derived relationships are never stored as permanent facts unless validated.

---

# 10. Explainability

Every inferred relationship shall be explainable.

APL must always provide:

- Source Nodes
- Relationship Chain
- Applied Rule

No hidden inference is allowed.

---

# 11. Versioning

Nodes and Relationships support versioning.

Historical graph states remain available.

No relationship is permanently deleted.

---

# 12. Relationship with AI

AIE may query AKG to:

- discover connections
- explain recommendations
- identify dependencies
- support predictive analysis

AIE cannot modify the graph directly.

Only validated operations performed through ACE may update AKG.

---

# 13. Relationship with Other Domains

AKG references:

- AMD
- ADB
- AED
- APD
- AKB

AKG stores references only.

All domain data remains owned by its respective database.

---

# 14. References

APL_SYSTEM_ARCHITECTURE.md

APL_DATA_MODEL.md

ADB.md

AED.md

AMD.md

APD.md

AKB.md

---

End of Document
