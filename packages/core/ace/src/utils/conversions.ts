import {
    GRAIN_TO_GRAM,
    GRAM_TO_KILOGRAM,
    INCH_TO_METER,
    MM_TO_METER,
    POUND_FORCE_TO_NEWTON
} from "../constants";

export function grainsToGrams(value: number): number {
    return value * GRAIN_TO_GRAM;
}

export function gramsToKilograms(value: number): number {
    return value * GRAM_TO_KILOGRAM;
}

export function inchesToMeters(value: number): number {
    return value * INCH_TO_METER;
}

export function millimetersToMeters(value: number): number {
    return value * MM_TO_METER;
}

export function poundsForceToNewtons(value: number): number {
    return value * POUND_FORCE_TO_NEWTON;
}