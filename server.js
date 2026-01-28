require("dotenv").config();

const http = require("http");
const app = require("./src/app");

const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || "development";
const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`Listening on port - http://localhost:${PORT}`);
});
server.setTimeout(0); // overall request timeout
server.headersTimeout = 0; // headers timeout
server.requestTimeout = 0; // Node v18+
server.keepAliveTimeout = 0; // keep connection alive
const gracefulShutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);

  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error("Could not close connections in time — forcing shutdown");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION Shutting down...");
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION!");
  console.error("Reason:", reason);
  // process.exit(1);
});
