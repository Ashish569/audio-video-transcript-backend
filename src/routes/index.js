const express = require("express");

const uploadRouter = require("./upload.routes");
const transcriptionRouter = require("./transcription.routes");

const router = express.Router();

router.use("/upload", uploadRouter);
router.use("/transcription", transcriptionRouter);

module.exports = router;
