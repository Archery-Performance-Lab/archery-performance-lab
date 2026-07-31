/**
 * Archery Performance Lab
 * Empirical tuning constants.
 *
 * Unlike constants/physics.ts, constants/gravity.ts and constants/air.ts
 * (universal physical constants), the values here are practical tuning
 * rules from archery coaching/technical practice, provided as ACE
 * domain knowledge. They are kept in their own module, separate from
 * physics constants, so this distinction stays visible in the code
 * structure and not only in a comment.
 */

/**
 * Recommended plunger (button) spring tension per pound of the
 * archer's actual (measured) draw weight, in grams of force.
 *
 * recommendedSpringTensionGrams = measuredDrawWeightPounds *
 *                                  PLUNGER_SPRING_TENSION_GRAMS_PER_POUND
 *
 * This is the practical mechanism used to compensate for dynamic
 * spine and reduce the archer's paradox — see
 * calculations/plunger-tuning/calculator.ts.
 */
export const PLUNGER_SPRING_TENSION_GRAMS_PER_POUND = 10;

/**
 * Plunger compression at which the spring tension above is measured
 * or verified with a tension gauge.
 */
export const PLUNGER_REFERENCE_DEFLECTION_MILLIMETERS = 2;
