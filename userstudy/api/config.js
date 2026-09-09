// Exposes the deployment's configuration, so the save endpoint is not baked into the bundle.
export default function handler(req, res) {
  res.status(200).json({
    videoUrl: process.env.TUTORIAL_VIDEO_URL || "tutorial.mp4",
    saveEndpoint: process.env.RESULTS_SAVE_ENDPOINT || ""
  });
}
