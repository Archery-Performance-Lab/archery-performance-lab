import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
    isValidStaticSpineMeasurement,
    isValidArrow,
    isValidArcher,
    isValidPlunger,
    isValidBow,
    isValidEnvironment,
    isValidShot,
    isValidSession
} from "../src/validations";
import type {
    Archer,
    Arrow,
    Bow,
    Environment,
    Plunger,
    Session,
    Shot
} from "../src/types";

const validPlunger: Plunger = {
    manufacturer: "Shibuya",
    model: "Ultima",
    springTensionGrams: 380,
    testDeflectionMillimeters: 2
};

const validArcher: Archer = {
    firstName: "Jane",
    lastName: "Doe",
    birthYear: 2000,
    dominantHand: "Right",
    drawLengthMillimeters: 710,
    category: "Senior"
};

const validBow: Bow = {
    riserManufacturer: "Hoyt",
    riserModel: "Formula X",
    riserLengthInches: 25,
    limbManufacturer: "Win&Win",
    limbModel: "Wiawis Winex",
    nominalDrawWeightPounds: 38,
    measuredDrawWeightPounds: 38,
    drawLengthInches: 28,
    braceHeightMillimeters: 220,
    tillerMillimeters: 2,
    stringStrands: 16,
    plunger: validPlunger
};

const validArrow: Arrow = {
    manufacturer: "Easton",
    model: "X10",
    staticSpine: { standard: "ASTM-F2031", deflectionThousandthsInch: 400 },
    lengthMillimeters: 700,
    shaftMassGrams: 12,
    pointMassGrams: 6.5,
    pointMaterial: "Tungsten",
    insertMassGrams: 1,
    pinMassGrams: 0.3,
    nockMassGrams: 0.5,
    vaneMassGrams: 1.2,
    vaneModel: "Spin Wing",
    totalMassGrams: 21.5
};

const validEnvironment: Environment = {
    temperatureCelsius: 22,
    pressureHectoPascal: 1013,
    humidityPercent: 45,
    altitudeMeters: 100,
    windSpeedMetersPerSecond: 2,
    windDirectionDegrees: 180
};

const validShot: Shot = {
    shotNumber: 1,
    distanceMeters: 70,
    score: 9,
    xCoordinateMillimeters: 12,
    yCoordinateMillimeters: -5
};

describe("validations/isValidStaticSpineMeasurement", () => {
    it("accepts a well-formed ASTM-F2031 measurement", () => {
        assert.equal(
            isValidStaticSpineMeasurement({
                standard: "ASTM-F2031",
                deflectionThousandthsInch: 400
            }),
            true
        );
    });

    it("accepts a well-formed AMO-ATA measurement", () => {
        assert.equal(
            isValidStaticSpineMeasurement({
                standard: "AMO-ATA",
                deflectionThousandthsInch: 340
            }),
            true
        );
    });

    it("rejects an unrecognized standard", () => {
        assert.equal(
            isValidStaticSpineMeasurement({
                // @ts-expect-error deliberately invalid standard for the test
                standard: "SOME-OTHER-STANDARD",
                deflectionThousandthsInch: 400
            }),
            false
        );
    });

    it("rejects a non-positive deflection", () => {
        assert.equal(
            isValidStaticSpineMeasurement({
                standard: "ASTM-F2031",
                deflectionThousandthsInch: 0
            }),
            false
        );
        assert.equal(
            isValidStaticSpineMeasurement({
                standard: "ASTM-F2031",
                deflectionThousandthsInch: -10
            }),
            false
        );
    });

    it("rejects a non-finite deflection", () => {
        assert.equal(
            isValidStaticSpineMeasurement({
                standard: "ASTM-F2031",
                deflectionThousandthsInch: NaN
            }),
            false
        );
        assert.equal(
            isValidStaticSpineMeasurement({
                standard: "ASTM-F2031",
                deflectionThousandthsInch: Infinity
            }),
            false
        );
    });
});

describe("validations/isValidArrow", () => {
    it("accepts a well-formed arrow", () => {
        assert.equal(isValidArrow(validArrow), true);
    });

    it("rejects an empty manufacturer", () => {
        assert.equal(isValidArrow({ ...validArrow, manufacturer: "  " }), false);
    });

    it("rejects a non-positive total mass", () => {
        assert.equal(isValidArrow({ ...validArrow, totalMassGrams: 0 }), false);
    });

    it("rejects an unknown point material", () => {
        assert.equal(
            // @ts-expect-error deliberately invalid pointMaterial for the test
            isValidArrow({ ...validArrow, pointMaterial: "Aluminum" }),
            false
        );
    });

    it("rejects an invalid static spine even if everything else is valid", () => {
        assert.equal(
            isValidArrow({
                ...validArrow,
                staticSpine: { standard: "ASTM-F2031", deflectionThousandthsInch: -1 }
            }),
            false
        );
    });

    it("accepts a rear-weighted arrow with a negative FOC", () => {
        assert.equal(
            isValidArrow({ ...validArrow, focCalculatedPercent: -2 }),
            true
        );
    });
});

describe("validations/isValidArcher", () => {
    it("accepts a well-formed archer", () => {
        assert.equal(isValidArcher(validArcher), true);
    });

    it("rejects an empty first or last name", () => {
        assert.equal(isValidArcher({ ...validArcher, firstName: "" }), false);
        assert.equal(isValidArcher({ ...validArcher, lastName: "   " }), false);
    });

    it("rejects a birth year in the future", () => {
        const nextYear = new Date().getFullYear() + 1;
        assert.equal(isValidArcher({ ...validArcher, birthYear: nextYear }), false);
    });

    it("rejects an unknown dominant hand", () => {
        assert.equal(
            // @ts-expect-error deliberately invalid dominantHand for the test
            isValidArcher({ ...validArcher, dominantHand: "Ambidextrous" }),
            false
        );
    });

    it("rejects a non-positive draw length", () => {
        assert.equal(
            isValidArcher({ ...validArcher, drawLengthMillimeters: 0 }),
            false
        );
    });
});

describe("validations/isValidPlunger", () => {
    it("accepts a well-formed plunger", () => {
        assert.equal(isValidPlunger(validPlunger), true);
    });

    it("rejects a non-positive spring tension", () => {
        assert.equal(
            isValidPlunger({ ...validPlunger, springTensionGrams: 0 }),
            false
        );
    });

    it("rejects a non-positive test deflection", () => {
        assert.equal(
            isValidPlunger({ ...validPlunger, testDeflectionMillimeters: -2 }),
            false
        );
    });
});

describe("validations/isValidBow", () => {
    it("accepts a well-formed bow", () => {
        assert.equal(isValidBow(validBow), true);
    });

    it("rejects a non-positive draw weight", () => {
        assert.equal(
            isValidBow({ ...validBow, measuredDrawWeightPounds: 0 }),
            false
        );
    });

    it("rejects a non-positive integer string count", () => {
        assert.equal(isValidBow({ ...validBow, stringStrands: 0 }), false);
        assert.equal(isValidBow({ ...validBow, stringStrands: 16.5 }), false);
    });

    it("rejects a bow with an invalid plunger, even if everything else is valid", () => {
        assert.equal(
            isValidBow({
                ...validBow,
                plunger: { ...validPlunger, springTensionGrams: -1 }
            }),
            false
        );
    });
});

describe("validations/isValidEnvironment", () => {
    it("accepts well-formed environmental conditions", () => {
        assert.equal(isValidEnvironment(validEnvironment), true);
    });

    it("rejects a temperature below absolute zero", () => {
        assert.equal(
            isValidEnvironment({ ...validEnvironment, temperatureCelsius: -300 }),
            false
        );
    });

    it("rejects humidity outside 0-100%", () => {
        assert.equal(
            isValidEnvironment({ ...validEnvironment, humidityPercent: 101 }),
            false
        );
        assert.equal(
            isValidEnvironment({ ...validEnvironment, humidityPercent: -1 }),
            false
        );
    });

    it("rejects a negative wind speed", () => {
        assert.equal(
            isValidEnvironment({ ...validEnvironment, windSpeedMetersPerSecond: -1 }),
            false
        );
    });

    it("rejects a wind direction outside 0-360 degrees", () => {
        assert.equal(
            isValidEnvironment({ ...validEnvironment, windDirectionDegrees: 361 }),
            false
        );
    });
});

describe("validations/isValidShot", () => {
    it("accepts a well-formed shot", () => {
        assert.equal(isValidShot(validShot), true);
    });

    it("accepts a shot with the optional velocity/flight time fields", () => {
        assert.equal(
            isValidShot({
                ...validShot,
                arrowVelocityMetersPerSecond: 63.4,
                flightTimeSeconds: 1.145
            }),
            true
        );
    });

    it("rejects a score outside the World Archery 0-10 range", () => {
        assert.equal(isValidShot({ ...validShot, score: 11 }), false);
        assert.equal(isValidShot({ ...validShot, score: -1 }), false);
    });

    it("accepts a miss (score 0)", () => {
        assert.equal(isValidShot({ ...validShot, score: 0 }), true);
    });

    it("rejects a non-positive optional velocity when present", () => {
        assert.equal(
            isValidShot({ ...validShot, arrowVelocityMetersPerSecond: 0 }),
            false
        );
    });
});

describe("validations/isValidSession", () => {
    const validSession: Session = {
        date: new Date("2026-07-31"),
        location: "Local Club Range",
        archer: validArcher,
        bow: validBow,
        arrow: validArrow,
        environment: validEnvironment,
        shots: [validShot, { ...validShot, shotNumber: 2, score: 10 }]
    };

    it("accepts a well-formed session", () => {
        assert.equal(isValidSession(validSession), true);
    });

    it("rejects an invalid date", () => {
        assert.equal(
            isValidSession({ ...validSession, date: new Date("not-a-date") }),
            false
        );
    });

    it("accepts a session with no shots yet recorded", () => {
        assert.equal(isValidSession({ ...validSession, shots: [] }), true);
    });

    it("rejects the session if any single shot is invalid", () => {
        assert.equal(
            isValidSession({
                ...validSession,
                shots: [validShot, { ...validShot, score: 99 }]
            }),
            false
        );
    });

    it("rejects the session if the nested archer is invalid", () => {
        assert.equal(
            isValidSession({
                ...validSession,
                archer: { ...validArcher, firstName: "" }
            }),
            false
        );
    });
});
