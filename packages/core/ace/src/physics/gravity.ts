import { GRAVITY } from "../constants";
import { force } from "./force";

/**
 * Weight Force
 *
 * weightForce = mass * GRAVITY
 *
 * The gravitational force acting on a mass at standard gravity.
 * See ../constants/gravity.ts for the GRAVITY constant.
 */
export function calculateWeightForce(massKilograms: number): number {
    return force(massKilograms, GRAVITY);
}
