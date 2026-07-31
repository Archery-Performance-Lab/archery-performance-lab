import {
    dragDecelerationConstant,
    timeOfFlightWithDrag,
    velocityAfterTimeWithDrag
} from "../../physics";
import { gramsToKilograms, millimetersToMeters, square } from "../../utils";

/**
 * Arrow Time of Flight
 *
 * Computes how long an arrow takes to cover a given distance, taking
 * air resistance into account rather than assuming constant velocity
 * (see physics/motion.ts timeOfFlightWithDrag() for the analytic
 * derivation).
 *
 * The arrow's frontal area is approximated as a circle from the shaft
 * diameter: frontalArea = pi * (shaftDiameter / 2)^2. This ignores the
 * fletching's contribution to frontal area, which is small compared to
 * its contribution to the drag coefficient itself.
 *
 * dragCoefficient is not hard-coded: it must be supplied because it
 * depends on shaft shape, fletching type/size and point/broadhead
 * shape. Wind-tunnel research on archery arrows (Miller, Lyon &
 * Kohut-style studies, "Aerodynamic properties of an archery arrow",
 * Sports Engineering) reports a base drag coefficient of about 1.3 for
 * a naked shaft with nock, rising to roughly 1.5 for a typical
 * fletched target arrow, and up to about 3.0 for arrows with larger or
 * rougher fletching / broadheads. Prefer a value calibrated against a
 * measured chronograph reading over two distances when available.
 *
 * Limitation: inherits the 1D, no-gravity limitation of
 * timeOfFlightWithDrag() — most accurate for flat, close-to-level
 * target distances.
 */

export interface TimeOfFlightInput {
    distanceMeters: number;
    arrowVelocityMetersPerSecond: number;
    arrowMassGrams: number;
    shaftDiameterMillimeters: number;
    dragCoefficient: number;
    airDensityKilogramsPerCubicMeter?: number;
}

export interface TimeOfFlightResult {
    timeOfFlightSeconds: number;
    velocityAtTargetMetersPerSecond: number;
}

export function calculateTimeOfFlight(
    input: TimeOfFlightInput
): TimeOfFlightResult {

    const arrowMassKilograms = gramsToKilograms(input.arrowMassGrams);
    const shaftRadiusMeters =
        millimetersToMeters(input.shaftDiameterMillimeters) / 2;
    const frontalAreaSquareMeters = Math.PI * square(shaftRadiusMeters);

    const dragConstant = dragDecelerationConstant(
        input.dragCoefficient,
        frontalAreaSquareMeters,
        arrowMassKilograms,
        input.airDensityKilogramsPerCubicMeter
    );

    const timeOfFlightSeconds = timeOfFlightWithDrag(
        input.arrowVelocityMetersPerSecond,
        input.distanceMeters,
        dragConstant
    );

    const velocityAtTargetMetersPerSecond = velocityAfterTimeWithDrag(
        input.arrowVelocityMetersPerSecond,
        timeOfFlightSeconds,
        dragConstant
    );

    return {
        timeOfFlightSeconds,
        velocityAtTargetMetersPerSecond
    };
}
