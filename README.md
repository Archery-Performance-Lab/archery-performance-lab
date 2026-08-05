<p align="center">
  <img src="assets/images/apl-logo.png" alt="Archery Performance Lab Logo" width="450">
</p>

<h1 align="center">
  Archery Performance Lab
</h1>

<p align="center">
  <strong>An Open Research Platform for Archery Performance Analytics</strong>
</p>

---
# Archery Performance Lab (APL)

## From Observation to Understanding.

> **An Open Research Platform for Archery Performance Analytics**

*"Measure before interpreting. Document before concluding."*

![Version](https://img.shields.io/badge/version-0.2.0--dev-blue)
![Status](https://img.shields.io/badge/status-Active%20Development-success)
![License](https://img.shields.io/badge/license-Apache%202.0-orange)

---

## Overview

Archery Performance Lab (APL) is an open-source research platform dedicated to the scientific analysis of archery performance.

The project provides athletes, coaches, researchers, engineers and sports scientists with a transparent, reproducible and data-driven environment for collecting, analysing and understanding archery performance.

APL does not replace coaching experience or athlete perception.

Its purpose is to support decision-making through objective measurements, traceable data and documented analytical models.

---

# Vision

To become the reference open platform for scientific research and performance analysis in archery.

APL promotes collaboration between athletes, coaches, universities, researchers and developers through an open ecosystem based on transparency, reproducibility and measurable evidence.

---

# Mission

Develop an open, modular and scientifically rigorous platform capable of integrating every relevant aspect of archery performance into a single analytical ecosystem.

The platform progressively includes:

- Athlete management
- Equipment configuration
- Arrow tuning
- Competition analysis
- Video analysis
- Environmental conditions
- Performance history
- Statistical modelling
- Research datasets

---

# Core Principles

APL is based on the following principles.

## Measure before interpreting

Measurements always take precedence over assumptions.

## Preserve original observations

Original data are never overwritten.

Every modification remains traceable.

## Models support reality

Mathematical models help explain observations.

They never replace them.

## Transparency

Every calculated value must be reproducible.

Every analytical model must be documented.

## Open Research

Knowledge grows through collaboration, transparency and reproducibility.

---

# Research Philosophy

APL distinguishes between different categories of information.

| Data Type | Description |
|-----------|-------------|
| Measured Data | Direct observations collected by users or instruments |
| Calculated Data | Values produced by deterministic mathematical models |
| Estimated Data | Values inferred when direct measurements are unavailable |
| Imported Data | Information coming from external systems |
| User Validated Data | Values explicitly confirmed by the user |

This distinction guarantees complete traceability of every analytical result.

---

# Validation Philosophy

APL does not assume that calculated values are necessarily more accurate than measured values.

Whenever differences exist between measured and calculated data, both are preserved.

Discrepancies are treated as information to investigate rather than errors to eliminate.

The user remains responsible for validating which value best represents reality.

---

# Project Modules

| Module | Description |
|---------|-------------|
| M01 | Athlete Profile |
| M02 | Bow Configuration |
| M03 | Competition Analysis |
| M04 | Arrow Tuning |
| M05 | Video Analysis |
| M06 | Environmental Conditions |
| M07 | Performance Book |
| M08 | Research Datasets |

Additional modules will be introduced as the project evolves.

---

# Repository Structure

APL is a pnpm/Turborepo monorepo.

```
archery-performance-lab/
│
├── apps/                       # User-facing applications (planned: api, web)
├── assets/                     # Logos and static images
├── docker/                     # Docker resources for local dev/deployment (planned)
├── docs/
│   ├── ADR/                    # Architecture Decision Records
│   ├── architecture/           # System, engine and interface architecture docs
│   ├── databases/              # Domain database specs (AMD, ADB, AKG, AED, APD, AKB)
│   └── standards/              # APL implementation standards
├── packages/
│   ├── core/
│   │   └── ace/                 # @apl/ace — Archery Calculation Engine
│   └── domains/
│       └── video-analysis/      # @apl/video-analysis — M06 pose/posture/phase analysis
├── scripts/                     # Automation scripts (planned)
├── tests/                       # Integration/E2E tests (planned)
├── tools/                       # Developer utilities (planned)
│
├── README.md
├── LICENSE
├── CHANGELOG.md
├── ROADMAP.md
├── MANIFESTO.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── CITATION.cff
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── .gitignore
```

---

# Development Status

Last tagged release: **v0.1.0 – Repository Foundation** (project philosophy, documentation standards, repository structure, governance principles).

Since then, development has moved into the pnpm/Turborepo monorepo under `packages/`, ahead of the next tag:

- `@apl/ace` (`packages/core/ace`) — Archery Calculation Engine: domain types, validations, and physics/tuning calculations (ballistics, FOC, kinetic energy, momentum, arrow speed, time of flight, plunger tuning). 73 unit tests.
- `@apl/video-analysis` (`packages/domains/video-analysis`, module M06) — pose estimation, shooting-phase detection, posture analysis, hand-tension and timing calculations, plus manual-annotation and video-review tooling. 66 unit tests.

139 tests pass across both packages (`pnpm test`), and `pnpm build`/`pnpm check` are clean. See `CHANGELOG.md` for the detailed, in-progress history and `ROADMAP.md` for per-milestone status (v0.2.0 content-complete, v0.3.0–v0.6.0 in progress).

---

# Roadmap

| Version | Milestone |
|----------|-----------|
| v0.1.0 | Repository Foundation |
| v0.2.0 | APL Manifesto |
| v0.3.0 | Domain Model |
| v0.4.0 | Data Model |
| v0.5.0 | Arrow Tuning Module |
| v0.6.0 | Video Analysis Module |
| v0.7.0 | Competition Analysis |
| v0.8.0 | Performance Book |
| v0.9.0 | Beta Release |
| v1.0.0 | First Stable Release |

---

# Open Science

APL follows the principles of Open Science.

The project promotes:

- Transparent methodologies
- Reproducible analyses
- Documented algorithms
- Traceable data
- Collaborative research

---

# Contributing

Contributions are welcome from:

- Athletes
- Coaches
- Researchers
- Universities
- Software developers
- Engineers
- Sports scientists

Please read the following documents before contributing:

- CONTRIBUTING.md
- CODE_OF_CONDUCT.md

---

# License

This project is distributed under the **Apache License 2.0**.

See the LICENSE file for details.

---

# Citation

If APL contributes to your research or publication, please cite the project using the provided `CITATION.cff` file.

---

# Acknowledgements

Archery Performance Lab is built upon a simple idea:

Scientific progress grows when observations, methodologies and knowledge are openly shared.

Every contribution—whether a line of code, a dataset, a technical review or an experimental result—helps improve the understanding of archery performance for the entire community.

---

# Project Motto

> **Measure before interpreting. Document before concluding.**

---

## From Observation to Understanding.

**Archery Performance Lab**

*Open Research for Better Archery.*
