// Add this at the bottom of upload.service.js (or in a new processing.service.js)

const { extractAudio } = require("./ffmpeg.service");
const {
  runFasterWhisper,
  saveTranscription,
} = require("./transcription.service");
const { updateMedia, cleanupUploadTemp } = require("./file.service");
const path = require("path");
const { pool } = require("../db/pool");

async function startProcessingInBackground(uploadId) {
  try {
    console.log(`Starting background processing for upload ${uploadId}`);

    // 1. Update status
    await updateMedia(uploadId, { status: "processing" });

    // 2. Get file path from DB
    const media = await pool.query(
      "SELECT file_path FROM media_files WHERE id = $1",
      [uploadId]
    );
    if (media.rowCount === 0) throw new Error("Media record not found");

    const inputPath = media.rows[0].file_path;
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, path.extname(inputPath));
    audioPath = path.join(outputDir, `${baseName}_audio.wav`);
    // 3. Extract audio
    audioPath = await extractAudio(inputPath, audioPath);

    // 4. Run transcription
    const transcriptionData = await runFasterWhisper(audioPath);

    // 5. Save transcription result
    console.log(
      `Saving transcription for upload ${uploadId}`,
      transcriptionData
    );
    await saveTranscription(uploadId, transcriptionData);

    // 6. Mark as completed
    await updateMedia(uploadId, { status: "completed" });

    // 7. Optional: cleanup temp files
    //await cleanupUploadTemp(uploadId);

    console.log(`Processing completed successfully for ${uploadId}`);
  } catch (err) {
    console.error(`Processing failed for ${uploadId}:`, err);
    await updateMedia(uploadId, {
      status: "failed",
      error_message: err.message || "Unknown error",
    });
  }
}

module.exports = { startProcessingInBackground };
