/**
 * Front Of Center (FOC)
 *
 * FOC expresses how far the arrow's balance point sits forward of its
 * physical midpoint, as a percentage of total arrow length.
 *
 * Formula:
 * FOC (%) = ((balancePointFromNock - arrowLength / 2) / arrowLength) * 100
 *
 * balancePointFromNockMillimeters is measured from the throat of the
 * nock groove to the point where the assembled arrow balances.
 */

export interface FrontOfCenterInput {
    arrowLengthMillimeters: number;
    balancePointFromNockMillimeters: number;
}

export interface FrontOfCenterResult {
    frontOfCenterPercent: number;
}

export function calculateFrontOfCenter(
    input: FrontOfCenterInput
): FrontOfCenterResult {

    const halfLengthMillimeters = input.arrowLengthMillimeters / 2;

    const frontOfCenterPercent =
        ((input.balancePointFromNockMillimeters - halfLengthMillimeters) /
            input.arrowLengthMillimeters) *
        100;

    return {
        frontOfCenterPercent
    };
}
