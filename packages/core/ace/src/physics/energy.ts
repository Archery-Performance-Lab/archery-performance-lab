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