# APL-STD-001 – Component Identification Standard

**Project:** Archery Performance Lab (APL)

**Document ID:** APL-STD-001

**Version:** 1.0.0

**Status:** Approved

**Authors:** Archery Performance Lab Team

**Language:** English

**License:** MIT

**Last Updated:** 2026-07-29

---

# 1. Purpose

This standard defines the universal identification framework used by Archery Performance Lab (APL) to uniquely identify every physical component managed by the platform.

The objective is to provide a permanent, human-readable and machine-readable identification system that guarantees consistency across databases, APIs, software modules and future integrations.

This document defines the common identification rules.

The technical structure of each component category is defined by its dedicated standard.

---

# 2. Scope

This standard applies to every physical component managed by APL, including but not limited to:

- Arrow shafts
- Points
- Inserts
- Pins
- Nocks
- Vanes
- Risers
- Limbs
- Strings
- Arrow rests
- Buttons
- Clickers
- Sights
- Stabilizers
- Dampers
- Weights
- Accessories

Every future component introduced into APL shall comply with this standard.

---

# 3. Design Principles

Every APL Component ID shall be:

- Unique
- Permanent
- Human readable
- Machine readable
- Stable over time
- Independent from software implementation
- Independent from user language

Commercial names may change.

Component IDs shall never change.

---

# 4. Identification Framework

Every Component ID is composed of ordered information blocks separated by hyphens.

Example

EA-X10-32-BAR-500

The first blocks identify the component family.

The remaining blocks describe the technical specification of the component.

The meaning and structure of the technical blocks depend on the specific component category and are defined by dedicated standards.

APL-STD-001 defines the framework.

Category standards define the implementation.

---

# 5. Common Identification Blocks

Every Component ID begins with a common identification section.

## Manufacturer

Manufacturer code.

Examples

EA

WIN

SKY

CAR

PAN

The official list is maintained inside AMD.

---

## Product Family

Commercial family.

Examples

X10

ACE

ATF

NS-XP

RX7

---

## Product Series

Identifies the product series or generation.

Examples

25

27

32

40

68

The meaning depends on the component type.

---

# 6. Technical Specification Blocks

After the common identification section, every component uses one or more technical specification blocks.

Their structure is NOT defined in this document.

Each component category defines its own specification.

Examples

Arrow Shaft

Manufacturer

↓

Family

↓

Series

↓

Profile

↓

Spine

---

Limb

Manufacturer

↓

Family

↓

Length

↓

Core Material

↓

Poundage

---

String

Manufacturer

↓

Material

↓

Strand Count

↓

Length

---

Point

Manufacturer

↓

Material

↓

Weight

---

Sight

Manufacturer

↓

Model

↓

Handedness

↓

Version

Each technical specification is defined by its dedicated standard.

---

# 7. Category Standards

APL Component IDs are specialized by category standards.

Examples

APL-STD-002

Arrow Database Standard

↓

Arrow shafts

↓

Points

↓

Pins

↓

Nocks

↓

Vanes

---

APL-STD-003

Equipment Database Standard

↓

Risers

↓

Limbs

↓

Strings

↓

Arrow Rests

↓

Buttons

↓

Sights

↓

Clickers

↓

Stabilizers

Future standards may define additional component categories.

---

# 8. Internal Database Keys

Every physical component owns two identifiers.

Internal UUID

Used by the software.

Never exposed to users.

APL Component ID

Visible identifier.

Stable.

Human readable.

Portable across databases.

---

# 9. Versioning

Component IDs are immutable.

If a manufacturer releases a new technical revision requiring a different specification, a new Component ID shall be created.

Historical Component IDs remain permanently valid.

APL never reuses Component IDs.

---

# 10. Validation

Every Component ID shall be validated before storage.

Validation includes:

- Manufacturer existence
- Product family existence
- Product series validity
- Technical specification validity according to the category standard

Invalid Component IDs shall be rejected.

---

# 11. Reserved Codes

The following codes are reserved.

UNK

Unknown

GEN

Generic

TMP

Temporary

SYS

System

Reserved codes are managed exclusively by ACE.

---

# 12. Extensibility

APL is designed to support future component categories.

New standards may introduce additional technical blocks without modifying this document.

Backward compatibility is mandatory.

APL-STD-001 shall remain stable.

---

# 13. Compliance

Every database managed by APL shall identify physical components using the APL Component ID.

Commercial names shall never be used as primary identifiers.

Dedicated category standards shall comply with APL-STD-001.

---

# 14. References

APL_SYSTEM_ARCHITECTURE.md

Future Standards

APL-STD-002 – Arrow Database Standard

APL-STD-003 – Equipment Database Standard

---

End of Document
