// Calibration helper — NOT part of the automated test suite, and not
// meant to stay in daily use once real thresholds exist.
//
// Batch version of the original single-video calibration script:
// scans a folder of real shot videos, runs the full pipeline (frame
// extraction + pose estimation) over each one, and writes out the
// draw-side wrist's velocity and its distance to a face keypoint
// (anchor-point proxy) for every frame — plus a normalized velocity,
// see below. The goal, same as before, is reading real thresholds off
// real footage rather than inventing them (see README.md's "Next
// steps" and this project's standing rule against unsourced magic
// numbers).
//
// Why normalized velocity: the first calibration video (IMG_1230.mov,
// 720x1280) and these next two (IMG_1220.MOV 1080x1920, IMG_1221.MOV
// 1920x1080 — note: landscape, not portrait) are all different
// resolutions and camera distances. A raw "1500 pixels/second" release
// spike in one video is not the same real-world hand speed as
// "1500 pixels/second" in another — pixel scale depends on how far the
// camera is and how many pixels the frame has. Dividing velocity by
// the archer's own shoulder width (left_shoulder to right_shoulder
// distance, in the same frame) gives a roughly scale-invariant
// "shoulder-widths per second" figure that should be more comparable
// across videos, without needing real camera calibration (focal
// length, distance to subject) this package doesn't have.
//
// Usage (compile the test build first, same as the other manual
// scripts — see README.md):
//   npx tsc -p tsconfig.test.json
//   node scripts/build-calibration-dataset.cjs [drawSide]
//
// Scans CALIBRATION_FOLDER/raw-videos/*.{mov,mp4} (case-insensitive)
// by default. Writes one CSV per video to CALIBRATION_FOLDER/signals/,
// plus an aggregate CALIBRATION_FOLDER/signals/_summary.csv row per
// video (peak velocity and its timestamp, minimum distance and its
// timestamp — quick pointers to go re-watch the source video at that
// exact moment and confirm what really happened there).
//
// drawSide: "right" (default) or "left" — applies to every video
// scanned in this run. Videos with a different draw side need a
// separate run (or edit this script to detect it automatically later,
// once there's a reason to).

const fs = require("node:fs");
const path = require("node:path");

const tf = require("@tensorflow/tfjs");
require("@tensorflow/tfjs-backend-wasm");

const {
    createPoseDetector,
    analyzeShotVideo,
    readVideoMetadata,
    findKeypoint,
    distanceBetweenKeypoints,
    keypointVelocityPixelsPerSecond
} = require("../dist-test/src");

const CALIBRATION_FOLDER =
    process.env.APL_CALIBRATION_FOLDER || "/Users/luigifranchini/Development/apl-video-calibration";
const RAW_VIDEOS_FOLDER = path.join(CALIBRATION_FOLDER, "raw-videos");
const SIGNALS_FOLDER = path.join(CALIBRATION_FOLDER, "signals");
const VIDEO_FILE_EXTENSIONS = [".mov", ".mp4"];

function findVideoFiles(folderPath) {
    return fs
        .readdirSync(folderPath)
        .filter((fileName) => VIDEO_FILE_EXTENSIONS.includes(path.extname(fileName).toLowerCase()))
        .map((fileName) => path.join(folderPath, fileName))
        .sort();
}

async function analyzeVideo(videoFilePath, detector, drawSide) {
    const metadata = await readVideoMetadata(videoFilePath);
    const wristKeypointName = `${drawSide}_wrist`;
    // A face keypoint near where the string hand actually contacts at
    // anchor (under the chin/jaw). BlazePose has no "chin" keypoint;
    // "mouth_right"/"mouth_left" on the draw side is the closest
    // built-in landmark to that contact point.
    const anchorProxyKeypointName = `mouth_${drawSide}`;

    const rows = [];
    let previousWristKeypoint = null;
    let previousTimestampMilliseconds = null;

    for await (const poseFrame of analyzeShotVideo(videoFilePath, detector)) {
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

    return { metadata, rows };
}

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

async function main() {
    const drawSide = process.argv[2] === "left" ? "left" : "right";

    if (!fs.existsSync(RAW_VIDEOS_FOLDER)) {
        console.error(`Raw videos folder not found: ${RAW_VIDEOS_FOLDER}`);
        process.exitCode = 1;
        return;
    }

    fs.mkdirSync(SIGNALS_FOLDER, { recursive: true });

    const videoFilePaths = findVideoFiles(RAW_VIDEOS_FOLDER);
    if (videoFilePaths.length === 0) {
        console.log(`No .mov/.mp4 files found in ${RAW_VIDEOS_FOLDER}`);
        return;
    }

    console.log(`Found ${videoFilePaths.length} video(s) in ${RAW_VIDEOS_FOLDER}`);
    console.log("Setting up WASM backend and BlazePose detector...");
    await tf.setBackend("wasm");
    await tf.ready();
    const detector = await createPoseDetector();
    console.log("Detector ready.\n");

    const summaryRows = [];

    for (const videoFilePath of videoFilePaths) {
        const videoFileName = path.basename(videoFilePath);
        console.log(`Processing ${videoFileName}...`);

        // One bad file (e.g. a truncated/corrupt video) used to crash
        // the whole batch here: the error propagated straight past this
        // loop to main()'s top-level catch, which meant every video
        // after the failing one never got processed, AND _summary.csv
        // (written once, after the loop) never got written at all --
        // silently discarding every successful result from this run,
        // not just the failed video. Caught here instead: log which
        // video failed and why, record a FAILED row in the summary
        // (visible, not silently dropped), and keep going.
        let metadata;
        let rows;
        try {
            ({ metadata, rows } = await analyzeVideo(videoFilePath, detector, drawSide));
        } catch (error) {
            console.error(`  Failed: ${error.message ?? error}\n`);
            summaryRows.push([videoFileName, "", "", "", drawSide, "", "", "", "", "", "FAILED"]);
            continue;
        }

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

        const csvFilePath = path.join(SIGNALS_FOLDER, `${path.parse(videoFileName).name}.csv`);
        writeCsv(csvFilePath, csvHeader, csvRows);

        // The first real calibration videos showed the pose detector
        // needs a moment to "lock on": shoulder width (which should be
        // roughly constant for a static camera and standing archer)
        // swung wildly frame to frame at the very start of several
        // clips (e.g. 111px -> 169px -> 309px within 33ms in one
        // video, before settling to a stable ~328px for the rest of
        // it), producing spurious multi-thousand-pixel/second
        // "velocity" readings that were startup noise, not a real
        // Release. Excluding this warm-up window from the summary
        // stats (not from the CSV itself, which keeps every frame)
        // avoids those false peaks — see README.md for the full
        // reasoning and this being a heuristic to revisit as more
        // videos are analyzed, not a settled number.
        const WARMUP_EXCLUSION_MILLISECONDS = 300;
        const stableRows = rows.filter(
            (row) => row.timestampMilliseconds >= WARMUP_EXCLUSION_MILLISECONDS
        );

        const rowsWithVelocity = stableRows.filter((row) => row.velocityPixelsPerSecond !== null);
        const rowsWithDistance = stableRows.filter((row) => row.distancePixels !== null);

        const peakVelocityRow = rowsWithVelocity.reduce(
            (max, row) => (row.velocityPixelsPerSecond > (max?.velocityPixelsPerSecond ?? -Infinity) ? row : max),
            null
        );
        const minDistanceRow = rowsWithDistance.reduce(
            (min, row) => (row.distancePixels < (min?.distancePixels ?? Infinity) ? row : min),
            null
        );

        summaryRows.push([
            videoFileName,
            metadata.widthPixels,
            metadata.heightPixels,
            metadata.durationSeconds.toFixed(2),
            drawSide,
            peakVelocityRow ? peakVelocityRow.velocityPixelsPerSecond.toFixed(0) : "",
            peakVelocityRow ? peakVelocityRow.velocityShoulderWidthsPerSecond.toFixed(2) : "",
            peakVelocityRow ? peakVelocityRow.timestampMilliseconds.toFixed(0) : "",
            minDistanceRow ? minDistanceRow.distancePixels.toFixed(1) : "",
            minDistanceRow ? minDistanceRow.timestampMilliseconds.toFixed(0) : "",
            "OK"
        ]);

        console.log(
            `  ${metadata.widthPixels}x${metadata.heightPixels}, ${metadata.durationSeconds.toFixed(1)}s. ` +
                `Peak wrist velocity: ${peakVelocityRow ? peakVelocityRow.velocityPixelsPerSecond.toFixed(0) : "n/a"} px/s ` +
                `(${peakVelocityRow ? peakVelocityRow.velocityShoulderWidthsPerSecond.toFixed(2) : "n/a"} shoulder-widths/s) ` +
                `at t=${peakVelocityRow ? peakVelocityRow.timestampMilliseconds.toFixed(0) : "n/a"}ms. ` +
                `Closest wrist-to-mouth approach: ${minDistanceRow ? minDistanceRow.distancePixels.toFixed(1) : "n/a"}px ` +
                `at t=${minDistanceRow ? minDistanceRow.timestampMilliseconds.toFixed(0) : "n/a"}ms.`
        );
        console.log(`  Full data: ${csvFilePath}\n`);
    }

    const summaryHeader = [
        "video",
        "width_px",
        "height_px",
        "duration_s",
        "draw_side",
        "peak_velocity_px_per_s",
        "peak_velocity_shoulder_widths_per_s",
        "peak_velocity_timestamp_ms",
        "min_wrist_to_mouth_distance_px",
        "min_distance_timestamp_ms",
        "status"
    ];
    writeCsv(path.join(SIGNALS_FOLDER, "_summary.csv"), summaryHeader, summaryRows);

    console.log(`Summary written to ${path.join(SIGNALS_FOLDER, "_summary.csv")}`);
    console.log("Done.");
}

main().catch((error) => {
    console.error("Failed:", error);
    process.exitCode = 1;
});
