require("dotenv").config();
const { authenticate } = require("../src/rbacService");

(async () => {
  try {
    const res = await authenticate("admin", "Password123!");
    if (!res) {
      console.error("Login failed for admin.");
      process.exit(1);
    }
    console.log("Login OK. Token length:", res.token.length);
    console.log("User roles:", res.user.roles);
    console.log("Permissions:", res.user.permissions);
    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();
