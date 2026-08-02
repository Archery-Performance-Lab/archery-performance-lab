// Calibration helper — NOT part of the automated test suite.
//
// Computes hand-tension/'s texture metric (variance of the Laplacian —
// see src/hand-tension/texture.ts's doc comment for the full
// reasoning) frame by frame around the draw-side wrist, for one video
// at a time. This is a candidate proxy for a real coaching
// observation: a tensed hand visibly shows its tendons standing out
// under the skin, a relaxed one doesn't — something BlazePose's
// keypoint model cannot see directly (no individual finger joints),
// but that a texture/edge-density measure over a cropped hand region
// might approximate.
//
// This is genuinely unvalidated: nobody has yet checked whether this
// metric's real values actually rise around Anchor/Expansion (real
// tension) versus a relaxed moment, in real footage. That is exactly
// what this script is for — print real numbers against real
// timestamps so they can be checked against what the video actually
// shows, same discipline as every other calibration script here.
//
// Usage (compile the test build first, same as the other manual
// scripts — see README.md):
//   npx tsc -p tsconfig.test.json
//   node scripts/inspect-hand-tension.cjs [videoFilePath] [right|left]
//
// Defaults to the Kim Woojin slow-motion video (same default as
// inspect-slowmo-release.cjs) — the highest-resolution, closest-in
// footage available, and so the best current candidate for seeing
// whether this metric carries any real signal at all before trying it
// on anything else.

const fs = require("node:fs");
const path = require("node:path");

const tf = require("@tensorflow/tfjs");
require("@tensorflow/tfjs-backend-wasm");

const {
    createPoseDetector,
    analyzeShotVideoWithFrames,
    readVideoMetadata,
    findKeypoint,
    distanceBetweenKeypoints,
    computeCropRegionAroundKeypoint,
    cropFrameRegion,
    computeHandTensionMetric
} = require("../dist-test/src");

const CALIBRATION_FOLDER =
    process.env.APL_CALIBRATION_FOLDER || "/Users/luigifranchini/Development/apl-video-calibration";
const RAW_VIDEOS_FOLDER = path.join(CALIBRATION_FOLDER, "raw-videos");
const SIGNALS_FOLDER = path.join(CALIBRATION_FOLDER, "signals");
const DEFAULT_VIDEO_FILE_NAME =
    "Kim Woo Jin (KOR) Release - Slow Motion Archery Technique (Berlin World Cup 2018)_720p.mp4";

// How large a crop region to analyze, relative to the archer's
// shoulder width in that same frame — the same scale-normalization
// reasoning used throughout this package (see
// build-calibration-dataset.cjs): a fixed pixel size would only be
// right for one video's resolution/camera distance. 0.6x shoulder
// width is a starting guess at "large enough to contain the hand,
// small enough to stay mostly hand and not forearm/background" — not
// a validated number, revisit once real crops can be inspected.
const CROP_SIZE_SHOULDER_WIDTH_MULTIPLIER = 0.6;

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

    const rows = [];

    for await (const { poseFrame, frame } of analyzeShotVideoWithFrames(videoFilePath, detector)) {
        try {
            const wristKeypoint = findKeypoint(poseFrame, wristKeypointName);
            const leftShoulder = findKeypoint(poseFrame, "left_shoulder");
            const rightShoulder = findKeypoint(poseFrame, "right_shoulder");

            const shoulderWidthPixels =
                leftShoulder && rightShoulder
                    ? distanceBetweenKeypoints(leftShoulder, rightShoulder)
                    : null;

            if (!wristKeypoint || !shoulderWidthPixels) {
                rows.push({
                    timestampMilliseconds: poseFrame.timestampMilliseconds,
                    handTensionMetric: null,
                    shoulderWidthPixels,
                    cropSizePixels: null
                });
                continue;
            }

            const cropSizePixels = shoulderWidthPixels * CROP_SIZE_SHOULDER_WIDTH_MULTIPLIER;
            const region = computeCropRegionAroundKeypoint(
                wristKeypoint,
                cropSizePixels,
                frame.shape[1],
                frame.shape[0]
            );

            let handTensionMetric = null;
            const cropped = cropFrameRegion(frame, region);
            try {
                handTensionMetric = computeHandTensionMetric(cropped);
            } finally {
                cropped.dispose();
            }

            rows.push({
                timestampMilliseconds: poseFrame.timestampMilliseconds,
                handTensionMetric,
                shoulderWidthPixels,
                cropSizePixels
            });
        } finally {
            frame.dispose();
        }
    }

    return { metadata, rows };
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

    const { metadata, rows } = await analyzeVideo(videoFilePath, detector, drawSide);

    console.log(
        `${metadata.widthPixels}x${metadata.heightPixels}, ${metadata.durationSeconds.toFixed(1)}s, ` +
            `${rows.length} frames analyzed (draw side: ${drawSide}).\n`
    );

    const csvHeader = [
        "timestamp_ms",
        "hand_tension_metric",
        "shoulder_width_px",
        "crop_size_px"
    ];
    const csvRows = rows.map((row) => [
        row.timestampMilliseconds.toFixed(1),
        formatNumberOrBlank(row.handTensionMetric, 3),
        formatNumberOrBlank(row.shoulderWidthPixels, 1),
        formatNumberOrBlank(row.cropSizePixels, 1)
    ]);
    const csvFilePath = path.join(SIGNALS_FOLDER, `${path.parse(videoFilePath).name}_hand-tension.csv`);
    writeCsv(csvFilePath, csvHeader, csvRows);
    console.log(`Full per-frame data: ${csvFilePath}`);

    const rowsWithMetric = rows.filter((row) => row.handTensionMetric !== null);
    if (rowsWithMetric.length > 0) {
        const peakRow = rowsWithMetric.reduce(
            (max, row) => (row.handTensionMetric > max.handTensionMetric ? row : max)
        );
        const minRow = rowsWithMetric.reduce(
            (min, row) => (row.handTensionMetric < min.handTensionMetric ? row : min)
        );
        console.log(
            `\nHighest tension metric: ${peakRow.handTensionMetric.toFixed(3)} at ` +
                `t=${peakRow.timestampMilliseconds.toFixed(0)}ms. ` +
                `Lowest: ${minRow.handTensionMetric.toFixed(3)} at t=${minRow.timestampMilliseconds.toFixed(0)}ms.`
        );
        console.log(
            "Scrub the real video to both of those timestamps: does the higher-metric moment " +
                "actually look tenser (visible tendons) than the lower one? That comparison is " +
                "the whole point of this script — the metric means nothing until checked against " +
                "what a human sees."
        );
    }
}

main().catch((error) => {
    console.error("Failed:", error);
    process.exitCode = 1;
});
