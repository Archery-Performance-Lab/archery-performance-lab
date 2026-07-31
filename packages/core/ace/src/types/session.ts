import type { Archer } from "./archer";
import type { Bow } from "./bow";
import type { Arrow } from "./arrow";
import type { Environment } from "./environment";
import type { Shot } from "./shot";

/**
 * Complete shooting session.
 */
export interface Session {

    date: Date;

    location: string;

    archer: Archer;

    bow: Bow;

    arrow: Arrow;

    environment: Environment;

    shots: Shot[];

}