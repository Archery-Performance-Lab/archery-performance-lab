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
