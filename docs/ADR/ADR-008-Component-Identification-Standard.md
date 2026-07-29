# ADR-008 – Component Identification Standard Integration

**Project:** Archery Performance Lab (APL)

**ADR ID:** ADR-008

**Status:** Accepted

**Date:** 2026-07-29

**Decision Makers:** Archery Performance Lab Team

---

# Context

APL manages a growing ecosystem of physical components, logical entities, analytical models and technical documents.

Examples include:

- Manufacturers
- Arrow Components
- Bow Equipment
- Athletes
- Performance Records
- Knowledge Items
- Algorithms
- Procedures
- Reports

As the platform expands, every entity must be uniquely identifiable across all domains.

To ensure interoperability and long-term consistency, APL requires a unified identification system.

---

# Decision

APL adopts **APL-STD-001 – Component Identification Standard** as the official identification system for the entire platform.

Every entity managed by APL shall receive a globally unique identifier (APL-ID) compliant with APL-STD-001.

The standard applies to both physical and logical entities.

---

# Scope

The identification standard applies to:

- Physical Components
- Logical Components
- Documents
- Databases
- Services
- Workflows
- Algorithms
- Analytical Results
- AI Models
- Reports
- Configuration Profiles

Future domains shall adopt the same identification model.

---

# Principles

The identification system shall be:

- Globally unique
- Human-readable
- Stable
- Persistent
- Domain-aware
- Extensible
- Technology independent

An identifier is assigned once and shall never be reused.

---

# Identifier Structure

Every identifier shall include:

- Domain Prefix
- Entity Type
- Progressive Identifier
- Optional Version Information

Example:

```text
ADB-SHAFT-000154
```

```text
AED-RISER-000087
```

```text
AKB-RULE-000042
```

```text
AIE-MODEL-000003
```

The exact syntax is defined in **APL-STD-001**.

---

# Responsibilities

Each domain is responsible for assigning identifiers to the entities it owns.

Examples:

AMD assigns identifiers to manufacturers.

ADB assigns identifiers to arrow components.

AED assigns identifiers to bow equipment.

AKB assigns identifiers to knowledge items.

AKG assigns identifiers to graph entities.

ACE validates identifier uniqueness during orchestration.

---

# Versioning

The entity identifier remains constant across versions.

Version information is managed separately.

Example:

```text
Identifier:

ADB-SHAFT-000154

Versions:

1.0

1.1

2.0
```

The identifier represents the entity.

The version represents its evolution.

---

# References Between Domains

Cross-domain relationships shall reference only official APL identifiers.

Example:

```text
Arrow Configuration

↓

ADB-SHAFT-000154

↓

ADB-POINT-000052

↓

AED-STRING-000014
```

No domain shall use internal database keys for cross-domain communication.

---

# Traceability

Every analytical result shall reference official APL identifiers.

Example:

Observation

↓

APD-SESSION-000481

↓

ADB-SHAFT-000154

↓

AED-RISER-000087

↓

AKB-RULE-000023

↓

AIE-RESULT-000114
```

This guarantees complete end-to-end traceability.

---

# Architecture

```text
          APL-STD-001
               │
               ▼
     Official Identifier
               │
 ┌─────────────┼─────────────┐
 ▼             ▼             ▼
AMD           ADB           AED
 │             │             │
 ▼             ▼             ▼
AKB           AKG           APD
               │
               ▼
              AIE
```

Every domain adopts the same identification strategy.

---

# Benefits

This decision provides:

- Global consistency
- Cross-domain interoperability
- Easier debugging
- Simplified APIs
- Long-term maintainability
- Reliable traceability
- Future-proof architecture

---

# Exceptions

No exceptions are currently permitted.

Alternative identifier systems shall not be introduced without an approved ADR.

---

# Alternatives Considered

## Alternative 1

Independent identifier formats for each domain.

Rejected because interoperability would become increasingly difficult.

---

## Alternative 2

Use database-generated primary keys only.

Rejected because internal identifiers are implementation details and unsuitable for cross-domain communication.

---

## Alternative 3

Adopt a unified identification standard.

Accepted because it guarantees consistency, interoperability and long-term maintainability.

---

# Relationship with Other ADRs

This decision complements:

- ADR-002 – Domain Communication Through ACE
- ADR-004 – Official Product Classification Hierarchy
- ADR-006 – Domain Ownership Principle
- ADR-007 – Immutable Historical Data

Together these decisions establish the identity and traceability framework of APL.

---

# References

APL-STD-001 – Component Identification Standard

APL_SYSTEM_ARCHITECTURE.md

APL_DATA_MODEL.md

ACE_CORE_ENGINE.md

AMD.md

ADB.md

AED.md

APD.md

AKB.md

AKG.md

---

End of ADR-008
