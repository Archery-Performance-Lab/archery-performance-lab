// Calibration helper — NOT part of the automated test suite.
//
// Reads the JSON exported by either tools/overhead-alignment.html
// (single image, { points, requests }) or
// tools/overhead-alignment-video-player.html (one video, multiple
// annotated frames, { requests, framesByTimestampMs }) and computes
// the authoritative results by calling the real, tested
// computeAnnotatedAngles() from src/manual-annotation/ — this is
// deliberately a separate step from either HTML tool's own live
// preview (which duplicates the same math by hand, in plain JS, since
// both are dependency-free static pages with no build step tying them
// to this TypeScript package). The preview is for interactive
// convenience while placing points; this script is "the script [that]
// limits itself to calculating the angles and returns the data" — the
// one whose numbers should actually be trusted, because they run
// through the same tested code path as everything else in this
// package.
//
// The two export shapes are told apart by which of `points` (a flat
// array — single image) or `framesByTimestampMs` (an object keyed by
// millisecond timestamp — video) the file actually has, rather than
// by file name or a version field neither tool writes.
//
// Usage (compile the test build first, same as the other manual
// scripts — see README.md):
//   npx tsc -p tsconfig.test.json
//   node scripts/compute-annotated-angles.cjs path/to/exported-....json

const fs = require("node:fs");
const path = require("node:path");

const { computeAnnotatedAngles } = require("../dist-test/src");

function printResultsForPoints(points, requests) {
    console.log(`Points (${points.length}):`);
    points.forEach((point) => {
        console.log(`  ${point.name}: (${point.xPixels}, ${point.yPixels})`);
    });

    console.log(`Results (${requests.length} request(s)):`);
    const results = computeAnnotatedAngles(points, requests);
    results.forEach((result) => {
        if (result.error) {
            console.log(`  ${result.id} [${result.type}]: ERRORE — ${result.error}`);
        } else {
            const unitSymbol = result.unit === "degrees" ? "°" : "px";
            console.log(`  ${result.id} [${result.type}]: ${result.value.toFixed(2)}${unitSymbol}`);
        }
    });
}

function main() {
    const jsonFilePath = process.argv[2];
    if (!jsonFilePath) {
        console.error("Usage: node scripts/compute-annotated-angles.cjs <path-to-exported.json>");
        process.exitCode = 1;
        return;
    }

    const resolvedPath = path.resolve(jsonFilePath);
    if (!fs.existsSync(resolvedPath)) {
        console.error(`File not found: ${resolvedPath}`);
        process.exitCode = 1;
        return;
    }

    let data;
    try {
        data = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
    } catch (error) {
        console.error(`Invalid JSON in ${resolvedPath}: ${error.message}`);
        process.exitCode = 1;
        return;
    }

    const requests = Array.isArray(data.requests) ? data.requests : [];

    const isMultiFrame = data.framesByTimestampMs && typeof data.framesByTimestampMs === "object";
    if (isMultiFrame) {
        if (data.videoFileName) {
            console.log(`Video: ${data.videoFileName}`);
        }
        const timestampsMs = Object.keys(data.framesByTimestampMs)
            .map(Number)
            .sort((a, b) => a - b);

        if (timestampsMs.length === 0) {
            console.error("No annotated frames found in the exported file.");
            process.exitCode = 1;
            return;
        }

        timestampsMs.forEach((timestampMs, index) => {
            const points = data.framesByTimestampMs[String(timestampMs)];
            if (index > 0) console.log("");
            console.log(`--- t = ${timestampMs} ms ---`);
            printResultsForPoints(Array.isArray(points) ? points : [], requests);
        });
        return;
    }

    const points = Array.isArray(data.points) ? data.points : [];
    if (points.length === 0) {
        console.error("No points found in the exported file.");
        process.exitCode = 1;
        return;
    }
    printResultsForPoints(points, requests);
}

main();
