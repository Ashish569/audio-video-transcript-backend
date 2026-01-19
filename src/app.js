const express = require("express");
//const cors = require('cors');


// Routes
const apiRouter = require("./routes");

const morgan = require("morgan");

const app = express();
app.use(express.json());
app.use(morgan("dev"));
// all API endpoints
app.use("/api", apiRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    path: req.originalUrl,
    method: req.method,
  });
});


module.exports = app;
