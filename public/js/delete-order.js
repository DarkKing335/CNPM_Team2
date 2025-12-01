// Delete Order page
let auth = null;
let orderId = null;
let order = null;

// Check authentication
try {
  const saved = localStorage.getItem("auth");
  if (!saved) {
    window.location.href = "/login.html";
  } else {
    auth = JSON.parse(saved);

    // Check if user has Delete permission
    const permissions = new Set(
      (auth.user?.permissions || []).map((p) => p.name_permission)
    );
    if (!permissions.has("Delete")) {
      alert("You do not have permission to delete orders.");
      window.location.href = "/login.html";
    } else {
      initializePage();
    }
  }
} catch (e) {
  window.location.href = "/login.html";
}

function initializePage() {
  // Get order ID from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  orderId = urlParams.get("id");

  if (!orderId) {
    // If no order ID, show order selection
    loadOrdersList();
  } else {
    // Load specific order details
    loadOrderDetails(orderId);
  }

  // Event listeners
  document.getElementById("deleteBtn").addEventListener("click", deleteOrder);
  document.getElementById("cancelBtn").addEventListener("click", () => {
    window.location.href = "/list-orders.html";
  });
}

async function loadOrdersList() {
  const detailsDiv = document.getElementById("orderDetails");
  detailsDiv.innerHTML = `
        <div class="col-span-2">
            <label class="flex flex-col">
                <p class="text-sm font-medium text-[#896161] dark:text-gray-400 pb-2">Select Order to Delete</p>
                <select id="orderSelect" class="form-select flex w-full min-w-0 flex-1 rounded-lg text-[#181111] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary h-12 px-4 text-sm">
                    <option value="">Loading orders...</option>
                </select>
            </label>
        </div>
    `;

  try {
    const res = await fetch("/orders", {
      headers: { Authorization: "Bearer " + auth.token },
    });

    const data = await res.json();

    if (res.ok) {
      const orders = data.data || [];
      const select = document.getElementById("orderSelect");

      if (orders.length === 0) {
        select.innerHTML = '<option value="">No orders available</option>';
        document.getElementById("deleteBtn").disabled = true;
      } else {
        select.innerHTML =
          '<option value="">-- Select an order to delete --</option>';
        orders.forEach((o) => {
          const option = document.createElement("option");
          option.value = o.id;
          option.textContent = `Order #${o.id} - ${
            o.item || "No description"
          } (${formatDate(o.created_at)})`;
          select.appendChild(option);
        });

        select.addEventListener("change", (e) => {
          orderId = e.target.value;
          if (orderId) {
            const selectedOrder = orders.find((o) => o.id == orderId);
            if (selectedOrder) {
              displayOrderDetails(selectedOrder);
            }
          }
        });
      }
    } else {
      throw new Error(data.error || "Failed to load orders");
    }
  } catch (err) {
    detailsDiv.innerHTML = `<p class="col-span-2 text-center text-primary">Error: ${escapeHtml(
      err.message
    )}</p>`;
  }
}

async function loadOrderDetails(id) {
  const detailsDiv = document.getElementById("orderDetails");
  detailsDiv.innerHTML =
    '<p class="col-span-2 text-center text-[#896161] dark:text-gray-400">Loading order details...</p>';

  try {
    const res = await fetch("/orders", {
      headers: { Authorization: "Bearer " + auth.token },
    });

    const data = await res.json();

    if (res.ok) {
      const orders = data.data || [];
      order = orders.find((o) => o.id == id);

      if (order) {
        displayOrderDetails(order);
      } else {
        throw new Error("Order not found");
      }
    } else {
      throw new Error(data.error || "Failed to load order");
    }
  } catch (err) {
    detailsDiv.innerHTML = `<p class="col-span-2 text-center text-primary">Error: ${escapeHtml(
      err.message
    )}</p>`;
    document.getElementById("deleteBtn").disabled = true;
  }
}

function displayOrderDetails(orderData) {
  order = orderData;
  orderId = orderData.id;

  const detailsDiv = document.getElementById("orderDetails");
  detailsDiv.innerHTML = `
        <p class="text-sm font-medium text-[#896161] dark:text-gray-400">Order ID</p>
        <p class="text-sm text-[#181111] dark:text-white text-right sm:text-left">#${
          orderData.id
        }</p>
        
        <p class="text-sm font-medium text-[#896161] dark:text-gray-400">Description</p>
        <p class="text-sm text-[#181111] dark:text-white text-right sm:text-left">${escapeHtml(
          orderData.item || "No description"
        )}</p>
        
        <p class="text-sm font-medium text-[#896161] dark:text-gray-400">Customer</p>
        <p class="text-sm text-[#181111] dark:text-white text-right sm:text-left">${escapeHtml(
          orderData.customer_name || "-"
        )}</p>
        
        <p class="text-sm font-medium text-[#896161] dark:text-gray-400">Contact</p>
        <p class="text-sm text-[#181111] dark:text-white text-right sm:text-left">${escapeHtml(
          orderData.customer_phone || orderData.customer_email || ""
        )}</p>
        
        <p class="text-sm font-medium text-[#896161] dark:text-gray-400">Created Date</p>
        <p class="text-sm text-[#181111] dark:text-white text-right sm:text-left">${formatDate(
          orderData.created_at
        )}</p>
    `;

  document.getElementById("deleteBtn").disabled = false;
}

async function deleteOrder() {
  if (!orderId) {
    alert("Please select an order to delete.");
    return;
  }

  const deleteBtn = document.getElementById("deleteBtn");
  const originalText = deleteBtn.querySelector("span").textContent;
  deleteBtn.disabled = true;
  deleteBtn.querySelector("span").textContent = "Deleting...";

  try {
    const res = await fetch(`/orders/${orderId}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + auth.token },
    });

    const data = await res.json();

    if (res.ok) {
      alert("Order deleted successfully!");
      window.location.href = "/list-orders.html";
    } else {
      throw new Error(data.error || "Failed to delete order");
    }
  } catch (err) {
    alert("Error deleting order: " + err.message);
    deleteBtn.disabled = false;
    deleteBtn.querySelector("span").textContent = originalText;
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "N/A";
  }
}
