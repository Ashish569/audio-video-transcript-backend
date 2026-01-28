const express = require("express");
const { pool } = require("../db/pool");

const router = express.Router();
// GET /api/transcription/:mediaId
router.get("/:mediaId", async (req, res) => {
  const { mediaId } = req.params;

  try {
    // 1. Get metadata
    const metaResult = await pool.query(
      `SELECT language, model_used, created_on
       FROM transcriptions
       WHERE media_file_id = $1`,
      [mediaId],
    );

    // 2. Get segments
    const segmentsResult = await pool.query(
      `SELECT start_time, end_time, content, confidence
       FROM transcription_segments
       WHERE media_file_id = $1
       ORDER BY start_time`,
      [mediaId],
    );

    const metadata = metaResult.rows[0] || null;
    const segments = segmentsResult.rows;

    if (!metadata && segments.length === 0) {
      return res.status(404).json({ error: "No transcription found" });
    }

    res.json({
      metadata,
      segments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch transcription" });
  }
});
module.exports = router;
