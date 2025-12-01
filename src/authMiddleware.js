const repo = require("./rbacRepository");
const { verifyToken } = require("./rbacService");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Invalid token" });
  req.user = decoded;
  next();
}

function requirePermission(action, module) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const has = req.user.permissions.some(
      (p) => p.name_permission === action && p.module === module
    );
    if (!has)
      return res.status(403).json({ error: "Forbidden: lacking permission" });
    next();
  };
}

function requireRole(roleName) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const ok =
      Array.isArray(req.user.roles) && req.user.roles.includes(roleName);
    if (!ok) return res.status(403).json({ error: "Forbidden: role required" });
    next();
  };
}

module.exports = { requireAuth, requirePermission, requireRole };
