const express = require("express");
const { uploadFile } = require("../controllers/upload.controller");
const { pool } = require("../db/pool");

const router = express.Router();

router.post("/", uploadFile);
router.get("/files", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        original_name AS filename,
        file_size AS size,
        public_url_path,
        file_path,
        duration_sec AS duration,
        status,
        mime_type,
        created_on,
        modified_on
      FROM media_files
      ORDER BY created_on DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

module.exports = router;
