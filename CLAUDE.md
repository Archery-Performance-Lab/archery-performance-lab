# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Archery Performance Lab (APL) is an open-source, scientific research platform for archery
performance analytics ("Measure before interpreting. Document before concluding."). It's a
pnpm/Turborepo monorepo. Only two packages currently have real code — everything else in the
docs describes a much larger planned architecture (see "Docs vs. reality" below).

## Commands

Run from the repo root unless noted. Turborepo fans these out to every workspace package.

```
pnpm install       # install deps (Node >=26, pnpm >=11.18.0 required, see package.json engines)
pnpm build         # turbo run build (tsc per package)
pnpm test          # turbo run test (compiles test tsconfig, then node --test)
pnpm check         # turbo run check (tsc --noEmit)
pnpm lint          # turbo run lint (currently a no-op placeholder in both packages)
pnpm format        # prettier --write .
```

To work on a single package, `cd` into it (e.g. `packages/core/ace` or
`packages/domains/video-analysis`) and run the same script names directly with pnpm — each
package's `test` script is `tsc -p tsconfig.test.json && node --test "dist-test/test/**/*.test.js"`.

Run a single test file once compiled:
```
cd packages/core/ace   # or packages/domains/video-analysis
npx tsc -p tsconfig.test.json
node --test dist-test/test/utils.test.js
```

Tests use Node's built-in `node:test` + `node:assert/strict` — no Jest/Vitest/Mocha. There is no
watch-mode test runner; re-run the two commands above after edits.

### Manual/verification scripts (video-analysis package only)

`packages/domains/video-analysis/scripts/*.cjs` are **not** part of `pnpm test` — they're
slow, network-dependent (download BlazePose weights from tfhub.dev on first use), or
platform-specific (spawn real ffmpeg binaries). Compile first, then run directly with node, e.g.:
```
cd packages/domains/video-analysis
npx tsc -p tsconfig.test.json
node scripts/verify-pose-detector.cjs
node scripts/detect-phases.cjs right   # or left, for the draw-side wrist
```
See that package's README.md for what each script does and its argument convention
(`[right|left]` draw side is a recurring pattern across most of them).

## Repository layout

```
apps/                       # planned: api, web — no code yet (see apps/README.md)
docs/
  ADR/                      # architecture decision records — read these for *why*, not just *what*
  architecture/             # per-component specs for the full planned system
  databases/                # per-domain database specs (ADB, AED, AKB, AKG, AMD, APD)
  standards/                # APL-STD-001 component ID standard
packages/
  core/ace/                 # @apl/ace — Archery Calculation Engine (physics/tuning math)
  domains/video-analysis/   # @apl/video-analysis — M06 pose/posture/phase analysis
scripts/, tools/, tests/    # planned, currently empty placeholders (see their README.md files)
```

`pnpm-workspace.yaml` globs `apps/*`, `packages/*`, and `packages/*/*` — new packages should
live under `packages/<group>/<name>` (e.g. `packages/domains/<new-domain>`) to be picked up.

## Docs vs. reality — read this before trusting an acronym

`docs/ADR/` and `docs/architecture/` describe a much larger **target** architecture: a set of
independently-owned domains (AMD, ADB, AED, APD, AKB, AKG) all orchestrated exclusively through
a central **ACE ("APL Core Engine")**, plus an intelligence layer (AIE) and interfaces (AWI, ADI).
None of that orchestration layer exists in code yet — `apps/` and most of that domain model are
listed as "Planned" in their own README files.

The one package that *does* exist and is also called `ace` — `packages/core/ace`, the
**Archery Calculation Engine** — is a different, narrower thing: a library of pure physics/tuning
math (ballistics, FOC, kinetic energy, momentum, arrow speed, time of flight, plunger tuning). It
is not the orchestration-layer ACE described in ADR-002/ACE_CORE_ENGINE.md. Don't assume the two
are the same component just because the docs and the folder share a name — check what's actually
implemented before relying on an architecture doc's description of current behavior.

Key ADR decisions worth knowing before touching domain modeling or data flow, once that layer is
built: strict Raw Data vs. Derived Data separation with immutable raw data (ADR-003, ADR-007),
domains never call each other directly — only through the central orchestrator (ADR-002), each
domain exclusively owns its own data (ADR-006), and every analytical result must be traceable
through Observation → Interpretation → Recommendation (ADR-005).

## `@apl/ace` (packages/core/ace)

Pure, deterministic calculation engine — domain types (`types/`), input validation
(`validations/`), and physics/tuning calculators (`calculations/<topic>/calculator.ts` +
`index.ts` re-export, one folder per engine: arrow-mass, arrow-speed, foc, kinetic-energy,
momentum, plunger-tuning, time-of-flight). `ballistics/`, `biomechanics/`, `physics/`, `utils/`
hold the underlying math and unit conversions (`constants/units.ts`,
`utils/conversions.ts`). No I/O, no external dependencies beyond `typescript`/`@types/node` as
devDependencies.

## `@apl/video-analysis` (packages/domains/video-analysis)

Implements module M06 (Video Analysis) from `APL_SYSTEM_ARCHITECTURE.md`: pose estimation,
shooting-phase detection, posture analysis, hand-tension experimentation, and manual-annotation
tooling. **Read this package's own `README.md` before making non-trivial changes** — it documents,
per module, what's validated vs. provisional vs. a negative result, and is kept current as the
authoritative status log (more detailed than `CHANGELOG.md` for this package).

Working assumptions specific to this package:

- **Runs on TensorFlow.js's WASM backend** (`@tensorflow/tfjs` +
  `@tensorflow/tfjs-backend-wasm`), deliberately *not* `@tensorflow/tfjs-node` — the native
  backend is missing image-preprocessing kernels BlazePose needs. Don't add
  `@tensorflow/tfjs-node` as a shortcut.
- **No numeric thresholds are invented.** Phase-detection and posture thresholds must be derived
  from real, labeled calibration footage (see `scripts/build-calibration-dataset.cjs`), not
  guessed. Several modules are explicitly marked provisional/unvalidated in their own doc
  comments and the package README — treat those markers as load-bearing, not stale.
  `hand-tension/`'s texture-based tension metric is a documented **negative result** (paused, not
  fixed) — don't build on it as if it works.
  `phase-detection/detectShootingPhases()` only detects Anchor, Release, FollowThrough; the other
  seven `ShootingPhase` values are explicitly not detected yet, with reasons in the README.
- **Calibration/personal video data never enters this repository.** Real calibration footage
  (including footage of a minor athlete) lives outside the repo, default
  `~/Development/apl-video-calibration/`, overridable via `APL_CALIBRATION_FOLDER`. Never add
  video files or personally identifying media to the repo or to commits.
- **Browser tools under `tools/*.html` are single-file, dependency-free, no build step, no
  server** (open directly via `file://`). They vendor copies of small math/rendering helpers
  inline (`biomechanics/geometry.ts` formulas, `scripts/lib/render-skeleton-overlay-svg.cjs`)
  because a static HTML page can't `import`/`require()` from the TypeScript package. If you
  change the source-of-truth version of one of these functions, update the vendored copy too —
  it's checked but not auto-synced. Note also: Safari's `file://` sandbox refuses `<script src>`
  paths that walk above the page's own directory, which is why these are inlined rather than
  referenced — don't reintroduce a `../scripts/...` src reference in these pages.
- **No charting/plotting library** — `scripts/lib/render-svg-line-chart.cjs` is a small
  dependency-free SVG generator, in keeping with this package's general zero-new-dependency bias
  (see also: `node:test` over a test framework, WASM backend over a second native toolchain).
- `types/phase.ts`'s `ShootingPhase` doc comments encode real coaching methodology
  (reviewed against FITARCO-affiliated coaching input) — treat them as a primary source when
  reasoning about what a phase means, not just a type label.

## Coding conventions observed in both packages

- Strict TypeScript (`packages/tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes` all on). Match this rigor in new code.
- Each package builds via plain `tsc` (no bundler) to `dist/`, and compiles tests separately via
  `tsconfig.test.json` to `dist-test/` before running them with `node --test`.
- Module layout convention: a feature folder has a `calculator.ts` or equivalent implementation
  file plus an `index.ts` that only re-exports (`export * from "./calculator"`).
- Commit message convention (from CONTRIBUTING.md): `type(scope): summary`, e.g.
  `feat(M04): add FOC calculation`, `fix(data): correct validation logic`,
  `refactor(core): simplify data model`.
