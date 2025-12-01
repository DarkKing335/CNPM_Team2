/**
 * Database Initialization Script
 * This script:
 * 1. Runs the schema.sql to create tables and seed initial data
 * 2. Hashes passwords for demo users
 * 3. Verifies the setup is complete
 */

const fs = require("fs");
const path = require("path");
const { getPool } = require("../src/db");
const { hashPassword } = require("../src/rbacService");

async function initDatabase() {
  console.log("🔧 Starting database initialization...\n");

  try {
    const pool = await getPool();
    console.log("✅ Database connection established");

    // Read and execute schema.sql
    console.log("\n📋 Executing schema.sql...");
    const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");

    // Split by GO statements and execute each batch
    const batches = schemaSql
      .split(/^\s*GO\s*$/gim)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    for (let i = 0; i < batches.length; i++) {
      try {
        await pool.request().query(batches[i]);
        console.log(`  ✓ Batch ${i + 1}/${batches.length} executed`);
      } catch (err) {
        console.error(`  ✗ Error in batch ${i + 1}:`, err.message);
        throw err;
      }
    }

    console.log("✅ Schema created successfully");

    // Hash passwords for demo users (custom per user)
    console.log("\n🔐 Hashing passwords for demo users...");
    const userPasswords = {
      admin: "admin@ued",
      manager: "manager@ued",
      staff: "staff@ued",
      customer: "customer@ued",
    };

    for (const [username, plain] of Object.entries(userPasswords)) {
      const hash = await hashPassword(plain);
      await pool
        .request()
        .input("username", username)
        .input("hash", hash)
        .query(
          "UPDATE Users SET password_hash = @hash WHERE username = @username"
        );
      console.log(`  ✓ Password set for ${username}`);
    }

    console.log("✅ All passwords hashed to requested values");

    // Verify setup
    console.log("\n🔍 Verifying database setup...");

    const rolesCount = await pool
      .request()
      .query("SELECT COUNT(*) as count FROM Roles");
    console.log(`  ✓ Roles: ${rolesCount.recordset[0].count}`);

    const permsCount = await pool
      .request()
      .query("SELECT COUNT(*) as count FROM Permissions");
    console.log(`  ✓ Permissions: ${permsCount.recordset[0].count}`);

    const usersCount = await pool
      .request()
      .query("SELECT COUNT(*) as count FROM Users");
    console.log(`  ✓ Users: ${usersCount.recordset[0].count}`);

    const ordersCount = await pool
      .request()
      .query("SELECT COUNT(*) as count FROM Orders");
    console.log(`  ✓ Orders: ${ordersCount.recordset[0].count}`);

    const rolePermsCount = await pool
      .request()
      .query("SELECT COUNT(*) as count FROM RolePermissions");
    console.log(`  ✓ Role-Permissions: ${rolePermsCount.recordset[0].count}`);

    const customersCount = await pool
      .request()
      .query("SELECT COUNT(*) as count FROM Customers");
    console.log(`  ✓ Customers: ${customersCount.recordset[0].count}`);

    console.log("\n✅ Database initialization complete!");
    console.log("\n📝 Test Credentials:");
    console.log("   Username: admin    | Password: admin@ued");
    console.log("   Username: manager  | Password: manager@ued");
    console.log("   Username: staff    | Password: staff@ued");
    console.log("   Username: customer | Password: customer@ued");
    console.log("\n🚀 You can now start the server with: npm run dev");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Database initialization failed:", error);
    process.exit(1);
  }
}

initDatabase();
