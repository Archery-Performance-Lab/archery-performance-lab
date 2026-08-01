import type { Arrow, StaticSpineMeasurement } from "../types";

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

/**
 * Validates an Arrow configuration before it is accepted as Raw Data.
 *
 * focMeasuredPercent/focCalculatedPercent, when present, are only
 * checked for being finite: a rear-weighted arrow can have a negative
 * FOC, so no sign or range constraint is enforced here.
 */
export function isValidArrow(arrow: Arrow): boolean {

    const hasNonEmptyIdentity =
        arrow.manufacturer.trim().length > 0 &&
        arrow.model.trim().length > 0 &&
        arrow.vaneModel.trim().length > 0;

    const hasPositiveFiniteLength =
        Number.isFinite(arrow.lengthMillimeters) && arrow.lengthMillimeters > 0;

    const hasNonNegativeFiniteMasses =
        Number.isFinite(arrow.shaftMassGrams) && arrow.shaftMassGrams >= 0 &&
        Number.isFinite(arrow.pointMassGrams) && arrow.pointMassGrams >= 0 &&
        Number.isFinite(arrow.insertMassGrams) && arrow.insertMassGrams >= 0 &&
        Number.isFinite(arrow.pinMassGrams) && arrow.pinMassGrams >= 0 &&
        Number.isFinite(arrow.nockMassGrams) && arrow.nockMassGrams >= 0 &&
        Number.isFinite(arrow.vaneMassGrams) && arrow.vaneMassGrams >= 0;

    const hasPositiveFiniteTotalMass =
        Number.isFinite(arrow.totalMassGrams) && arrow.totalMassGrams > 0;

    const hasKnownPointMaterial =
        arrow.pointMaterial === "Steel" || arrow.pointMaterial === "Tungsten";

    const hasValidOptionalFocValues =
        (arrow.focMeasuredPercent === undefined ||
            Number.isFinite(arrow.focMeasuredPercent)) &&
        (arrow.focCalculatedPercent === undefined ||
            Number.isFinite(arrow.focCalculatedPercent));

    return (
        hasNonEmptyIdentity &&
        hasPositiveFiniteLength &&
        hasNonNegativeFiniteMasses &&
        hasPositiveFiniteTotalMass &&
        hasKnownPointMaterial &&
        hasValidOptionalFocValues &&
        isValidStaticSpineMeasurement(arrow.staticSpine)
    );
}
