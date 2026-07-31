/**
 * Force (Newton's Second Law)
 *
 * force = mass * acceleration
 *
 * Reference: Newton's second law of motion.
 */
export function force(
    massKilograms: number,
    accelerationMetersPerSecondSquared: number
): number {
    return massKilograms * accelerationMetersPerSecondSquared;
}
