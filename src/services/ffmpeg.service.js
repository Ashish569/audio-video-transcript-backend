const ffmpeg = require("fluent-ffmpeg");
const fsPromises = require("fs").promises;
async function getDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error("ffprobe error:", err);
        return reject(err);
      }

      const duration = metadata.format?.duration;
      if (typeof duration === "number" && !isNaN(duration)) {
        resolve(duration); // in seconds
      } else {
        reject(new Error("Could not determine duration"));
      }
    });
  });
}
const extractAudio = async (inputPath, outputPath) => {
  if (!outputPath) {
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, path.extname(inputPath));
    outputPath = path.join(outputDir, `${baseName}_audio.wav`);
  }
  try {
    await fsPromises.access(outputPath);
    console.log(`[ffmpeg] Audio already exists: ${outputPath}`);
    return outputPath;
  } catch {
    // proceed
  }
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec("pcm_s16le")
      .audioFrequency(16000)
      .audioChannels(1)
      .format("wav")
      .on("start", (cmd) => console.log("[ffmpeg] Started:", cmd))
      .on("progress", (p) => console.log(`[ffmpeg] ${p.percent?.toFixed(1)}%`))
      .on("error", (err, stdout, stderr) => {
        console.error("[ffmpeg] Failed:", stderr || err);
        reject(err);
      })
      .on("end", () => {
        console.log(`[ffmpeg] Extracted → ${outputPath}`);
        resolve(outputPath);
      })
      .save(outputPath);
  });
  // return new Promise((resolve, reject) => {
  //   ffmpeg(inputPath)
  //     .toFormat("wav")
  //     .audioFrequency(16000) // 16kHz is standard for AI models
  //     .audioChannels(1) // Mono reduces file size further
  //     .on("start", (command) => console.log("FFmpeg started:", command))
  //     .on("error", (err) => {
  //       console.error("FFmpeg Error:", err);
  //       reject(err);
  //     })
  //     .on("end", () => {
  //       console.log("FFmpeg: Audio extraction complete");
  //       resolve(outputPath);
  //     })
  //     .save(outputPath);
  // });
};

module.exports = { extractAudio, getDuration };
