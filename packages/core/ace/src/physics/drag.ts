import { AIR_DENSITY } from "../constants";
import { square } from "../utils";

/**
 * Aerodynamic Drag Force
 *
 * dragForce = 0.5 * airDensity * velocity^2 * dragCoefficient * frontalArea
 *
 * Reference: standard drag equation for a body moving through a fluid.
 * airDensityKilogramsPerCubicMeter defaults to sea-level standard
 * conditions (see ../constants/air.ts) but can be overridden with a
 * measured environment value.
 */
export function dragForce(
    velocityMetersPerSecond: number,
    dragCoefficient: number,
    frontalAreaSquareMeters: number,
    airDensityKilogramsPerCubicMeter: number = AIR_DENSITY
): number {
    return (
        0.5 *
        airDensityKilogramsPerCubicMeter *
        square(velocityMetersPerSecond) *
        dragCoefficient *
        frontalAreaSquareMeters
    );
}

/**
 * Drag Deceleration Constant (1/m)
 *
 * k = (airDensity * dragCoefficient * frontalArea) / (2 * mass)
 *
 * Rewrites dragForce = mass * deceleration = 0.5 * airDensity * v^2 *
 * dragCoefficient * frontalArea into deceleration = k * v^2, isolating
 * the single constant needed to solve the quadratic-drag equation of
 * motion (see physics/motion.ts timeOfFlightWithDrag()).
 */
export function dragDecelerationConstant(
    dragCoefficient: number,
    frontalAreaSquareMeters: number,
    massKilograms: number,
    airDensityKilogramsPerCubicMeter: number = AIR_DENSITY
): number {
    return (
        (airDensityKilogramsPerCubicMeter *
            dragCoefficient *
            frontalAreaSquareMeters) /
        (2 * massKilograms)
    );
}
