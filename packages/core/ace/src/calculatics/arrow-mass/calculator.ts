import { gramsToKilograms } from "../../utils";

export interface ArrowMassInput {
    shaftGrams: number;
    pointGrams: number;
    nockGrams: number;
    vaneGrams: number;
    insertGrams?: number;
    pinGrams?: number;
}

export interface ArrowMassResult {
    totalGrams: number;
    totalKilograms: number;
}

export function calculateArrowMass(
    input: ArrowMassInput
): ArrowMassResult {

    const totalGrams =
        input.shaftGrams +
        input.pointGrams +
        input.nockGrams +
        input.vaneGrams +
        (input.insertGrams ?? 0) +
        (input.pinGrams ?? 0);

    return {
        totalGrams,
        totalKilograms: gramsToKilograms(totalGrams)
    };
}