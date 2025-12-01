const { getPool } = require("./db");
const bcrypt = require("bcrypt");
const sql = require("mssql");

async function getUserByUsername(username) {
  const pool = await getPool();
  const request = pool.request();
  request.input("username", username);
  const result = await request.query(
    "SELECT TOP 1 * FROM Users WHERE username=@username"
  );
  return result.recordset[0];
}

async function verifyPassword(user, plainPassword) {
  if (!user) return false;
  return bcrypt.compare(plainPassword, user.password_hash);
}

async function getUserRoles(userId) {
  const pool = await getPool();
  const request = pool.request();
  request.input("userId", userId);
  const result = await request.query(`
    SELECT r.* FROM UserRoles ur
    JOIN Roles r ON ur.id_role = r.id
    WHERE ur.id_user = @userId
  `);
  return result.recordset;
}

async function getRolePermissions(roleIds) {
  if (!roleIds.length) return [];
  const pool = await getPool();
  const request = pool.request();
  request.input("idsStr", roleIds.join(","));
  // Use STRING_SPLIT for passing list
  const result = await request.query(`
    DECLARE @ids_tbl TABLE(id INT);
    INSERT INTO @ids_tbl SELECT TRY_CAST(value AS INT) FROM STRING_SPLIT(@idsStr, ',');
    SELECT DISTINCT p.* FROM RolePermissions rp
    JOIN Permissions p ON rp.id_permission = p.id
    JOIN @ids_tbl i ON rp.id_role = i.id;
  `);
  return result.recordset;
}

async function getUserPermissions(userId) {
  const roles = await getUserRoles(userId);
  const roleIds = roles.map((r) => r.id);
  const permissions = await getRolePermissions(roleIds);
  return permissions;
}

async function updateUserPassword(userId, passwordHash) {
  const pool = await getPool();
  const request = pool.request();
  request.input("userId", userId);
  request.input("passwordHash", passwordHash);
  await request.query(
    "UPDATE Users SET password_hash = @passwordHash WHERE id = @userId"
  );
}

module.exports = {
  getUserByUsername,
  verifyPassword,
  getUserRoles,
  getRolePermissions,
  getUserPermissions,
  updateUserPassword,

  // Paged + searchable Orders
};

// Admin repository helpers
async function getUsersWithRoles() {
  const pool = await getPool();
  const q = `
    SELECT u.id, u.username, r.name_role
    FROM Users u
    LEFT JOIN UserRoles ur ON ur.id_user = u.id
    LEFT JOIN Roles r ON r.id = ur.id_role
    ORDER BY u.id`;
  const rs = await pool.request().query(q);
  const map = new Map();
  for (const row of rs.recordset) {
    if (!map.has(row.id))
      map.set(row.id, { id: row.id, username: row.username, roles: [] });
    if (row.name_role) map.get(row.id).roles.push(row.name_role);
  }
  return Array.from(map.values());
}

async function getRoles() {
  const pool = await getPool();
  const rs = await pool
    .request()
    .query("SELECT id, name_role FROM Roles ORDER BY id");
  return rs.recordset;
}

async function getPermissionsAll() {
  const pool = await getPool();
  const rs = await pool
    .request()
    .query(
      "SELECT id, name_permission, module FROM Permissions ORDER BY module, id"
    );
  return rs.recordset;
}

async function createPermission(namePermission, module) {
  const pool = await getPool();
  const req = pool.request();
  req.input("namePermission", namePermission);
  req.input("module", module);

  // Check if permission already exists
  const checkQuery =
    "SELECT id FROM Permissions WHERE name_permission = @namePermission AND module = @module";
  const checkRs = await req.query(checkQuery);

  if (checkRs.recordset.length > 0) {
    throw new Error("Permission already exists for this module");
  }

  // Insert new permission
  const insertQuery =
    "INSERT INTO Permissions (name_permission, module) VALUES (@namePermission, @module); SELECT SCOPE_IDENTITY() AS id";
  const req2 = pool.request();
  req2.input("namePermission", namePermission);
  req2.input("module", module);
  const insertRs = await req2.query(insertQuery);

  return {
    id: insertRs.recordset[0].id,
    name_permission: namePermission,
    module: module,
  };
}

async function getModules() {
  const pool = await getPool();
  const rs = await pool
    .request()
    .query("SELECT DISTINCT module FROM Permissions ORDER BY module");
  return rs.recordset.map((r) => r.module);
}

async function getPermissionIdsByRole(roleId) {
  const pool = await getPool();
  const req = pool.request();
  req.input("roleId", roleId);
  const rs = await req.query(
    "SELECT id_permission FROM RolePermissions WHERE id_role=@roleId"
  );
  return rs.recordset.map((r) => r.id_permission);
}

async function setRolePermissions(roleId, permissionIds) {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    let req = new sql.Request(tx);
    req.input("roleId", roleId);
    await req.query("DELETE FROM RolePermissions WHERE id_role=@roleId");

    for (const pid of permissionIds) {
      req = new sql.Request(tx);
      req.input("roleId", roleId);
      req.input("pid", pid);
      await req.query(
        "INSERT INTO RolePermissions (id_role, id_permission) VALUES (@roleId, @pid)"
      );
    }
    await tx.commit();
    return { ok: true };
  } catch (e) {
    try {
      await tx.rollback();
    } catch (_) {}
    throw e;
  }
}

// Orders CRUD operations
async function getOrders() {
  const pool = await getPool();
  const rs = await pool.request().query(`
    SELECT o.id, o.item,
           o.customer_name, o.customer_phone, o.customer_email, o.customer_address,
           o.created_at, o.updated_at, o.created_by,
           u.username as creator_username
    FROM Orders o
    LEFT JOIN Users u ON o.created_by = u.id
    ORDER BY o.created_at DESC
  `);
  return rs.recordset;
}

// Paged + searchable Orders
async function getOrdersPaged({
  page = 1,
  pageSize = 10,
  sort = "created_at",
  dir = "desc",
  search = "",
}) {
  const pool = await getPool();
  // Whitelist sorting columns to prevent SQL injection
  const sortWhitelist = new Set(["id", "item", "customer_name", "created_at"]);
  if (!sortWhitelist.has(sort)) sort = "created_at";
  dir = dir && dir.toLowerCase() === "asc" ? "ASC" : "DESC";
  page = Number(page) >= 1 ? Number(page) : 1;
  pageSize =
    Number(pageSize) >= 1 && Number(pageSize) <= 100 ? Number(pageSize) : 10;
  const offset = (page - 1) * pageSize;

  // Sanitize search input to prevent SQL injection
  const sanitizedSearch =
    typeof search === "string" ? search.substring(0, 255) : "";

  const req = pool.request();
  req.input("search", `%${sanitizedSearch}%`);
  req.input("offset", offset);
  req.input("limit", pageSize);
  // Build WHERE clause for search
  const whereSearch = sanitizedSearch
    ? "WHERE (o.item LIKE @search OR o.customer_name LIKE @search OR o.customer_phone LIKE @search OR o.customer_email LIKE @search)"
    : "";
  const countQuery = `SELECT COUNT(*) AS total FROM Orders o ${whereSearch}`;
  const dataQuery = `
    SELECT o.id, o.item,
           o.customer_name, o.customer_phone, o.customer_email, o.customer_address,
           o.created_at, o.updated_at, o.created_by,
           u.username as creator_username
    FROM Orders o
    LEFT JOIN Users u ON o.created_by = u.id
    ${whereSearch}
    ORDER BY o.${sort} ${dir}
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
  const totalRs = await req.query(countQuery);
  // Need new request for data as parameters consumed
  const req2 = pool.request();
  req2.input("search", `%${sanitizedSearch}%`);
  req2.input("offset", offset);
  req2.input("limit", pageSize);
  const dataRs = await req2.query(dataQuery);
  const total = totalRs.recordset[0].total;
  return {
    rows: dataRs.recordset,
    total,
    page,
    pageSize,
    sort,
    dir: dir.toLowerCase(),
    search: sanitizedSearch,
  };
}

async function getOrderById(orderId) {
  const pool = await getPool();
  const req = pool.request();
  req.input("orderId", orderId);
  const rs = await req.query(`
    SELECT o.id, o.item,
           o.customer_name, o.customer_phone, o.customer_email, o.customer_address,
           o.created_at, o.updated_at, o.created_by,
           u.username as creator_username
    FROM Orders o
    LEFT JOIN Users u ON o.created_by = u.id
    WHERE o.id = @orderId
  `);
  return rs.recordset[0];
}

async function createOrder(item, userId, customer) {
  const pool = await getPool();
  const req = pool.request();
  req.input("item", item);
  req.input("userId", userId);
  req.input("customer_name", customer.customer_name);
  req.input("customer_phone", customer.customer_phone || null);
  req.input("customer_email", customer.customer_email || null);
  req.input("customer_address", customer.customer_address || null);
  const rs = await req.query(`
    INSERT INTO Orders (item, customer_name, customer_phone, customer_email, customer_address, created_by, created_at, updated_at)
    OUTPUT INSERTED.*
    VALUES (@item, @customer_name, @customer_phone, @customer_email, @customer_address, @userId, GETDATE(), GETDATE())
  `);
  return rs.recordset[0];
}

async function updateOrder(orderId, item, customer) {
  const pool = await getPool();
  const req = pool.request();
  req.input("orderId", orderId);
  req.input("item", item);
  req.input("customer_name", customer.customer_name);
  req.input("customer_phone", customer.customer_phone || null);
  req.input("customer_email", customer.customer_email || null);
  req.input("customer_address", customer.customer_address || null);
  const rs = await req.query(`
    UPDATE Orders
    SET item = @item,
        customer_name = @customer_name,
        customer_phone = @customer_phone,
        customer_email = @customer_email,
        customer_address = @customer_address,
        updated_at = GETDATE()
    OUTPUT INSERTED.*
    WHERE id = @orderId
  `);
  return rs.recordset[0];
}

async function deleteOrder(orderId) {
  const pool = await getPool();
  const req = pool.request();
  req.input("orderId", orderId);
  await req.query("DELETE FROM Orders WHERE id = @orderId");
  return { success: true };
}

module.exports.getUsersWithRoles = getUsersWithRoles;
module.exports.getRoles = getRoles;
module.exports.getPermissionsAll = getPermissionsAll;
module.exports.createPermission = createPermission;
module.exports.getModules = getModules;
module.exports.getPermissionIdsByRole = getPermissionIdsByRole;
module.exports.setRolePermissions = setRolePermissions;
module.exports.getOrders = getOrders;
module.exports.getOrdersPaged = getOrdersPaged;
module.exports.getOrderById = getOrderById;
module.exports.createOrder = createOrder;
module.exports.updateOrder = updateOrder;
module.exports.deleteOrder = deleteOrder;

// Customers CRUD operations
async function getCustomers() {
  const pool = await getPool();
  const rs = await pool.request().query(`
    SELECT c.id, c.name, c.phone, c.email, c.address,
           c.created_at, c.updated_at, c.created_by, u.username AS creator_username
    FROM Customers c
    LEFT JOIN Users u ON c.created_by = u.id
    ORDER BY c.created_at DESC`);
  return rs.recordset;
}

async function getCustomerById(customerId) {
  const pool = await getPool();
  const req = pool.request();
  req.input("customerId", customerId);
  const rs = await req.query(`
    SELECT c.id, c.name, c.phone, c.email, c.address,
           c.created_at, c.updated_at, c.created_by, u.username AS creator_username
    FROM Customers c
    LEFT JOIN Users u ON c.created_by = u.id
    WHERE c.id = @customerId`);
  return rs.recordset[0];
}

async function createCustomer(data, userId) {
  const pool = await getPool();
  const req = pool.request();
  req.input("name", data.name);
  req.input("phone", data.phone || null);
  req.input("email", data.email || null);
  req.input("address", data.address || null);
  req.input("userId", userId);
  const rs = await req.query(`
    INSERT INTO Customers (name, phone, email, address, created_by, created_at, updated_at)
    OUTPUT INSERTED.*
    VALUES (@name, @phone, @email, @address, @userId, GETDATE(), GETDATE())`);
  return rs.recordset[0];
}

async function updateCustomer(customerId, data) {
  const pool = await getPool();
  const req = pool.request();
  req.input("customerId", customerId);
  req.input("name", data.name);
  req.input("phone", data.phone || null);
  req.input("email", data.email || null);
  req.input("address", data.address || null);
  const rs = await req.query(`
    UPDATE Customers
    SET name=@name, phone=@phone, email=@email, address=@address, updated_at=GETDATE()
    OUTPUT INSERTED.*
    WHERE id=@customerId`);
  return rs.recordset[0];
}
async function deleteCustomer(customerId) {
  const pool = await getPool();
  const req = pool.request();
  req.input("customerId", customerId);
  await req.query("DELETE FROM Customers WHERE id=@customerId");
  return { success: true };
}

// Paged + searchable Customers
async function getCustomersPaged({
  page = 1,
  pageSize = 10,
  sort = "created_at",
  dir = "desc",
  search = "",
}) {
  const pool = await getPool();
  const sortWhitelist = new Set(["id", "name", "phone", "email", "created_at"]);
  if (!sortWhitelist.has(sort)) sort = "created_at";
  dir = dir && dir.toLowerCase() === "asc" ? "ASC" : "DESC";
  page = Number(page) >= 1 ? Number(page) : 1;
  pageSize =
    Number(pageSize) >= 1 && Number(pageSize) <= 100 ? Number(pageSize) : 10;
  const offset = (page - 1) * pageSize;

  // Sanitize search input to prevent SQL injection
  const sanitizedSearch =
    typeof search === "string" ? search.substring(0, 255) : "";

  const req = pool.request();
  req.input("search", `%${sanitizedSearch}%`);
  req.input("offset", offset);
  req.input("limit", pageSize);
  const whereSearch = sanitizedSearch
    ? "WHERE (c.name LIKE @search OR c.phone LIKE @search OR c.email LIKE @search OR c.address LIKE @search)"
    : "";
  const countQuery = `SELECT COUNT(*) AS total FROM Customers c ${whereSearch}`;
  const dataQuery = `
    SELECT c.id, c.name, c.phone, c.email, c.address,
           c.created_at, c.updated_at, c.created_by, u.username AS creator_username
    FROM Customers c
    LEFT JOIN Users u ON c.created_by = u.id
    ${whereSearch}
    ORDER BY c.${sort} ${dir}
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
  const totalRs = await req.query(countQuery);
  const req2 = pool.request();
  req2.input("search", `%${sanitizedSearch}%`);
  req2.input("offset", offset);
  req2.input("limit", pageSize);
  const dataRs = await req2.query(dataQuery);
  const total = totalRs.recordset[0].total;
  return {
    rows: dataRs.recordset,
    total,
    page,
    pageSize,
    sort,
    dir: dir.toLowerCase(),
    search: sanitizedSearch,
  };
}

module.exports.getCustomers = getCustomers;
module.exports.getCustomerById = getCustomerById;
module.exports.createCustomer = createCustomer;
module.exports.updateCustomer = updateCustomer;
module.exports.deleteCustomer = deleteCustomer;
module.exports.getCustomersPaged = getCustomersPaged;
module.exports.getCustomersPaged = getCustomersPaged;
