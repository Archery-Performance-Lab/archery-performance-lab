import { storedElasticEnergy } from "../../physics";
import {
    gramsToKilograms,
    inchesToMeters,
    poundsForceToNewtons
} from "../../utils";

/**
 * Arrow Speed Estimation
 *
 * This is an ESTIMATE, not a measurement (see ADR-003, Derived Data).
 * It requires no chronograph, only the bow's draw weight and draw
 * length plus an efficiency value for the specific bow.
 *
 * Model:
 * 1. storedEnergy   = 0.5 * drawWeight * drawLength
 *                     (elastic energy stored in the limbs, treating the
 *                     force-draw curve as triangular/linear — see
 *                     physics/energy.ts storedElasticEnergy())
 * 2. deliveredEnergy = storedEnergy * bowEfficiency
 *                     (only a fraction of stored energy reaches the
 *                     arrow; the rest is lost to limb/string vibration,
 *                     hand shock and sound)
 * 3. velocity        = sqrt(2 * deliveredEnergy / arrowMass)
 *                     (from kineticEnergy = 0.5 * mass * velocity^2,
 *                     solved for velocity)
 *
 * bowEfficiency is NOT a hard-coded constant: it must be supplied by
 * the caller because it depends on the specific bow (limb material and
 * design, riser mass, brace height, string material...) AND on the
 * arrow mass used for the estimate: a heavier arrow stays in contact
 * with the string longer during the power stroke, giving the limbs
 * more time to transfer energy before it is lost to residual vibration,
 * so heavier arrows yield measurably higher efficiency on the same bow.
 *
 * Reference values (Kooi, "On the mechanics of the modern
 * working-recurve bow"; see also comparative limb efficiency testing):
 * - Traditional/older recurve limb design: roughly 0.65-0.80
 * - Modern high-performance recurve limbs (e.g. carbon/foam core):
 *   roughly 0.80-0.85 with medium-to-heavy arrows, and can exceed 0.85
 *   with heavy arrows specifically
 * A value should ideally be backed by a measured chronograph
 * calibration when available, rather than assumed.
 *
 * Limitation: the triangular force-draw approximation is reasonable
 * for recurve/traditional bows without let-off. It is not appropriate
 * for compound bows, whose force-draw curve is markedly non-linear.
 */

export interface ArrowSpeedInput {
    drawWeightPounds: number;
    drawLengthInches: number;
    bowEfficiency: number;
    arrowMassGrams: number;
}

export interface ArrowSpeedResult {
    storedEnergyJoules: number;
    deliveredEnergyJoules: number;
    estimatedVelocityMetersPerSecond: number;
}

export function estimateArrowSpeed(
    input: ArrowSpeedInput
): ArrowSpeedResult {

    const drawWeightNewtons = poundsForceToNewtons(input.drawWeightPounds);
    const drawLengthMeters = inchesToMeters(input.drawLengthInches);
    const arrowMassKilograms = gramsToKilograms(input.arrowMassGrams);

    const storedEnergyJoules = storedElasticEnergy(
        drawWeightNewtons,
        drawLengthMeters
    );

    const deliveredEnergyJoules = storedEnergyJoules * input.bowEfficiency;

    const estimatedVelocityMetersPerSecond = Math.sqrt(
        (2 * deliveredEnergyJoules) / arrowMassKilograms
    );

    return {
        storedEnergyJoules,
        deliveredEnergyJoules,
        estimatedVelocityMetersPerSecond
    };
}
