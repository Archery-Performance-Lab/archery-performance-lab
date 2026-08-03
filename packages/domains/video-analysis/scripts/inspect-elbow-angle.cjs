// Calibration helper — NOT part of the automated test suite.
//
// Computes the draw arm's elbow bend angle (shoulder-elbow-wrist,
// via biomechanics/angleAtJointDegrees — already existed, this script
// is new, the calculation is not) frame by frame for every video in
// the calibration folder, writes a CSV per video, and renders an SVG
// line chart of the angle over time. The idea (and the specific
// signal) came from a plain, out-of-context suggestion for archery
// video analysis in general — Python + MediaPipe + OpenCV, tracking
// shoulder alignment, draw-arm elbow angle, bow-arm extension, wrist
// stability, with an elbow-angle-over-time chart called out as useful
// for judging whether a Release is fluid. That advice wasn't wrong,
// just not aware this project already has the equivalent building
// block (angleAtJointDegrees) in TypeScript/tfjs rather than Python/
// MediaPipe — same underlying BlazePose model either way, see
// README.md for the fuller reasoning on why this project stays in one
// language/runtime rather than adding a second one for video alone.
//
// Usage (compile the test build first, same as the other manual
// scripts — see README.md):
//   npx tsc -p tsconfig.test.json
//   node scripts/inspect-elbow-angle.cjs [right|left]
//
// Scans CALIBRATION_FOLDER/raw-videos/*.{mov,mp4} by default, same as
// the other batch scripts — override with the APL_CALIBRATION_FOLDER
// environment variable. Writes CSVs to signals/ and SVG charts to a
// new charts/ subfolder (both outside this repository — see
// README.md's calibration section for why).

const fs = require("node:fs");
const path = require("node:path");

const tf = require("@tensorflow/tfjs");
require("@tensorflow/tfjs-backend-wasm");

const {
    createPoseDetector,
    analyzeShotVideo,
    readVideoMetadata,
    findKeypoint,
    angleAtJointDegrees
} = require("../dist-test/src");
const { renderSvgLineChart } = require("./lib/render-svg-line-chart.cjs");

const CALIBRATION_FOLDER =
    process.env.APL_CALIBRATION_FOLDER || "/Users/luigifranchini/Development/apl-video-calibration";
const RAW_VIDEOS_FOLDER = path.join(CALIBRATION_FOLDER, "raw-videos");
const SIGNALS_FOLDER = path.join(CALIBRATION_FOLDER, "signals");
const CHARTS_FOLDER = path.join(CALIBRATION_FOLDER, "charts");
const VIDEO_FILE_EXTENSIONS = [".mov", ".mp4"];

// Same warmup caveat documented in build-calibration-dataset.cjs and
// detect-phases.cjs: the pose detector's first ~300ms is frequently
// unstable, which would show up here as elbow-angle jitter that has
// nothing to do with the archer's real movement. Excluded from the
// chart/CSV for that reason — though note (see
// hand-tension/texture.ts's doc comment for a real example) this
// heuristic has already been found insufficient for at least one
// video whose instability ran longer than 300ms; a suspiciously noisy
// chart is still worth checking against the real video before
// trusting it.
const WARMUP_EXCLUSION_MILLISECONDS = 300;

function findVideoFiles(folderPath) {
    return fs
        .readdirSync(folderPath)
        .filter((fileName) => VIDEO_FILE_EXTENSIONS.includes(path.extname(fileName).toLowerCase()))
        .map((fileName) => path.join(folderPath, fileName))
        .sort();
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

async function computeElbowAngleSeries(videoFilePath, detector, drawSide) {
    const shoulderKeypointName = `${drawSide}_shoulder`;
    const elbowKeypointName = `${drawSide}_elbow`;
    const wristKeypointName = `${drawSide}_wrist`;

    const rows = [];

    for await (const poseFrame of analyzeShotVideo(videoFilePath, detector)) {
        if (poseFrame.timestampMilliseconds < WARMUP_EXCLUSION_MILLISECONDS) {
            continue;
        }

        const shoulder = findKeypoint(poseFrame, shoulderKeypointName);
        const elbow = findKeypoint(poseFrame, elbowKeypointName);
        const wrist = findKeypoint(poseFrame, wristKeypointName);

        let elbowAngleDegrees = null;
        if (shoulder && elbow && wrist) {
            try {
                elbowAngleDegrees = angleAtJointDegrees(shoulder, elbow, wrist);
            } catch {
                // angleAtJointDegrees() throws when a keypoint
                // collapses onto the joint (zero-length ray) — a real
                // data problem for that one frame, not fatal to the
                // rest of the series. Recorded as a gap (null), not
                // silently skipped from the CSV entirely.
                elbowAngleDegrees = null;
            }
        }

        rows.push({ timestampMilliseconds: poseFrame.timestampMilliseconds, elbowAngleDegrees });
    }

    return rows;
}

async function main() {
    const drawSide = process.argv[2] === "left" ? "left" : "right";

    if (!fs.existsSync(RAW_VIDEOS_FOLDER)) {
        console.error(`Raw videos folder not found: ${RAW_VIDEOS_FOLDER}`);
        process.exitCode = 1;
        return;
    }

    fs.mkdirSync(SIGNALS_FOLDER, { recursive: true });
    fs.mkdirSync(CHARTS_FOLDER, { recursive: true });

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

    for (const videoFilePath of videoFilePaths) {
        const videoFileName = path.basename(videoFilePath);
        const videoBaseName = path.parse(videoFileName).name;
        console.log(`Processing ${videoFileName}...`);

        // Same reasoning as build-calibration-dataset.cjs and
        // detect-phases.cjs: one bad video should not take the rest of
        // the batch down with it.
        let metadata;
        let rows;
        try {
            metadata = await readVideoMetadata(videoFilePath);
            rows = await computeElbowAngleSeries(videoFilePath, detector, drawSide);
        } catch (error) {
            console.error(`  Failed: ${error.message ?? error}\n`);
            continue;
        }

        const csvFilePath = path.join(SIGNALS_FOLDER, `${videoBaseName}_elbow-angle.csv`);
        writeCsv(
            csvFilePath,
            ["timestamp_ms", "draw_arm_elbow_angle_degrees"],
            rows.map((row) => [
                row.timestampMilliseconds.toFixed(1),
                formatNumberOrBlank(row.elbowAngleDegrees, 2)
            ])
        );

        const chartPoints = rows
            .filter((row) => row.elbowAngleDegrees !== null)
            .map((row) => ({ x: row.timestampMilliseconds, y: row.elbowAngleDegrees }));

        const svg = renderSvgLineChart({
            points: chartPoints,
            title: `${videoFileName} — draw-arm elbow angle (${drawSide})`,
            xAxisLabel: "Time (ms)",
            yAxisLabel: "Elbow angle (degrees)"
        });

        if (svg === null) {
            console.log(`  No usable elbow-angle data (missing keypoints throughout) — skipping chart.\n`);
            continue;
        }

        const chartFilePath = path.join(CHARTS_FOLDER, `${videoBaseName}_elbow-angle.svg`);
        fs.writeFileSync(chartFilePath, svg);

        console.log(
            `  ${metadata.widthPixels}x${metadata.heightPixels}, ${metadata.durationSeconds.toFixed(1)}s, ` +
                `${chartPoints.length} usable frames.`
        );
        console.log(`  CSV: ${csvFilePath}`);
        console.log(`  Chart: ${chartFilePath}\n`);
    }

    console.log("Done. Open the .svg charts in a browser to see each video's elbow-angle curve.");
}

main().catch((error) => {
    console.error("Failed:", error);
    process.exitCode = 1;
});
