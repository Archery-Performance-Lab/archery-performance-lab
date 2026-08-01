import type { Archer } from "../types";

/**
 * Validates an Archer profile before it is accepted as Raw Data.
 *
 * Checks are limited to what is physically/logically impossible to be
 * wrong, not what is "typical": no arbitrary age range is enforced
 * beyond birthYear not being in the future, since APL should not
 * reject legitimate historical or edge-case data (e.g. a very young
 * or very senior athlete) based on an invented cutoff.
 */
export function isValidArcher(archer: Archer): boolean {

    const hasNonEmptyName =
        archer.firstName.trim().length > 0 &&
        archer.lastName.trim().length > 0;

    const currentYear = new Date().getFullYear();
    const hasPlausibleBirthYear =
        Number.isInteger(archer.birthYear) && archer.birthYear <= currentYear;

    const hasKnownDominantHand =
        archer.dominantHand === "Right" || archer.dominantHand === "Left";

    const hasPositiveFiniteDrawLength =
        Number.isFinite(archer.drawLengthMillimeters) &&
        archer.drawLengthMillimeters > 0;

    const hasNonEmptyCategory = archer.category.trim().length > 0;

    return (
        hasNonEmptyName &&
        hasPlausibleBirthYear &&
        hasKnownDominantHand &&
        hasPositiveFiniteDrawLength &&
        hasNonEmptyCategory
    );
}
