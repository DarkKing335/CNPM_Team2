const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { jwtSecret, bcryptRounds } = require("./config");
const repo = require("./rbacRepository");

async function authenticate(username, password) {
  const user = await repo.getUserByUsername(username);
  const valid = await repo.verifyPassword(user, password);
  if (!valid) return null;
  const permissions = await repo.getUserPermissions(user.id);
  const roles = await repo.getUserRoles(user.id);
  const payload = {
    sub: user.id,
    username: user.username,
    roles: roles.map((r) => r.name_role),
    permissions: permissions.map((p) => ({
      name_permission: p.name_permission,
      module: p.module,
    })),
  };
  const token = jwt.sign(payload, jwtSecret, {
    expiresIn: "1h",
    algorithm: "HS256",
  });
  return { token, user: payload };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, jwtSecret, { algorithms: ["HS256"] });
  } catch (err) {
    // Log token errors for security monitoring
    if (err.name === "TokenExpiredError") {
      console.warn("Token expired");
    } else if (err.name === "JsonWebTokenError") {
      console.warn("Invalid token signature");
    }
    return null;
  }
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, bcryptRounds);
}

module.exports = { authenticate, verifyToken, hashPassword };
