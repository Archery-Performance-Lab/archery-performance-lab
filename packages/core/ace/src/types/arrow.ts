/**
 * Arrow description used by the Archery Calculation Engine.
 */
export interface Arrow {

    manufacturer: string;

    model: string;

    spine: number;

    lengthMillimeters: number;

    shaftMassGrams: number;

    pointMassGrams: number;

    pointMaterial: "Steel" | "Tungsten";

    insertMassGrams: number;

    pinMassGrams: number;

    nockMassGrams: number;

    vaneMassGrams: number;

    vaneModel: string;

    totalMassGrams: number;

    focMeasuredPercent?: number;

    focCalculatedPercent?: number;

}