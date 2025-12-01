const roles = [
  { id: 1, name_role: "Admin" },
  { id: 2, name_role: "Manager" },
  { id: 3, name_role: "Staff" },
  { id: 4, name_role: "Customer" },
];

const permissions = [
  { id: 1, name_permission: "View", module: "Order" },
  { id: 2, name_permission: "Edit", module: "Order" },
  { id: 3, name_permission: "Add", module: "Order" },
  { id: 4, name_permission: "Delete", module: "Order" },
];

const rolePermissions = [
  // Admin: full quyền
  { id_role: 1, id_permission: 1 },
  { id_role: 1, id_permission: 2 },
  { id_role: 1, id_permission: 3 },
  { id_role: 1, id_permission: 4 },

  // Manager: view, edit, add
  { id_role: 2, id_permission: 1 },
  { id_role: 2, id_permission: 2 },
  { id_role: 2, id_permission: 3 },

  // Staff: chỉ view, add
  { id_role: 3, id_permission: 1 },
  { id_role: 3, id_permission: 3 },

  // Customer: chỉ view
  { id_role: 4, id_permission: 1 },
];

function hasPermission(roleName, action, module) {
  const role = roles.find((r) => r.name_role === roleName);
  if (!role) throw new Error("Invalid role");

  const permissionIds = rolePermissions
    .filter((rp) => rp.id_role === role.id)
    .map((rp) => rp.id_permission);

  return permissions
    .filter((p) => permissionIds.includes(p.id))
    .some((p) => p.name_permission === action && p.module === module);
}

module.exports = { hasPermission };
