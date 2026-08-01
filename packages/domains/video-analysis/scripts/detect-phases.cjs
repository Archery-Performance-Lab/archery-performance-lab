// Validation helper — NOT part of the automated test suite.
//
// Runs the (still provisional — see src/phase-detection/detect.ts)
// phase detector against every video in the calibration folder and
// prints the detected Anchor/Release/FollowThrough segments in
// seconds, so you can scrub to those exact moments in the real video
// and confirm whether they actually match what happened — the
// validate-and-refine workflow this detector was built for. Anything
// wrong here should turn into an adjustment of the thresholds/logic
// in detect.ts, not a one-off fix to this script.
//
// Usage (compile the test build first, same as the other manual
// scripts — see README.md):
//   npx tsc -p tsconfig.test.json
//   node scripts/detect-phases.cjs [drawSide]
//
// Scans CALIBRATION_FOLDER/raw-videos/*.{mov,mp4} by default, same as
// build-calibration-dataset.cjs — override with the
// APL_CALIBRATION_FOLDER environment variable.

const fs = require("node:fs");
const path = require("node:path");

const tf = require("@tensorflow/tfjs");
require("@tensorflow/tfjs-backend-wasm");

const { createPoseDetector, analyzeShotVideo, detectShootingPhases } = require("../dist-test/src");

const CALIBRATION_FOLDER =
    process.env.APL_CALIBRATION_FOLDER || "/Users/luigifranchini/Development/apl-video-calibration";
const RAW_VIDEOS_FOLDER = path.join(CALIBRATION_FOLDER, "raw-videos");
const VIDEO_FILE_EXTENSIONS = [".mov", ".mp4"];

function findVideoFiles(folderPath) {
    return fs
        .readdirSync(folderPath)
        .filter((fileName) => VIDEO_FILE_EXTENSIONS.includes(path.extname(fileName).toLowerCase()))
        .map((fileName) => path.join(folderPath, fileName))
        .sort();
}

function formatSeconds(milliseconds) {
    return (milliseconds / 1000).toFixed(2) + "s";
}

async function main() {
    const drawSide = process.argv[2] === "left" ? "left" : "right";

    if (!fs.existsSync(RAW_VIDEOS_FOLDER)) {
        console.error(`Raw videos folder not found: ${RAW_VIDEOS_FOLDER}`);
        process.exitCode = 1;
        return;
    }

    const videoFilePaths = findVideoFiles(RAW_VIDEOS_FOLDER);
    if (videoFilePaths.length === 0) {
        console.log(`No .mov/.mp4 files found in ${RAW_VIDEOS_FOLDER}`);
        return;
    }

    console.log(`Found ${videoFilePaths.length} video(s). Setting up detector...\n`);
    await tf.setBackend("wasm");
    await tf.ready();
    const detector = await createPoseDetector();

    for (const videoFilePath of videoFilePaths) {
        const videoFileName = path.basename(videoFilePath);
        console.log(`${videoFileName}:`);

        const poseFrames = [];
        for await (const poseFrame of analyzeShotVideo(videoFilePath, detector)) {
            poseFrames.push(poseFrame);
        }

        const segments = detectShootingPhases(poseFrames, { drawSide });

        if (segments.length === 0) {
            console.log("  No Release found (or no sustained velocity rise detected).\n");
            continue;
        }

        for (const segment of segments) {
            console.log(
                `  ${segment.phase}: ${formatSeconds(segment.startTimeMilliseconds)} -> ${formatSeconds(segment.endTimeMilliseconds)}`
            );
        }
        console.log("");
    }

    console.log("Done. Scrub to these timestamps in the real videos and check against what actually happened.");
}

main().catch((error) => {
    console.error("Failed:", error);
    process.exitCode = 1;
});
