/**
 * Plunger / Button
 *
 * The plunger button is the spring-loaded rest component that the
 * shaft presses against during the power stroke. Setting its spring
 * tension in proportion to the archer's actual (measured) draw weight
 * is the practical mechanism used to compensate for dynamic spine and
 * reduce the archer's paradox — see
 * calculations/plunger-tuning/calculator.ts.
 */
export interface Plunger {

    manufacturer: string;

    model: string;

    springTensionGrams: number;

    testDeflectionMillimeters: number;

}
