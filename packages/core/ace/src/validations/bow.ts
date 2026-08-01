import type { Bow, Plunger } from "../types";

/**
 * Validates a Plunger (button) configuration.
 */
export function isValidPlunger(plunger: Plunger): boolean {

    const hasNonEmptyIdentity =
        plunger.manufacturer.trim().length > 0 &&
        plunger.model.trim().length > 0;

    const hasPositiveFiniteSpringTension =
        Number.isFinite(plunger.springTensionGrams) &&
        plunger.springTensionGrams > 0;

    const hasPositiveFiniteTestDeflection =
        Number.isFinite(plunger.testDeflectionMillimeters) &&
        plunger.testDeflectionMillimeters > 0;

    return (
        hasNonEmptyIdentity &&
        hasPositiveFiniteSpringTension &&
        hasPositiveFiniteTestDeflection
    );
}

/**
 * Validates a Bow (Olympic recurve) configuration before it is
 * accepted as Raw Data.
 *
 * tillerMillimeters is intentionally not sign-constrained: convention
 * for what counts as "positive" tiller varies, and asserting one here
 * without a documented convention would be an undocumented rule.
 */
export function isValidBow(bow: Bow): boolean {

    const hasNonEmptyIdentity =
        bow.riserManufacturer.trim().length > 0 &&
        bow.riserModel.trim().length > 0 &&
        bow.limbManufacturer.trim().length > 0 &&
        bow.limbModel.trim().length > 0;

    const hasPositiveFiniteDimensions =
        Number.isFinite(bow.riserLengthInches) && bow.riserLengthInches > 0 &&
        Number.isFinite(bow.nominalDrawWeightPounds) && bow.nominalDrawWeightPounds > 0 &&
        Number.isFinite(bow.measuredDrawWeightPounds) && bow.measuredDrawWeightPounds > 0 &&
        Number.isFinite(bow.drawLengthInches) && bow.drawLengthInches > 0 &&
        Number.isFinite(bow.braceHeightMillimeters) && bow.braceHeightMillimeters > 0;

    const hasFiniteTiller = Number.isFinite(bow.tillerMillimeters);

    const hasPositiveIntegerStringStrands =
        Number.isInteger(bow.stringStrands) && bow.stringStrands > 0;

    return (
        hasNonEmptyIdentity &&
        hasPositiveFiniteDimensions &&
        hasFiniteTiller &&
        hasPositiveIntegerStringStrands &&
        isValidPlunger(bow.plunger)
    );
}
