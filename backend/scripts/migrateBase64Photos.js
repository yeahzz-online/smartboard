const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const { connectMongo } = require("../config/mongo");
const User = require("../mongoModels/User");

async function migrate() {
  await connectMongo();
  console.log("Connected to Mongo for profile photo optimization");

  const users = await User.find({
    profilePhoto: { $regex: /^data:image/ }
  }).select("_id name profilePhoto").lean();

  console.log(`Found ${users.length} users with base64 profile photos.`);

  const profilesDir = path.resolve(__dirname, "..", "uploads", "profiles");
  if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
  }

  for (const user of users) {
    try {
      const dataUrl = user.profilePhoto;
      const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        const fileName = `profile_${user._id}_${Date.now()}.${ext}`;
        const filePath = path.join(profilesDir, fileName);
        fs.writeFileSync(filePath, buffer);
        const fileUrl = `/files/profiles/${fileName}`;

        await User.updateOne({ _id: user._id }, { $set: { profilePhoto: fileUrl } });
        console.log(`Optimized user ${user.name} (${user._id}) -> ${fileUrl} (Saved ${(dataUrl.length / 1024).toFixed(1)} KB)`);
      }
    } catch (e) {
      console.error(`Error migrating user ${user._id}:`, e.message);
    }
  }

  console.log("Migration complete!");
  await mongoose.disconnect();
}

migrate().catch(console.error);
