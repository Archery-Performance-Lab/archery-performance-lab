import { momentum } from "../../physics";
import { gramsToKilograms } from "../../utils";

/**
 * Arrow Momentum
 *
 * momentumKilogramMetersPerSecond = arrowMassKilograms * arrowVelocity
 *
 * Domain wrapper around the generic momentum() physics function:
 * takes the arrow mass in grams (consistent with ArrowMassResult) and
 * converts it to kilograms before applying the formula.
 *
 * Momentum scales linearly with velocity, unlike Kinetic Energy which
 * scales with velocity squared. It is the metric most associated with
 * penetration, while Kinetic Energy is most associated with impact energy.
 */

export interface MomentumInput {
    arrowMassGrams: number;
    arrowVelocityMetersPerSecond: number;
}

export interface MomentumResult {
    momentumKilogramMetersPerSecond: number;
}

export function calculateArrowMomentum(
    input: MomentumInput
): MomentumResult {

    const arrowMassKilograms = gramsToKilograms(input.arrowMassGrams);

    return {
        momentumKilogramMetersPerSecond: momentum(
            arrowMassKilograms,
            input.arrowVelocityMetersPerSecond
        )
    };
}
