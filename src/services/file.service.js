// src/services/file.service.js

const { pool } = require("../db/pool");
const fsPromises = require("fs").promises;
const path = require("path");

async function getMediaById(id) {
  try {
    const result = await pool.query(
      `SELECT 
         id, original_name, stored_name, file_path, mime_type,
         file_size, duration_sec, status, error_message,
         created_on, modified_on
       FROM media_files
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error(`[file.service] Failed to get media ${id}:`, err.message);
    throw err;
  }
}

async function updateMedia(id, updates) {
  const { status, error_message = null, duration_sec = null } = updates;

  try {
    const result = await pool.query(
      `UPDATE media_files
       SET 
         status = COALESCE($1, status),
         error_message = COALESCE($2, error_message),
         duration_sec = COALESCE($3, duration_sec),
         modified_on = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, status, modified_on`,
      [status, error_message, duration_sec, id]
    );

    return result.rows[0] || null;
  } catch (err) {
    console.error(`[file.service] Failed to update media ${id}:`, err.message);
    throw err;
  }
}

async function markAsFailed(id, errorMessage = "Unknown error") {
  return updateMedia(id, { status: "failed", error_message: errorMessage });
}

async function markAsCompleted(id, durationSec = null) {
  return updateMedia(id, { status: "completed", duration_sec: durationSec });
}

async function cleanupUploadTemp(uploadId) {
  try {
    const tempDir = path.join(
      __dirname,
      "../../",
      process.env.UPLOAD_TEMP_DIR || "./uploads",
      uploadId
    );

    await fsPromises.rm(tempDir, { recursive: true, force: true });
    console.log(`[file.service] Cleaned temp dir: ${tempDir}`);
  } catch (err) {
    console.warn(`[file.service] Cleanup failed for ${uploadId}:`, err.message);
  }
}

async function getRecentFiles(limit = 20, statusFilter = null) {
  let query = `
    SELECT 
      id, original_name, file_size, duration_sec, status,
      created_on, modified_on
    FROM media_files
  `;
  const params = [];

  if (statusFilter) {
    query += ` WHERE status = $${params.length + 1}`;
    params.push(statusFilter);
  }

  query += ` ORDER BY created_on DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const { rows } = await pool.query(query, params);
  return rows;
}

module.exports = {
  getMediaById,
  updateMedia,
  markAsFailed,
  markAsCompleted,
  cleanupUploadTemp,
  getRecentFiles,
};
