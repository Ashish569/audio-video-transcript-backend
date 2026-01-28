const express = require("express");
const cors = require("cors");
const errorMiddleware = require("./middleware/error.middleware");
const path = require("path");
// Routes
const apiRouter = require("./routes/index");

const morgan = require("morgan");

const app = express();

app.use(cors());
// app.use(express.json());
app.use(morgan("dev"));
// all API endpoints
// At the top of app.js or server.js (after const app = express())
console.log("Serving static files from /uploads directory", __dirname);
console.log("Static URL path: /uploads", path.join(__dirname, "../uploads"));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api", apiRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    path: req.originalUrl,
    method: req.method,
  });
});
app.use(errorMiddleware);

module.exports = app;
