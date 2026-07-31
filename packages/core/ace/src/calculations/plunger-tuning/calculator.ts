import {
    PLUNGER_REFERENCE_DEFLECTION_MILLIMETERS,
    PLUNGER_SPRING_TENSION_GRAMS_PER_POUND
} from "../../constants";

/**
 * Plunger (Button) Spring Tension Recommendation
 *
 * recommendedSpringTensionGrams = drawWeightPounds *
 *                                  PLUNGER_SPRING_TENSION_GRAMS_PER_POUND
 *
 * This is ACE's model for correcting Dynamic Spine in practice.
 * Dynamic Spine itself — how much the shaft actually flexes during
 * the power stroke — has no single physically derived formula that
 * meets ACE's documentation standard (see types/spine.ts). What IS
 * well established, and used here, is the practical correction: the
 * shaft is spine-indexed to find its soft plane (oriented toward the
 * plunger when nocked), and the plunger spring tension is set in
 * proportion to the archer's actual (measured, at-the-fingers) draw
 * weight — Bow.measuredDrawWeightPounds, not the nominal rating.
 * Matching the spring tension this way absorbs the shaft's lateral
 * flex during release, nearly canceling the archer's paradox.
 *
 * The ratio (grams per pound) and the reference compression at which
 * it is verified are ACE domain/coaching knowledge, not universal
 * physics — see constants/tuning.ts.
 */

export interface PlungerTuningInput {
    measuredDrawWeightPounds: number;
}

export interface PlungerTuningResult {
    recommendedSpringTensionGrams: number;
    referenceDeflectionMillimeters: number;
}

export function calculateRecommendedPlungerSpringTension(
    input: PlungerTuningInput
): PlungerTuningResult {

    const recommendedSpringTensionGrams =
        input.measuredDrawWeightPounds *
        PLUNGER_SPRING_TENSION_GRAMS_PER_POUND;

    return {
        recommendedSpringTensionGrams,
        referenceDeflectionMillimeters: PLUNGER_REFERENCE_DEFLECTION_MILLIMETERS
    };
}
