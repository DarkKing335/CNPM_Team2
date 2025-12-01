const { hasPermission } = require("../src/permissions");

describe("RBAC Unit Tests", () => {
  test("Admin có toàn quyền", () => {
    expect(hasPermission("Admin", "View", "Order")).toBe(true);
    expect(hasPermission("Admin", "Edit", "Order")).toBe(true);
    expect(hasPermission("Admin", "Add", "Order")).toBe(true);
    expect(hasPermission("Admin", "Delete", "Order")).toBe(true);
  });

  test("Manager chỉ có quyền View, Edit, Add", () => {
    expect(hasPermission("Manager", "View", "Order")).toBe(true);
    expect(hasPermission("Manager", "Edit", "Order")).toBe(true);
    expect(hasPermission("Manager", "Add", "Order")).toBe(true);
    expect(hasPermission("Manager", "Delete", "Order")).toBe(false);
  });

  test("Staff chỉ có quyền View và Add", () => {
    expect(hasPermission("Staff", "View", "Order")).toBe(true);
    expect(hasPermission("Staff", "Add", "Order")).toBe(true);
    expect(hasPermission("Staff", "Edit", "Order")).toBe(false);
    expect(hasPermission("Staff", "Delete", "Order")).toBe(false);
  });

  test("Customer chỉ có quyền View", () => {
    expect(hasPermission("Customer", "View", "Order")).toBe(true);
    expect(hasPermission("Customer", "Edit", "Order")).toBe(false);
    expect(hasPermission("Customer", "Add", "Order")).toBe(false);
    expect(hasPermission("Customer", "Delete", "Order")).toBe(false);
  });

  test("Not found role", () => {
    expect(() => hasPermission("Unknown", "View", "Order")).toThrow(
      "Invalid role"
    );
  });
});
