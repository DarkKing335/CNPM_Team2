const path = require("path");
const express = require("express");
const { authenticate, hashPassword } = require("./rbacService");
const {
  requireAuth,
  requirePermission,
  requireRole,
} = require("./authMiddleware");
const { getPool } = require("./db");
const repo = require("./rbacRepository");

const app = express();

// Error logger
function logError(error, context = "") {
  console.error(
    `[${new Date().toISOString()}] ERROR ${context}:`,
    error.message
  );
  if (error.stack) console.error(error.stack);
}

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    logError(err, req.path);
    next(err);
  });
};

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  next();
});

app.use(express.json({ limit: "10kb" })); // Limit payload size
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "login.html"));
});

app.get(
  "/health",
  asyncHandler(async (req, res) => {
    try {
      const pool = await getPool();
      await pool.request().query("SELECT 1 AS health");
      res.json({
        status: "ok",
        database: "connected",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError(err, "health-check");
      res.status(503).json({
        status: "error",
        database: "disconnected",
        message: err.message,
      });
    }
  })
);

app.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ error: "Username & password required" });
    }

    // Type validation
    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Invalid input type" });
    }

    // Length validation
    if (
      username.length > 100 ||
      password.length > 255 ||
      username.length < 1 ||
      password.length < 1
    ) {
      return res.status(400).json({ error: "Invalid input length" });
    }

    // Sanitize input
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      return res.status(400).json({ error: "Username cannot be empty" });
    }

    try {
      const result = await authenticate(cleanUsername, password);
      if (!result) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      res.json(result);
    } catch (e) {
      logError(e, "login");
      res.status(500).json({ error: "Authentication failed" });
    }
  })
);

// Get user profile
app.get(
  "/auth/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      userId: req.user.sub,
      username: req.user.username,
      roles: req.user.roles || [],
      permissions: req.user.permissions || [],
    });
  })
);

// Change password
app.post(
  "/auth/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current and new passwords are required" });
    }

    // Type validation
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string"
    ) {
      return res.status(400).json({ error: "Invalid input type" });
    }

    // Length validation
    if (newPassword.length < 6 || newPassword.length > 255) {
      return res
        .status(400)
        .json({ error: "New password must be 6-255 characters" });
    }

    if (currentPassword.length < 1 || currentPassword.length > 255) {
      return res.status(400).json({ error: "Invalid current password length" });
    }

    // Check if new password is different
    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: "New password must be different from current password",
      });
    }

    try {
      // Verify current password
      const user = await repo.getUserByUsername(req.user.username);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      }

      // Hash and update new password
      const newHash = await bcrypt.hash(newPassword, 10);
      await repo.updateUserPassword(user.user_id, newHash);

      res.json({ message: "Password changed successfully" });
    } catch (e) {
      logError(e, "change-password");
      res.status(500).json({ error: "Failed to change password" });
    }
  })
);

// Protected Order routes
app.get(
  "/orders",
  requireAuth,
  requirePermission("View", "Order"),
  asyncHandler(async (req, res) => {
    try {
      const { page, pageSize, sort, dir, search } = req.query;
      const paged = await repo.getOrdersPaged({
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 10,
        sort: sort || "created_at",
        dir: dir || "desc",
        search: typeof search === "string" ? search.trim() : "",
      });
      res.json({
        data: paged.rows,
        page: paged.page,
        pageSize: paged.pageSize,
        total: paged.total,
        totalPages: Math.ceil(paged.total / paged.pageSize),
        sort: paged.sort,
        dir: paged.dir,
        search: paged.search,
        user: req.user,
      });
    } catch (e) {
      logError(e, "get-orders");
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  })
);

app.post(
  "/orders",
  requireAuth,
  requirePermission("Add", "Order"),
  asyncHandler(async (req, res) => {
    try {
      const {
        item,
        customer_name,
        customer_phone,
        customer_email,
        customer_address,
      } = req.body;
      if (!item || typeof item !== "string" || item.trim().length === 0) {
        return res.status(400).json({ error: "Order item is required" });
      }
      if (item.length > 500) {
        return res
          .status(400)
          .json({ error: "Order item too long (max 500 characters)" });
      }
      if (
        !customer_name ||
        typeof customer_name !== "string" ||
        customer_name.trim().length === 0
      ) {
        return res.status(400).json({ error: "Customer name is required" });
      }
      if (customer_name.length > 100) {
        return res
          .status(400)
          .json({ error: "Customer name too long (max 100 characters)" });
      }
      if (customer_phone && String(customer_phone).length > 20) {
        return res
          .status(400)
          .json({ error: "Customer phone too long (max 20 characters)" });
      }
      if (customer_email && String(customer_email).length > 100) {
        return res
          .status(400)
          .json({ error: "Customer email too long (max 100 characters)" });
      }
      if (customer_address && String(customer_address).length > 255) {
        return res
          .status(400)
          .json({ error: "Customer address too long (max 255 characters)" });
      }
      const order = await repo.createOrder(item.trim(), req.user.sub, {
        customer_name: customer_name.trim(),
        customer_phone: customer_phone ? String(customer_phone).trim() : null,
        customer_email: customer_email ? String(customer_email).trim() : null,
        customer_address: customer_address
          ? String(customer_address).trim()
          : null,
      });
      res.status(201).json({ message: "Order created", data: order });
    } catch (e) {
      logError(e, "create-order");
      res.status(500).json({ error: "Failed to create order" });
    }
  })
);

app.put(
  "/orders/:id",
  requireAuth,
  requirePermission("Edit", "Order"),
  asyncHandler(async (req, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      if (!Number.isFinite(orderId) || orderId < 1) {
        return res.status(400).json({ error: "Invalid order ID" });
      }
      const {
        item,
        customer_name,
        customer_phone,
        customer_email,
        customer_address,
      } = req.body;
      if (!item || typeof item !== "string" || item.trim().length === 0) {
        return res.status(400).json({ error: "Order item is required" });
      }
      if (item.length > 500) {
        return res
          .status(400)
          .json({ error: "Order item too long (max 500 characters)" });
      }
      if (
        !customer_name ||
        typeof customer_name !== "string" ||
        customer_name.trim().length === 0
      ) {
        return res.status(400).json({ error: "Customer name is required" });
      }
      if (customer_name.length > 100) {
        return res
          .status(400)
          .json({ error: "Customer name too long (max 100 characters)" });
      }
      if (customer_phone && String(customer_phone).length > 20) {
        return res
          .status(400)
          .json({ error: "Customer phone too long (max 20 characters)" });
      }
      if (customer_email && String(customer_email).length > 100) {
        return res
          .status(400)
          .json({ error: "Customer email too long (max 100 characters)" });
      }
      if (customer_address && String(customer_address).length > 255) {
        return res
          .status(400)
          .json({ error: "Customer address too long (max 255 characters)" });
      }
      const order = await repo.updateOrder(orderId, item.trim(), {
        customer_name: customer_name.trim(),
        customer_phone: customer_phone ? String(customer_phone).trim() : null,
        customer_email: customer_email ? String(customer_email).trim() : null,
        customer_address: customer_address
          ? String(customer_address).trim()
          : null,
      });
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json({ message: "Order updated", data: order });
    } catch (e) {
      logError(e, "update-order");
      res.status(500).json({ error: "Failed to update order" });
    }
  })
);

app.delete(
  "/orders/:id",
  requireAuth,
  requirePermission("Delete", "Order"),
  asyncHandler(async (req, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      if (!Number.isFinite(orderId) || orderId < 1) {
        return res.status(400).json({ error: "Invalid order ID" });
      }
      await repo.deleteOrder(orderId);
      res.json({ message: "Order deleted", id: orderId });
    } catch (e) {
      logError(e, "delete-order");
      res.status(500).json({ error: "Failed to delete order" });
    }
  })
);

// Protected Customer routes
app.get(
  "/customers",
  requireAuth,
  requirePermission("View", "Customer"),
  asyncHandler(async (req, res) => {
    try {
      const { page, pageSize, sort, dir, search } = req.query;
      const paged = await repo.getCustomersPaged({
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 10,
        sort: sort || "created_at",
        dir: dir || "desc",
        search: typeof search === "string" ? search.trim() : "",
      });
      res.json({
        data: paged.rows,
        page: paged.page,
        pageSize: paged.pageSize,
        total: paged.total,
        totalPages: Math.ceil(paged.total / paged.pageSize),
        sort: paged.sort,
        dir: paged.dir,
        search: paged.search,
        user: req.user,
      });
    } catch (e) {
      logError(e, "get-customers");
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  })
);

app.post(
  "/customers",
  requireAuth,
  requirePermission("Add", "Customer"),
  asyncHandler(async (req, res) => {
    try {
      const { name, phone, email, address } = req.body || {};
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Customer name is required" });
      }
      if (name.length > 100) {
        return res.status(400).json({ error: "Name too long (max 100)" });
      }
      if (phone && String(phone).length > 20)
        return res.status(400).json({ error: "Phone too long (max 20)" });
      if (email && String(email).length > 100)
        return res.status(400).json({ error: "Email too long (max 100)" });
      if (address && String(address).length > 255)
        return res.status(400).json({ error: "Address too long (max 255)" });
      const customer = await repo.createCustomer(
        {
          name: name.trim(),
          phone: phone ? String(phone).trim() : null,
          email: email ? String(email).trim() : null,
          address: address ? String(address).trim() : null,
        },
        req.user.sub
      );
      res.status(201).json({ message: "Customer created", data: customer });
    } catch (e) {
      logError(e, "create-customer");
      res.status(500).json({ error: "Failed to create customer" });
    }
  })
);

app.put(
  "/customers/:id",
  requireAuth,
  requirePermission("Edit", "Customer"),
  asyncHandler(async (req, res) => {
    try {
      const customerId = parseInt(req.params.id, 10);
      if (!Number.isFinite(customerId) || customerId < 1) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }
      const { name, phone, email, address } = req.body || {};
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Customer name is required" });
      }
      if (name.length > 100) {
        return res.status(400).json({ error: "Name too long (max 100)" });
      }
      if (phone && String(phone).length > 20)
        return res.status(400).json({ error: "Phone too long (max 20)" });
      if (email && String(email).length > 100)
        return res.status(400).json({ error: "Email too long (max 100)" });
      if (address && String(address).length > 255)
        return res.status(400).json({ error: "Address too long (max 255)" });
      const customer = await repo.updateCustomer(customerId, {
        name: name.trim(),
        phone: phone ? String(phone).trim() : null,
        email: email ? String(email).trim() : null,
        address: address ? String(address).trim() : null,
      });
      if (!customer)
        return res.status(404).json({ error: "Customer not found" });
      res.json({ message: "Customer updated", data: customer });
    } catch (e) {
      logError(e, "update-customer");
      res.status(500).json({ error: "Failed to update customer" });
    }
  })
);

app.delete(
  "/customers/:id",
  requireAuth,
  requirePermission("Delete", "Customer"),
  asyncHandler(async (req, res) => {
    try {
      const customerId = parseInt(req.params.id, 10);
      if (!Number.isFinite(customerId) || customerId < 1) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }
      await repo.deleteCustomer(customerId);
      res.json({ message: "Customer deleted", id: customerId });
    } catch (e) {
      logError(e, "delete-customer");
      res.status(500).json({ error: "Failed to delete customer" });
    }
  })
);

// Admin APIs (role-gated)
app.get(
  "/admin/users",
  requireAuth,
  requireRole("Admin"),
  asyncHandler(async (req, res) => {
    try {
      const data = await repo.getUsersWithRoles();
      res.json({ data });
    } catch (e) {
      logError(e, "admin-users");
      res.status(500).json({ error: "Server error" });
    }
  })
);

app.get(
  "/admin/roles",
  requireAuth,
  requireRole("Admin"),
  asyncHandler(async (req, res) => {
    try {
      const data = await repo.getRoles();
      res.json({ data });
    } catch (e) {
      logError(e, "admin-roles");
      res.status(500).json({ error: "Server error" });
    }
  })
);

app.get(
  "/admin/permissions",
  requireAuth,
  requireRole("Admin"),
  asyncHandler(async (req, res) => {
    try {
      const data = await repo.getPermissionsAll();
      res.json({ data });
    } catch (e) {
      logError(e, "admin-permissions");
      res.status(500).json({ error: "Server error" });
    }
  })
);

app.post(
  "/admin/permissions",
  requireAuth,
  requireRole("Admin"),
  asyncHandler(async (req, res) => {
    const { name_permission, module } = req.body;

    // Validate required fields
    if (!name_permission || !module) {
      return res
        .status(400)
        .json({ error: "Permission name and module are required" });
    }

    // Type validation
    if (typeof name_permission !== "string" || typeof module !== "string") {
      return res.status(400).json({ error: "Invalid input type" });
    }

    // Length validation
    if (
      name_permission.length < 1 ||
      name_permission.length > 100 ||
      module.length < 1 ||
      module.length > 100
    ) {
      return res
        .status(400)
        .json({ error: "Invalid input length (1-100 characters)" });
    }

    // Sanitize input
    const cleanPermissionName = name_permission.trim();
    const cleanModule = module.trim();

    if (!cleanPermissionName || !cleanModule) {
      return res
        .status(400)
        .json({ error: "Permission name and module cannot be empty" });
    }

    // Validate permission name format (View, Add, Edit, Delete)
    const validPermissions = ["View", "Add", "Edit", "Delete"];
    if (!validPermissions.includes(cleanPermissionName)) {
      return res.status(400).json({
        error: `Permission name must be one of: ${validPermissions.join(", ")}`,
      });
    }

    try {
      const newPermission = await repo.createPermission(
        cleanPermissionName,
        cleanModule
      );
      res.status(201).json({
        message: "Permission created successfully",
        data: newPermission,
      });
    } catch (e) {
      logError(e, "admin-create-permission");
      if (e.message.includes("already exists")) {
        res.status(409).json({ error: e.message });
      } else {
        res.status(500).json({ error: "Failed to create permission" });
      }
    }
  })
);

app.get(
  "/admin/modules",
  requireAuth,
  requireRole("Admin"),
  asyncHandler(async (req, res) => {
    try {
      const data = await repo.getModules();
      res.json({ data });
    } catch (e) {
      logError(e, "admin-modules");
      res.status(500).json({ error: "Server error" });
    }
  })
);

app.get(
  "/admin/role-permissions",
  requireAuth,
  requireRole("Admin"),
  asyncHandler(async (req, res) => {
    const roleId = parseInt(req.query.roleId, 10);
    if (!roleId) return res.status(400).json({ error: "roleId required" });
    try {
      const data = await repo.getPermissionIdsByRole(roleId);
      res.json({ data });
    } catch (e) {
      logError(e, "admin-role-permissions-get");
      res.status(500).json({ error: "Server error" });
    }
  })
);

app.post(
  "/admin/role-permissions",
  requireAuth,
  requireRole("Admin"),
  asyncHandler(async (req, res) => {
    const { roleId, permissionIds } = req.body || {};
    if (!roleId || !Array.isArray(permissionIds))
      return res
        .status(400)
        .json({ error: "roleId and permissionIds required" });

    // Validate inputs
    const parsedRoleId = parseInt(roleId, 10);
    if (!Number.isFinite(parsedRoleId) || parsedRoleId < 1) {
      return res.status(400).json({ error: "Invalid roleId" });
    }
    if (permissionIds.length > 100) {
      return res.status(400).json({ error: "Too many permissions" });
    }

    const validPermissionIds = permissionIds
      .map(Number)
      .filter((id) => Number.isFinite(id) && id > 0);

    try {
      await repo.setRolePermissions(parsedRoleId, validPermissionIds);
      res.json({ ok: true });
    } catch (e) {
      logError(e, "admin-role-permissions-post");
      res.status(500).json({ error: "Server error" });
    }
  })
);

// Global error handler
app.use((err, req, res, next) => {
  logError(err, `${req.method} ${req.path}`);

  // Don't leak error details in production
  const isDev = process.env.NODE_ENV !== "production";
  const errorResponse = {
    error: isDev ? err.message : "Internal server error",
    ...(isDev && err.stack && { stack: err.stack }),
  };

  res.status(err.status || 500).json(errorResponse);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);

module.exports = app; // for testing
module.exports.close = () => {
  return new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
  });
};
