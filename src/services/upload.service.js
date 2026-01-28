const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { randomUUID } = require("crypto");
const Busboy = require("busboy");
const { getDuration } = require("./ffmpeg.service");
const { startProcessingInBackground } = require("./processing.service");
const { pool } = require("../db/pool");

async function handleFileUpload(req, res) {
  const uploadId = randomUUID();
  const uploadDir = path.join(
    __dirname,
    "../../",
    process.env.UPLOAD_TEMP_DIR || "./uploads",
    uploadId
  );

  let fileReceived = false;
  let originalName = null;
  let mimeType = null;
  let filePath = null;
  let fileSize = 0;

  const cleanup = async () => {
    try {
      await fsPromises.rm(uploadDir, { recursive: true, force: true });
    } catch {}
  };

  try {
    await fsPromises.mkdir(uploadDir, { recursive: true });

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: 20 * 1024 * 1024 * 1024, // 20GB
      },
    });

    busboy.on("file", (fieldname, file, info) => {
      if (fieldname !== "file") {
        file.resume();
        return;
      }

      // ✅ File detected
      fileReceived = true;

      originalName = info.filename || "unnamed_file";
      mimeType = info.mimeType || "application/octet-stream";

      const safeName = originalName
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 200);

      filePath = path.join(uploadDir, safeName);
      const publicUrl = `/uploads/${uploadId}/${safeName}`;

      const writeStream = fs.createWriteStream(filePath);

      file.on("data", (chunk) => {
        fileSize += chunk.length;
      });

      file.on("limit", async () => {
        writeStream.destroy();
        await cleanup();
        if (!res.headersSent) {
          res.status(413).json({ error: "File too large" });
        }
      });

      writeStream.on("error", async (err) => {
        await cleanup();
        if (!res.headersSent) {
          res
            .status(500)
            .json({ error: "File write failed", message: err.message });
        }
      });

      writeStream.on("finish", async () => {
        // 🔁 Async side-effects ONLY
        let durationSec = null;
        try {
          durationSec = await getDuration(filePath);
          console.log(`Duration extracted: ${durationSec} seconds`);
        } catch (probeErr) {
          console.warn(
            `Failed to get duration for ${uploadId}:`,
            probeErr.message
          );
          // Continue anyway — duration can be NULL
        }
        try {
          await pool.query(
            `INSERT INTO media_files
             (id, original_name, stored_name, file_path, mime_type, file_size, status, duration_sec,public_url_path)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              uploadId,
              originalName,
              safeName,
              filePath,
              mimeType,
              fileSize,
              "uploaded",
              durationSec,
              publicUrl,
            ]
          );

          console.log(`Metadata saved: ${uploadId}`);
          startProcessingInBackground(uploadId).catch(async (err) => {
            console.error(`Background processing failed for ${uploadId}:`, err);

            // Optional: mark failed
            await pool.query(
              `UPDATE media_files
         SET status = 'failed',
             error_message = $1,
             modified_on = NOW()
         WHERE id = $2`,
              [err.message || "Background processing error", uploadId]
            );
          });
        } catch (err) {
          console.error("DB insert failed:", err);
          pool
            .query(
              `UPDATE media_files
               SET status = 'failed', error_message = $1, modified_on = NOW()
               WHERE id = $2`,
              [err.message, uploadId]
            )
            .catch(console.error);
        }
      });

      file.pipe(writeStream);
    });

    busboy.on("finish", () => {
      if (!fileReceived) {
        return res.status(400).json({ error: "No valid file received" });
      }

      res.status(201).json({
        id: uploadId,
        original_name: originalName,
        file_size: fileSize,
        status: "uploaded",
        created_at: new Date().toISOString(),
        message: "Upload completed. Processing started in background.",
      });
    });

    busboy.on("error", async (err) => {
      await cleanup();
      if (!res.headersSent) {
        res
          .status(500)
          .json({ error: "Upload processing error", message: err.message });
      }
    });

    req.pipe(busboy);
  } catch (err) {
    console.error("Upload setup failed:", err);
    await cleanup();
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "Upload setup failed", message: err.message });
    }
  }
}

module.exports = { handleFileUpload };
