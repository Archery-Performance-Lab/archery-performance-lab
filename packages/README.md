# Packages

## Purpose

The `packages` workspace contains every reusable module of APL.

Applications must never implement business logic directly.

Every feature must belong to one package.

---

## Package Groups

### Core

Shared runtime infrastructure.

### Domains

Business domains.

### Shared

Utilities shared across the platform.

### UI

Reusable user interface components.

### SDK

Public client libraries.

### Standards

Implementation of APL standards.

### Types

Common TypeScript definitions.

### Config

Shared configuration.

---

## Architectural Rule

Applications depend on Packages.

Packages never depend on Applications.

---

## Related Documents

AMD

ADR-002

ADR-006

APL-STD-001

---

## Status

Planned