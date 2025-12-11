/* Simple migration runner for SQL Server
   - Reads files from db/migrations ordered by filename
   - Executes each .sql file inside a transaction
   - Skips files that fail with a non-fatal message (but stops on serious errors)
*/
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const { dbConfig } = require('../src/config');

async function run() {
  const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  if (!files.length) {
    console.log('No migration files found in', migrationsDir);
    return;
  }

  console.log('Migrations to run:', files.join(', '));

  const pool = await sql.connect(dbConfig);
  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sqlText = fs.readFileSync(filePath, 'utf8');
      console.log('\n--- Running', file);
      const tx = new sql.Transaction(pool);
      try {
        await tx.begin();
        const req = new sql.Request(tx);
        await req.batch(sqlText);
        await tx.commit();
        console.log('OK', file);
      } catch (err) {
        try { await tx.rollback(); } catch (_) { /* ignore rollback error */ }
        console.error('Migration failed:', file, err.message || err);
        throw err;
      }
    }
  } finally {
    await pool.close();
  }
}

run().catch(err => {
  console.error('Migration runner failed:', err.message || err);
  process.exit(1);
});
