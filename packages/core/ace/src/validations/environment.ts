import type { Environment } from "../types";

/**
 * Absolute zero, the physical lower bound for any Celsius temperature.
 */
const ABSOLUTE_ZERO_CELSIUS = -273.15;

/**
 * Validates Environmental conditions before they are accepted as Raw
 * Data. Bounds used here are physical constraints (temperature cannot
 * go below absolute zero, humidity and compass bearings are bounded
 * by definition), not assumptions about "typical" weather.
 */
export function isValidEnvironment(environment: Environment): boolean {

    const hasPhysicalTemperature =
        Number.isFinite(environment.temperatureCelsius) &&
        environment.temperatureCelsius > ABSOLUTE_ZERO_CELSIUS;

    const hasPositiveFinitePressure =
        Number.isFinite(environment.pressureHectoPascal) &&
        environment.pressureHectoPascal > 0;

    const hasBoundedHumidity =
        Number.isFinite(environment.humidityPercent) &&
        environment.humidityPercent >= 0 &&
        environment.humidityPercent <= 100;

    const hasFiniteAltitude = Number.isFinite(environment.altitudeMeters);

    const hasNonNegativeFiniteWindSpeed =
        Number.isFinite(environment.windSpeedMetersPerSecond) &&
        environment.windSpeedMetersPerSecond >= 0;

    const hasBoundedWindDirection =
        Number.isFinite(environment.windDirectionDegrees) &&
        environment.windDirectionDegrees >= 0 &&
        environment.windDirectionDegrees <= 360;

    return (
        hasPhysicalTemperature &&
        hasPositiveFinitePressure &&
        hasBoundedHumidity &&
        hasFiniteAltitude &&
        hasNonNegativeFiniteWindSpeed &&
        hasBoundedWindDirection
    );
}
