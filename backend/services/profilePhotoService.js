function saveBase64Image(dataUrl, userId = "user") {
  if (!dataUrl || typeof dataUrl !== "string") return dataUrl;
  if (!dataUrl.startsWith("data:image/")) return dataUrl;

  // Keep profile photos in MongoDB instead of the deployment's local disk.
  // Local upload folders are ephemeral on Render/Vercel-style deployments,
  // which caused profile and CR-page photos to disappear after a restart.
  // The frontend already limits photos to a small image data URL.
  return dataUrl;
}

module.exports = {
  saveBase64Image
};
