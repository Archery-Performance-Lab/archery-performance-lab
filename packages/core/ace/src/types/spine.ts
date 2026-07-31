/**
 * Static Spine Measurement
 *
 * Raw Data (see ADR-003 — Raw Data vs Derived Data): a directly
 * measured shaft stiffness value, obtained by physically testing the
 * shaft, not calculated.
 *
 * Two incompatible test standards exist. The same physical shaft
 * produces a different deflection reading depending on which is used,
 * so the standard must always be recorded alongside the value — a bare
 * number is not enough to interpret it correctly:
 *
 * - "ASTM-F2031": ASTM F2031-05 standard. 880 g (1.94 lb) weight
 *   suspended from the center of a 28 in (0.71 m) span.
 * - "AMO-ATA": legacy AMO / ATA (Archery Trade Association) standard.
 *   2 lb (0.91 kg) weight suspended from the center of a 26 in
 *   (0.66 m) span.
 *
 * Spine is conventionally reported as deflection in thousandths of an
 * inch (e.g. a shaft that deflects 0.400 in is commonly called
 * "400 spine"). A higher number means a more flexible (weaker) shaft;
 * a lower number means a stiffer shaft.
 *
 * This is the STATIC spine (a property of the bare shaft at rest).
 * DYNAMIC spine — how the shaft actually flexes during the power
 * stroke of a specific bow/arrow setup — depends on additional factors
 * (draw weight, arrow length, point weight, release dynamics) and is
 * intentionally not modeled here: there is no single physically
 * derived formula for it that meets ACE's "document every scientific
 * formula" standard, only competing empirical/manufacturer heuristics.
 */

export type StaticSpineStandard = "ASTM-F2031" | "AMO-ATA";

export interface StaticSpineMeasurement {
    standard: StaticSpineStandard;
    deflectionThousandthsInch: number;
}
