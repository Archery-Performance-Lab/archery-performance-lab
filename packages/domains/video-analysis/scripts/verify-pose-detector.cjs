// Manual verification script — NOT part of the automated test suite.
//
// Why not a real automated test: BlazePose model weights are
// downloaded from Google's model hosting the first time a detector is
// created, so this needs network access at run time (unlike the fast,
// deterministic, offline unit tests in test/). It also takes several
// seconds to load the model, which is too slow for a suite meant to
// run on every change.
//
// Run from packages/domains/video-analysis:
//   node scripts/verify-pose-detector.cjs

require("@tensorflow/tfjs-node");
const tf = require("@tensorflow/tfjs-node");
const poseDetection = require("@tensorflow-models/pose-detection");

async function main() {
    console.log("Creating BlazePose (tfjs runtime) detector...");
    const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.BlazePose,
        { runtime: "tfjs", modelType: "full" }
    );
    console.log("Detector created successfully.");

    // A synthetic 256x256 RGB image (random noise). This won't contain
    // a real person, so a low/zero pose score is expected — the point
    // of this script is only to confirm the pipeline runs end-to-end
    // without crashing, not to validate detection accuracy.
    const syntheticFrame = tf.randomUniform([256, 256, 3], 0, 255, "int32");

    console.log("Running estimatePoses() on a synthetic frame...");
    const poses = await detector.estimatePoses(syntheticFrame);
    console.log(`estimatePoses() returned ${poses.length} pose(s).`);

    if (poses[0]) {
        console.log(`First pose has ${poses[0].keypoints.length} keypoints.`);
        console.log("Example keypoint:", poses[0].keypoints[0]);
    }

    syntheticFrame.dispose();
    detector.dispose();

    console.log("OK: pose-detection pipeline runs end-to-end.");
}

main().catch((error) => {
    console.error("Verification failed:", error);
    process.exitCode = 1;
});
