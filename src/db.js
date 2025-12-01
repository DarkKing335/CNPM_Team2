const sql = require("mssql");
const { db } = require("./config");

let poolPromise;

async function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(db).catch((err) => {
      poolPromise = null;
      console.error("SQL Connection Error:", err);
      throw err;
    });
  }
  return poolPromise;
}

module.exports = { getPool };
