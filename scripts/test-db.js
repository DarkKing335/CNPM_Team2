const { getPool } = require("../src/db");
const { db } = require("../src/config");

(async () => {
  try {
    console.log("Attempting DB connection with:", {
      server: db.server,
      instanceName: db.options && db.options.instanceName,
      port: db.port,
      encrypt: db.options && db.options.encrypt,
      trustServerCertificate: db.options && db.options.trustServerCertificate,
      database: db.database,
      user: db.user,
    });

    const pool = await getPool();
    const info = await pool.request().query(`
      SELECT 
        HOST_NAME() AS host_name,
        SUSER_SNAME() AS login,
        DB_NAME() AS db_name,
        SERVERPROPERTY('MachineName') AS machine,
        SERVERPROPERTY('InstanceName') AS instance_name,
        @@VERSION AS version;
    `);
    console.log("✅ Connected. Server info:");
    console.table(info.recordset);

    const ping = await pool.request().query("SELECT 1 AS ok");
    console.log("Ping:", ping.recordset[0]);
    process.exit(0);
  } catch (err) {
    console.error("❌ DB ERROR:", err.message);
    if (err.code) console.error("Code:", err.code);
    if (err.originalError && err.originalError.info)
      console.error("Info:", err.originalError.info);
    console.error(
      "Hint: If using a named instance (e.g., ADMIN\\SQLEXPRESS), either start SQL Browser service or set an explicit TCP port in .env (DB_PORT) and remove DB_INSTANCE."
    );
    process.exit(1);
  }
})();
