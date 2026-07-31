import { kineticEnergy } from "../../physics";
import { gramsToKilograms } from "../../utils";

/**
 * Arrow Kinetic Energy
 *
 * kineticEnergyJoules = 0.5 * arrowMassKilograms * arrowVelocity^2
 *
 * Domain wrapper around the generic kineticEnergy() physics function:
 * takes the arrow mass in grams (consistent with ArrowMassResult) and
 * converts it to kilograms before applying the formula.
 */

export interface KineticEnergyInput {
    arrowMassGrams: number;
    arrowVelocityMetersPerSecond: number;
}

export interface KineticEnergyResult {
    kineticEnergyJoules: number;
}

export function calculateArrowKineticEnergy(
    input: KineticEnergyInput
): KineticEnergyResult {

    const arrowMassKilograms = gramsToKilograms(input.arrowMassGrams);

    return {
        kineticEnergyJoules: kineticEnergy(
            arrowMassKilograms,
            input.arrowVelocityMetersPerSecond
        )
    };
}
