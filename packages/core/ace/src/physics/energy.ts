import { square } from "../utils";

/**
 * Kinetic Energy (Joule)
 */
export function kineticEnergy(
    massKg: number,
    velocityMs: number
): number {
    return 0.5 * massKg * square(velocityMs);
}

/**
 * Stored Elastic Energy (Joule)
 *
 * storedEnergy = 0.5 * force * distance
 *
 * Approximates the potential energy stored by a linear
 * force-displacement system (Hooke's Law: E = 0.5 * k * x^2,
 * equivalently 0.5 * F * x when F = k * x).
 *
 * Applied to a bow, this treats the limb force-draw curve as
 * triangular (linear). Real bows have a non-linear curve, so this
 * is a first-order approximation, most reasonable for recurve and
 * traditional bows without let-off.
 */
export function storedElasticEnergy(
    forceNewtons: number,
    distanceMeters: number
): number {
    return 0.5 * forceNewtons * distanceMeters;
}