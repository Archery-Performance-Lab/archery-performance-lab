// Calibration helper — NOT part of the automated test suite, and not
// meant to stay in daily use once real thresholds exist.
//
// Runs the full pipeline (frame extraction + pose estimation) over a
// real video and prints, frame by frame, two biomechanics/ signals
// for the draw-side wrist: its velocity (pixels/second) and its
// distance to a face keypoint used as an anchor-point proxy. The
// point is to look at these numbers next to a real, watched video and
// see what a real Release velocity spike / a real Anchor distance
// plateau actually look like in practice — turning "what threshold
// should we use" from a guess into a read from real data, per this
// project's standing rule against inventing unsourced numbers (see
// README.md's "Next steps").
//
// Usage (compile the test build first, same as the other manual
// scripts — see README.md):
//   npx tsc -p tsconfig.test.json
//   node scripts/inspect-pose-signals.cjs <path-to-video> [drawSide]
//
// drawSide: "right" (default, for a right-handed archer whose right
// hand draws the string) or "left". BlazePose's own "left_"/"right_"
// keypoint prefixes follow the pictured person's own anatomical
// sides, not raw image left/right, so this does not depend on camera
// placement (in front of vs. behind the archer) — only on which hand
// actually draws the string.

const path = require("node:path");

const tf = require("@tensorflow/tfjs");
require("@tensorflow/tfjs-backend-wasm");

const {
    createPoseDetector,
    analyzeShotVideo,
    findKeypoint,
    distanceBetweenKeypoints,
    keypointVelocityPixelsPerSecond
} = require("../dist-test/src");

// Default path so this also works when run without command-line
// arguments (e.g. clicking "Run" in an editor rather than a
// terminal) — change this if the video moves or you want to analyze
// a different file. Passing a path as the first argument (see the
// Usage comment above) always overrides this default.
const DEFAULT_VIDEO_FILE_PATH = "/Users/luigifranchini/Desktop/IMG_1230.mov";

async function main() {
    const videoFilePath = process.argv[2] || DEFAULT_VIDEO_FILE_PATH;
    const drawSide = process.argv[3] === "left" ? "left" : "right";

    if (!videoFilePath) {
        console.error("Usage: node scripts/inspect-pose-signals.cjs <path-to-video> [drawSide]");
        process.exitCode = 1;
        return;
    }

    console.log(`Analyzing: ${videoFilePath} (draw side: ${drawSide})\n`);

    const wristKeypointName = `${drawSide}_wrist`;
    // A face keypoint near where the string hand actually contacts at
    // anchor (under the chin/jaw). BlazePose has no "chin" keypoint;
    // "mouth_right"/"mouth_left" on the draw side is the closest
    // built-in landmark to that contact point.
    const anchorProxyKeypointName = `mouth_${drawSide}`;

    console.log(`Setting up WASM backend and BlazePose detector...`);
    await tf.setBackend("wasm");
    await tf.ready();
    const detector = await createPoseDetector();
    console.log("Detector ready. Processing video (this can take a while)...\n");

    console.log(
        [
            "timestamp_ms",
            `${wristKeypointName}_to_${anchorProxyKeypointName}_distance_px`,
            `${wristKeypointName}_velocity_px_per_s`
        ].join("\t")
    );

    let previousWristKeypoint = null;
    let previousTimestampMilliseconds = null;

    for await (const poseFrame of analyzeShotVideo(videoFilePath, detector)) {
        const wristKeypoint = findKeypoint(poseFrame, wristKeypointName);
        const anchorProxyKeypoint = findKeypoint(poseFrame, anchorProxyKeypointName);

        if (!wristKeypoint) {
            console.log(`${poseFrame.timestampMilliseconds}\t(no ${wristKeypointName} detected)`);
            continue;
        }

        const distancePixels = anchorProxyKeypoint
            ? distanceBetweenKeypoints(wristKeypoint, anchorProxyKeypoint).toFixed(1)
            : "n/a";

        let velocityPixelsPerSecond = "n/a";
        if (previousWristKeypoint && previousTimestampMilliseconds !== null) {
            velocityPixelsPerSecond = keypointVelocityPixelsPerSecond(
                previousWristKeypoint,
                previousTimestampMilliseconds,
                wristKeypoint,
                poseFrame.timestampMilliseconds
            ).toFixed(0);
        }

        console.log(
            [poseFrame.timestampMilliseconds, distancePixels, velocityPixelsPerSecond].join("\t")
        );

        previousWristKeypoint = wristKeypoint;
        previousTimestampMilliseconds = poseFrame.timestampMilliseconds;
    }

    console.log("\nDone.");
}

main().catch((error) => {
    console.error("Failed:", error);
    process.exitCode = 1;
});
