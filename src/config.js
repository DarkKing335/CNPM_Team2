require("dotenv").config();

const encrypt = (process.env.DB_ENCRYPT || "true").toLowerCase() === "true";
const trust = (process.env.DB_TRUST_CERT || "true").toLowerCase() === "true";
const instanceName = process.env.DB_INSTANCE;
const port = process.env.DB_PORT
  ? parseInt(process.env.DB_PORT, 10)
  : undefined;

const db = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt,
    trustServerCertificate: trust,
  },
};

if (port) {
  db.port = port; // Only set if provided
  // If port is specified, prefer it over instanceName to avoid discovery issues
} else if (instanceName) {
  db.options.instanceName = instanceName; // Named instance support
}

module.exports = {
  db,
  jwtSecret: process.env.JWT_SECRET || "devsecret",
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "10", 10),
};
