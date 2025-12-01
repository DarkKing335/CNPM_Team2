require("dotenv").config();
const { getPool } = require("../src/db");
const { hashPassword } = require("../src/rbacService");

async function main() {
  const [, , username, password] = process.argv;
  if (!username || !password) {
    console.error("Usage: node scripts/set-password.js <username> <password>");
    process.exit(1);
  }
  try {
    const hash = await hashPassword(password);
    const pool = await getPool();
    const req = pool.request();
    req.input("username", username);
    req.input("hash", hash);
    const result = await req.query(
      "UPDATE Users SET password_hash=@hash WHERE username=@username; SELECT @@ROWCOUNT AS affected;"
    );
    const affected = result.recordset[0]?.affected || 0;
    if (affected === 0) {
      console.error("No user updated. Check if the username exists.");
      process.exit(2);
    }
    console.log(`Updated password for '${username}'.`);
    process.exit(0);
  } catch (err) {
    console.error("Error updating password:", err.message);
    process.exit(1);
  }
}

main();
