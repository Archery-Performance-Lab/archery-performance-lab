import type { Plunger } from "./button";

/**
 * Olympic recurve bow configuration.
 */
export interface Bow {

    riserManufacturer: string;

    riserModel: string;

    riserLengthInches: number;

    limbManufacturer: string;

    limbModel: string;

    nominalDrawWeightPounds: number;

    measuredDrawWeightPounds: number;

    drawLengthInches: number;

    braceHeightMillimeters: number;

    tillerMillimeters: number;

    stringStrands: number;

    plunger: Plunger;

}