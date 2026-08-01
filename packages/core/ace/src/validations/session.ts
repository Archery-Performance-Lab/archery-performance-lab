import type { Session } from "../types";
import { isValidArcher } from "./archer";
import { isValidArrow } from "./arrow";
import { isValidBow } from "./bow";
import { isValidEnvironment } from "./environment";
import { isValidShot } from "./shot";

/**
 * Validates a complete shooting Session before it is accepted as Raw
 * Data. Composes the validators of every entity a Session references,
 * so a Session is only valid if all of its parts are.
 */
export function isValidSession(session: Session): boolean {

    const hasValidDate =
        session.date instanceof Date && !Number.isNaN(session.date.getTime());

    const hasNonEmptyLocation = session.location.trim().length > 0;

    const hasValidShots = session.shots.every(isValidShot);

    return (
        hasValidDate &&
        hasNonEmptyLocation &&
        isValidArcher(session.archer) &&
        isValidBow(session.bow) &&
        isValidArrow(session.arrow) &&
        isValidEnvironment(session.environment) &&
        hasValidShots
    );
}
