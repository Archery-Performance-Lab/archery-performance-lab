import type { StaticSpineMeasurement } from "../types";

/**
 * Validates a Static Spine Measurement before it is accepted as Raw
 * Data (see ADR-003: only validated Raw Data may enter analytical
 * workflows).
 *
 * This only checks that the value is physically well-formed (a
 * positive, finite deflection) and that a recognized test standard is
 * attached. It intentionally does not judge whether the value is
 * "reasonable" for a given shaft: the plausible range spans everything
 * from stiff compound-bow carbon shafts to flexible traditional wood
 * shafts, and asserting a universal range here would itself be an
 * undocumented magic number.
 */
export function isValidStaticSpineMeasurement(
    measurement: StaticSpineMeasurement
): boolean {

    const hasKnownStandard =
        measurement.standard === "ASTM-F2031" ||
        measurement.standard === "AMO-ATA";

    const hasPositiveFiniteDeflection =
        Number.isFinite(measurement.deflectionThousandthsInch) &&
        measurement.deflectionThousandthsInch > 0;

    return hasKnownStandard && hasPositiveFiniteDeflection;
}
