const { Pool } = require("pg");
require("dotenv").config();

// PostgreSQL connection pool configuration
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "transcription_db",
  password: process.env.DB_PASSWORD || "postgres",
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
});

module.exports = {
  pool,
};
