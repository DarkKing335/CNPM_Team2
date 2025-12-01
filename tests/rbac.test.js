const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/server");
const { jwtSecret } = require("../src/config");

// Mock user payloads for different roles
function makeToken(roles, perms) {
  return jwt.sign(
    {
      sub: 1,
      username: "test",
      roles,
      permissions: perms.map((p) => ({ name_permission: p, module: "Order" })),
    },
    jwtSecret
  );
}

describe("RBAC Middleware", () => {
  afterAll(async () => {
    await app.close();
  });
  let createdOrderId;

  test("View allowed with View permission", async () => {
    const token = makeToken(["Customer"], ["View"]);
    const res = await request(app)
      .get("/orders")
      .set("Authorization", "Bearer " + token);
    expect(res.status).toBe(200);
  });

  test("Add denied without Add permission", async () => {
    const token = makeToken(["Customer"], ["View"]);
    const res = await request(app)
      .post("/orders")
      .set("Authorization", "Bearer " + token)
      .send({ item: "X", customer_name: "Test Customer" });
    expect(res.status).toBe(403);
  });

  test("Add allowed with Add permission", async () => {
    const token = makeToken(["Staff"], ["View", "Add"]);
    const res = await request(app)
      .post("/orders")
      .set("Authorization", "Bearer " + token)
      .send({ item: "X", customer_name: "Test Customer" });
    expect(res.status).toBe(201);
    createdOrderId = res.body.data.id;
  });

  test("Edit allowed for Manager", async () => {
    const token = makeToken(["Manager"], ["View", "Edit", "Add"]);
    const res = await request(app)
      .put(`/orders/${createdOrderId}`)
      .set("Authorization", "Bearer " + token)
      .send({ item: "Y", customer_name: "Test Customer" });
    expect(res.status).toBe(200);
  });

  test("Delete only admin", async () => {
    const token = makeToken(["Admin"], ["View", "Edit", "Add", "Delete"]);
    const res = await request(app)
      .delete(`/orders/${createdOrderId}`)
      .set("Authorization", "Bearer " + token);
    expect(res.status).toBe(200);
  });

  test("Delete forbidden for Manager", async () => {
    // Create another order for this test
    const createToken = makeToken(["Staff"], ["View", "Add"]);
    const createRes = await request(app)
      .post("/orders")
      .set("Authorization", "Bearer " + createToken)
      .send({ item: "Z", customer_name: "Test Customer 2" });
    const orderId = createRes.body.data.id;

    const token = makeToken(["Manager"], ["View", "Edit", "Add"]);
    const res = await request(app)
      .delete(`/orders/${orderId}`)
      .set("Authorization", "Bearer " + token);
    expect(res.status).toBe(403);
  });
});
