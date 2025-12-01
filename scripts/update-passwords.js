/**
 * Update User Passwords Script
 * Updates passwords for all demo users
 */

const { getPool } = require("../src/db");
const { hashPassword } = require("../src/rbacService");

async function updatePasswords() {
  console.log("🔐 Updating user passwords...\n");

  const users = [
    { username: "admin", password: "admin@ued" },
    { username: "manager", password: "manager@ued" },
    { username: "staff", password: "staff@ued" },
    { username: "customer", password: "customer@ued" },
  ];

  try {
    const pool = await getPool();
    console.log("✅ Database connection established\n");

    for (const user of users) {
      const hashedPassword = await hashPassword(user.password);

      await pool
        .request()
        .input("username", user.username)
        .input("hash", hashedPassword)
        .query(
          "UPDATE Users SET password_hash = @hash WHERE username = @username"
        );

      console.log(`  ✓ Updated password for ${user.username}`);
    }

    console.log("\n✅ All passwords updated successfully!");
    console.log("\n📝 New Login Credentials:");
    console.log("   Username: admin    | Password: admin@ued");
    console.log("   Username: manager  | Password: manager@ued");
    console.log("   Username: staff    | Password: staff@ued");
    console.log("   Username: customer | Password: customer@ued");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Password update failed:", error);
    process.exit(1);
  }
}

updatePasswords();
