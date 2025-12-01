// Update Order page
let auth = null;
let orders = [];
let selectedOrder = null;

// Check authentication
try {
  const saved = localStorage.getItem("auth");
  if (!saved) {
    window.location.href = "/login.html";
  } else {
    auth = JSON.parse(saved);

    // Check if user has Edit permission
    const permissions = new Set(
      (auth.user?.permissions || []).map((p) => p.name_permission)
    );
    if (!permissions.has("Edit")) {
      alert("You do not have permission to update orders.");
      window.location.href = "/login.html";
    } else {
      initializePage();
    }
  }
} catch (e) {
  window.location.href = "/login.html";
}

function initializePage() {
  // Set user info
  document.getElementById("userName").textContent =
    auth.user?.username || "User";
  const roles = auth.user?.roles || [];
  document.getElementById("userRole").textContent =
    roles.length > 0 ? roles.join(", ") : "User";

  // Add admin dashboard link if admin
  if (roles.includes("Admin")) {
    const nav = document.getElementById("sideNav");
    const adminLink = document.createElement("a");
    adminLink.className =
      "flex items-center gap-3 px-3 py-2 text-[#616f89] dark:text-gray-400 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors";
    adminLink.href = "/admin.html";
    adminLink.innerHTML = `
            <span class="material-symbols-outlined">dashboard</span>
            <p class="text-sm font-medium leading-normal">Admin Dashboard</p>
        `;
    nav.insertBefore(adminLink, nav.firstChild);
  }

  // Load orders
  loadOrders();

  // Event listeners
  document
    .getElementById("orderSelect")
    .addEventListener("change", onOrderSelected);
  document.getElementById("updateForm").addEventListener("submit", saveOrder);
  document.getElementById("cancelBtn").addEventListener("click", resetForm);
  document.getElementById("logoutLink").addEventListener("click", logout);
}

async function loadOrders() {
  const select = document.getElementById("orderSelect");
  select.innerHTML = '<option value="">Loading orders...</option>';

  try {
    const res = await fetch("/orders", {
      headers: { Authorization: "Bearer " + auth.token },
    });

    const data = await res.json();

    if (res.ok) {
      orders = data.data || [];

      if (orders.length === 0) {
        select.innerHTML = '<option value="">No orders available</option>';
      } else {
        select.innerHTML = '<option value="">-- Select an order --</option>';
        orders.forEach((order) => {
          const option = document.createElement("option");
          option.value = order.id;
          option.textContent = `Order #${order.id} - ${
            order.item || "No description"
          } (${formatDate(order.created_at)})`;
          select.appendChild(option);
        });
      }
    } else {
      throw new Error(data.error || "Failed to load orders");
    }
  } catch (err) {
    select.innerHTML = '<option value="">Error loading orders</option>';
    alert("Error loading orders: " + err.message);
  }
}

function onOrderSelected(e) {
  const orderId = parseInt(e.target.value);

  if (!orderId) {
    document.getElementById("orderForm").style.display = "none";
    document.getElementById("orderSubtitle").textContent =
      "Select an order to edit";
    selectedOrder = null;
    return;
  }

  selectedOrder = orders.find((o) => o.id === orderId);

  if (selectedOrder) {
    // Populate form
    document.getElementById("orderId").value = `#${selectedOrder.id}`;
    document.getElementById("createdDate").value = formatDate(
      selectedOrder.created_at
    );
    document.getElementById("orderDescription").value =
      selectedOrder.item || "";
    document.getElementById("customerName").value =
      selectedOrder.customer_name || "";
    document.getElementById("customerPhone").value =
      selectedOrder.customer_phone || "";
    document.getElementById("customerEmail").value =
      selectedOrder.customer_email || "";
    document.getElementById("customerAddress").value =
      selectedOrder.customer_address || "";
    document.getElementById(
      "orderSubtitle"
    ).textContent = `Editing Order #${selectedOrder.id}`;

    // Show form
    document.getElementById("orderForm").style.display = "block";
  }
}

async function saveOrder(e) {
  e.preventDefault();

  if (!selectedOrder) {
    alert("Please select an order first.");
    return;
  }

  const description = document.getElementById("orderDescription").value.trim();

  if (!description) {
    alert("Please enter an order description.");
    return;
  }

  const saveBtn = document.getElementById("saveBtn");
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const res = await fetch(`/orders/${selectedOrder.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + auth.token,
      },
      body: JSON.stringify({
        item: description,
        customer_name: document.getElementById("customerName").value.trim(),
        customer_phone: document.getElementById("customerPhone").value.trim(),
        customer_email: document.getElementById("customerEmail").value.trim(),
        customer_address: document
          .getElementById("customerAddress")
          .value.trim(),
      }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Order updated successfully!");
      // Reload orders and reset form
      await loadOrders();
      resetForm();
    } else {
      throw new Error(data.error || "Failed to update order");
    }
  } catch (err) {
    alert("Error updating order: " + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

function resetForm() {
  document.getElementById("orderSelect").value = "";
  document.getElementById("orderForm").style.display = "none";
  document.getElementById("orderSubtitle").textContent =
    "Select an order to edit";
  document.getElementById("orderDescription").value = "";
  selectedOrder = null;
}

function logout() {
  try {
    localStorage.removeItem("auth");
  } catch (e) {}
  window.location.href = "/login.html";
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "N/A";
  }
}
