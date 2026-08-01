/**
 * Ambient type declarations for third-party packages that ship no
 * types of their own and have no @types/* package available on npm
 * (confirmed by checking node_modules directly, not assumed).
 *
 * Kept intentionally minimal: only the shape this project actually
 * uses, not a full re-implementation of each package's real API.
 */

declare module "ffprobe-static" {
    interface FfprobeStatic {
        path: string;
    }

    const ffprobeStatic: FfprobeStatic;
    export default ffprobeStatic;
}
