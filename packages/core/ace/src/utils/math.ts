/**
 * Square of a number
 */
export function square(value: number): number {
    return value * value;
}

/**
 * Cube of a number
 */
export function cube(value: number): number {
    return value * value * value;
}

/**
 * Clamp value between min and max
 */
export function clamp(
    value: number,
    min: number,
    max: number
): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Round with decimal precision
 */
export function round(
    value: number,
    decimals = 2
): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}