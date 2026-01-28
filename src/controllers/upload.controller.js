const { handleFileUpload } = require("../services/upload.service");
//const { getMediaById } = require("../services/file.service");

async function uploadFile(req, res, next) {
  try {
    await handleFileUpload(req, res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadFile,
};
