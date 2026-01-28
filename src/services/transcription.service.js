// src/services/transcription.service.js

const path = require("path");
const { pool } = require("../db/pool");
const { execSync } = require("child_process");
const fsPromises = require("fs").promises;
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
async function runFasterWhisper(audioPath) {
  try {
    const outputDir = path.dirname(audioPath);
    const command = `whisper "${audioPath}" --model base --output_format json --output_dir "${outputDir}"`;

    console.log(`[whisper] Running async: ${command}`);

    const { stdout, stderr } = await execPromise(command, {
      maxBuffer: 1024 * 1024 * 20,
      env: process.env,
    });

    // if (stderr && !stderr.includes("INFO") && !stderr.includes("WARNING")) {
    //   throw new Error(`Whisper error: ${stderr}`);
    // }

    const jsonPath = path.join(
      outputDir,
      `${path.basename(audioPath, path.extname(audioPath))}.json`
    );
    const jsonContent = await fsPromises.readFile(jsonPath, "utf8");
    const result = JSON.parse(jsonContent.trim());

    return {
      segments: result.segments || [],
      language: result.language || "en",
      model: "base",
    };
  } catch (err) {
    console.error("[whisper] Failed:", err);
    throw err;
  }
}

async function saveTranscription(mediaId, transcriptionData) {
  const client = await pool.connect();

  try {
    console.log(
      `Saving ${transcriptionData.segments.length} segments for media ${mediaId}`
    );
    await client.query("BEGIN");

    // Insert metadata into transcriptions (if you keep it)
    await client.query(
      `INSERT INTO transcriptions (media_file_id, language, model_used)
       VALUES ($1, $2, $3)
       ON CONFLICT (media_file_id) DO UPDATE SET
         language = EXCLUDED.language,
         model_used = EXCLUDED.model_used`,
      [mediaId, transcriptionData.language, transcriptionData.model]
    );

    // Insert each segment
    for (const seg of transcriptionData.segments) {
      await client.query(
        `INSERT INTO transcription_segments (
          media_file_id, start_time, end_time, content, confidence
        ) VALUES ($1, $2, $3, $4, $5)`,
        [mediaId, seg.start, seg.end, seg.text.trim(), seg.confidence || null]
      );
    }

    await client.query("COMMIT");
    console.log(
      `Saved ${transcriptionData.segments.length} segments for media ${mediaId}`
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to save segments:", err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  runFasterWhisper,
  saveTranscription,
};
