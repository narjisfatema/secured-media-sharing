import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import { UhfsClient } from "@bsv/sdk";

const app = express();
app.use(cors());

// Temporary upload folder
const upload = multer({ dest: "uploads/" });

// UHRP / UHFS Endpoint
const Uhfs_SERVER = "https://nanostore.babbage.systems";

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    console.log("📥 File received:", req.file.originalname);

    const fileBuffer = fs.readFileSync(req.file.path);

    // Create UHFS client
    const client = new UHFSClient({
      server: Uhfs_SERVER,
    });

    // Upload to UHFS/UHRP
    const response = await client.upload({
      data: fileBuffer,
      contentType: req.file.mimetype,
      retention: "1y", // store 1 year
    });

    console.log("✔ Uploaded to UHRP:", response.url);

    res.json({
      success: true,
      uhrpUrl: response.url,
      size: response.size,
      hash: response.hash,
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 UHFS Server running at http://localhost:3000");
});
