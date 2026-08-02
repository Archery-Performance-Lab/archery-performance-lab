// Calibration helper — NOT part of the automated test suite.
//
// A dedicated script for one specific, unusually valuable calibration
// video: a slow-motion, fixed-camera close-up of Kim Woojin's Release
// (Berlin World Cup 2018). Unlike every other calibration video so
// far, this one shows the actual Release — string leaving the
// fingers, string arm starting to move — stretched across many more
// real frames than a normal-speed clip would give. That extra
// temporal resolution is exactly what's needed to check
// phase-detection/detect.ts's "sustained rise over N consecutive
// frames" logic against real, fine-grained ground truth, instead of
// against a release compressed into 2-3 frames like the other videos.
//
// This exists as its own script rather than folding into
// build-calibration-dataset.cjs / detect-phases.cjs for a practical
// reason: those two scan the whole raw-videos/ folder and re-run
// BlazePose against every video in it (18 and counting), which is slow
// when the goal is just to look closely at this one file. This script
// does both jobs — the CSV export and the phase detection — but only
// for this one video, and additionally prints a dense, frame-by-frame
// table around the detected phases (or the peak-velocity moment, if no
// Release was found) so the fine detail this video is actually good
// for is visible directly in the terminal, not just buried in a CSV.
//
// Usage (compile the test build first, same as the other manual
// scripts — see README.md):
//   npx tsc -p tsconfig.test.json
//   node scripts/inspect-slowmo-release.cjs [videoFilePath] [drawSide]
//
// Defaults to the Kim Woojin slow-motion video inside
// CALIBRATION_FOLDER/raw-videos/ (override with the
// APL_CALIBRATION_FOLDER environment variable, same as the other
// scripts) — pass an explicit path as the first argument to point this
// at a different single video instead.

const fs = require("node:fs");
const path = require("node:path");

const tf = require("@tensorflow/tfjs");
require("@tensorflow/tfjs-backend-wasm");

const {
    createPoseDetector,
    analyzeShotVideo,
    readVideoMetadata,
    detectShootingPhases,
    findKeypoint,
    distanceBetweenKeypoints,
    keypointVelocityPixelsPerSecond
} = require("../dist-test/src");

const CALIBRATION_FOLDER =
    process.env.APL_CALIBRATION_FOLDER || "/Users/luigifranchini/Development/apl-video-calibration";
const RAW_VIDEOS_FOLDER = path.join(CALIBRATION_FOLDER, "raw-videos");
const SIGNALS_FOLDER = path.join(CALIBRATION_FOLDER, "signals");
const DEFAULT_VIDEO_FILE_NAME =
    "Kim Woo Jin (KOR) Release - Slow Motion Archery Technique (Berlin World Cup 2018)_720p.mp4";

// How much context to print around the interesting window, so the
// dense per-frame table shows the ramp-up and calm-down either side of
// Release, not just the frames strictly inside it.
const CONTEXT_MILLISECONDS = 500;

function formatNumberOrBlank(value, fractionDigits) {
    return value === null || value === undefined ? "" : value.toFixed(fractionDigits);
}

function writeCsv(filePath, header, rows) {
    const lines = [header.join(",")];
    for (const row of rows) {
        lines.push(row.join(","));
    }
    fs.writeFileSync(filePath, lines.join("\n") + "\n");
}

async function analyzeVideo(videoFilePath, detector, drawSide) {
    const metadata = await readVideoMetadata(videoFilePath);
    const wristKeypointName = `${drawSide}_wrist`;
    const anchorProxyKeypointName = `mouth_${drawSide}`;

    const poseFrames = [];
    const rows = [];
    let previousWristKeypoint = null;
    let previousTimestampMilliseconds = null;

    for await (const poseFrame of analyzeShotVideo(videoFilePath, detector)) {
        poseFrames.push(poseFrame);

        const wristKeypoint = findKeypoint(poseFrame, wristKeypointName);
        const anchorProxyKeypoint = findKeypoint(poseFrame, anchorProxyKeypointName);
        const leftShoulder = findKeypoint(poseFrame, "left_shoulder");
        const rightShoulder = findKeypoint(poseFrame, "right_shoulder");

        const shoulderWidthPixels =
            leftShoulder && rightShoulder
                ? distanceBetweenKeypoints(leftShoulder, rightShoulder)
                : null;

        if (!wristKeypoint) {
            rows.push({
                timestampMilliseconds: poseFrame.timestampMilliseconds,
                distancePixels: null,
                velocityPixelsPerSecond: null,
                velocityShoulderWidthsPerSecond: null,
                shoulderWidthPixels
            });
            continue;
        }

        const distancePixels = anchorProxyKeypoint
            ? distanceBetweenKeypoints(wristKeypoint, anchorProxyKeypoint)
            : null;

        let velocityPixelsPerSecond = null;
        if (previousWristKeypoint && previousTimestampMilliseconds !== null) {
            velocityPixelsPerSecond = keypointVelocityPixelsPerSecond(
                previousWristKeypoint,
                previousTimestampMilliseconds,
                wristKeypoint,
                poseFrame.timestampMilliseconds
            );
        }

        const velocityShoulderWidthsPerSecond =
            velocityPixelsPerSecond !== null && shoulderWidthPixels
                ? velocityPixelsPerSecond / shoulderWidthPixels
                : null;

        rows.push({
            timestampMilliseconds: poseFrame.timestampMilliseconds,
            distancePixels,
            velocityPixelsPerSecond,
            velocityShoulderWidthsPerSecond,
            shoulderWidthPixels
        });

        previousWristKeypoint = wristKeypoint;
        previousTimestampMilliseconds = poseFrame.timestampMilliseconds;
    }

    return { metadata, poseFrames, rows };
}

function printFrameTable(rows, startMilliseconds, endMilliseconds) {
    console.log(
        "  timestamp_ms  wrist_to_mouth_px  velocity_px_s  velocity_sw_s  shoulder_width_px"
    );
    for (const row of rows) {
        if (row.timestampMilliseconds < startMilliseconds || row.timestampMilliseconds > endMilliseconds) {
            continue;
        }
        console.log(
            "  " +
                row.timestampMilliseconds.toFixed(0).padStart(11) +
                "  " +
                formatNumberOrBlank(row.distancePixels, 1).padStart(17) +
                "  " +
                formatNumberOrBlank(row.velocityPixelsPerSecond, 0).padStart(13) +
                "  " +
                formatNumberOrBlank(row.velocityShoulderWidthsPerSecond, 2).padStart(13) +
                "  " +
                formatNumberOrBlank(row.shoulderWidthPixels, 1).padStart(18)
        );
    }
}

async function main() {
    const explicitPath = process.argv[2] && !["left", "right"].includes(process.argv[2]) ? process.argv[2] : null;
    const drawSideArgument = explicitPath ? process.argv[3] : process.argv[2];
    const drawSide = drawSideArgument === "left" ? "left" : "right";

    const videoFilePath = explicitPath || path.join(RAW_VIDEOS_FOLDER, DEFAULT_VIDEO_FILE_NAME);

    if (!fs.existsSync(videoFilePath)) {
        console.error(`Video not found: ${videoFilePath}`);
        process.exitCode = 1;
        return;
    }

    fs.mkdirSync(SIGNALS_FOLDER, { recursive: true });

    console.log(`Video: ${videoFilePath}`);
    console.log("Setting up WASM backend and BlazePose detector...");
    await tf.setBackend("wasm");
    await tf.ready();
    const detector = await createPoseDetector();
    console.log("Detector ready.\n");

    const { metadata, poseFrames, rows } = await analyzeVideo(videoFilePath, detector, drawSide);

    console.log(
        `${metadata.widthPixels}x${metadata.heightPixels}, ${metadata.durationSeconds.toFixed(1)}s, ` +
            `${poseFrames.length} frames analyzed (draw side: ${drawSide}).\n`
    );

    const csvHeader = [
        "timestamp_ms",
        "wrist_to_mouth_distance_px",
        "wrist_velocity_px_per_s",
        "wrist_velocity_shoulder_widths_per_s",
        "shoulder_width_px"
    ];
    const csvRows = rows.map((row) => [
        row.timestampMilliseconds.toFixed(1),
        formatNumberOrBlank(row.distancePixels, 1),
        formatNumberOrBlank(row.velocityPixelsPerSecond, 0),
        formatNumberOrBlank(row.velocityShoulderWidthsPerSecond, 2),
        formatNumberOrBlank(row.shoulderWidthPixels, 1)
    ]);
    const csvFilePath = path.join(SIGNALS_FOLDER, `${path.parse(videoFilePath).name}.csv`);
    writeCsv(csvFilePath, csvHeader, csvRows);
    console.log(`Full per-frame data: ${csvFilePath}\n`);

    const segments = detectShootingPhases(poseFrames, { drawSide });

    if (segments.length === 0) {
        console.log("detectShootingPhases(): No Release found (or no sustained velocity rise detected).");

        const rowsWithVelocity = rows.filter((row) => row.velocityPixelsPerSecond !== null);
        const peakRow = rowsWithVelocity.reduce(
            (max, row) => (row.velocityPixelsPerSecond > (max?.velocityPixelsPerSecond ?? -Infinity) ? row : max),
            null
        );
        if (peakRow) {
            console.log(
                `Showing frames around the peak velocity moment instead ` +
                    `(t=${peakRow.timestampMilliseconds.toFixed(0)}ms) so there's still something concrete to check:\n`
            );
            printFrameTable(
                rows,
                peakRow.timestampMilliseconds - CONTEXT_MILLISECONDS,
                peakRow.timestampMilliseconds + CONTEXT_MILLISECONDS
            );
        }
        return;
    }

    console.log("detectShootingPhases():");
    for (const segment of segments) {
        console.log(
            `  ${segment.phase}: ${(segment.startTimeMilliseconds / 1000).toFixed(2)}s -> ` +
                `${(segment.endTimeMilliseconds / 1000).toFixed(2)}s`
        );
    }

    const windowStart = segments[0].startTimeMilliseconds - CONTEXT_MILLISECONDS;
    const windowEnd = segments[segments.length - 1].endTimeMilliseconds + CONTEXT_MILLISECONDS;
    console.log(
        `\nPer-frame detail from ${(windowStart / 1000).toFixed(2)}s to ${(windowEnd / 1000).toFixed(2)}s ` +
            `(detected phases +/- ${CONTEXT_MILLISECONDS}ms of context) — scrub the real video to these ` +
            `exact timestamps and confirm what actually happened:\n`
    );
    printFrameTable(rows, windowStart, windowEnd);
}

main().catch((error) => {
    console.error("Failed:", error);
    process.exitCode = 1;
});
