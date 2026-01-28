const errorMiddleware = (err, req, res, next) => {
  console.error("[ERROR]", {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl,
    message: err.message,
    stack: err.stack?.split("\n").slice(0, 8),
  });

  const status = err.status || 500;
  const message = status >= 500 ? "Internal server error" : err.message;

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;
