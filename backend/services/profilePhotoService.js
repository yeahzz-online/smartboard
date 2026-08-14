const fs = require("fs");
const path = require("path");

function saveBase64Image(dataUrl, userId = "user") {
  if (!dataUrl || typeof dataUrl !== "string") return dataUrl;
  if (!dataUrl.startsWith("data:image/")) return dataUrl;

  try {
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) return dataUrl;

    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const uploadsDir = path.resolve(__dirname, "..", "uploads", "profiles");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `profile_${userId}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    return `/files/profiles/${fileName}`;
  } catch (err) {
    console.error("Error saving base64 profile image:", err.message);
    return dataUrl;
  }
}

module.exports = {
  saveBase64Image
};
