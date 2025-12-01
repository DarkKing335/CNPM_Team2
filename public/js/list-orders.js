// List Orders page
let auth = null;
let orders = [];
// Pagination & sorting state
let oPage = 1;
let oPageSize = 10;
let oTotalPages = 1;
let oTotalItems = 0;
let oSortField = "created_at";
let oSortDir = "desc"; // asc|desc
let oSearch = "";

// Check authentication
try {
  const saved = localStorage.getItem("auth");
  if (!saved) {
    window.location.href = "/login.html";
  } else {
    auth = JSON.parse(saved);

    // Check if user has View permission
    const permissions = new Set(
      (auth.user?.permissions || []).map((p) => p.name_permission)
    );
    if (!permissions.has("View")) {
      alert("You do not have permission to view orders.");
      window.location.href = "/login.html";
    } else {
      initializePage();
    }
  }
} catch (e) {
  window.location.href = "/login.html";
}

function initializePage() {
  attachOrderSorting();
  attachOrderPagination();
  loadOrders();

  document.getElementById("refreshBtn").addEventListener("click", () => {
    loadOrders();
  });
  document.getElementById("logoutBtn").addEventListener("click", logout);
  let searchTimeout;
  document.getElementById("searchInput").addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      oSearch = e.target.value.trim();
      oPage = 1;
      loadOrders();
    }, 300);
  });
}

async function loadOrders() {
  const tbody = document.getElementById("ordersTableBody");
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
        <div class="flex flex-col items-center gap-2">
          <span class="material-symbols-outlined text-4xl animate-spin">refresh</span>
          <p>Loading orders...</p>
        </div>
      </td>
    </tr>`;
  try {
    const params = new URLSearchParams({
      page: String(oPage),
      pageSize: String(oPageSize),
      sort: oSortField,
      dir: oSortDir,
      search: oSearch,
    });
    const res = await fetch(`/orders?${params.toString()}`, {
      headers: { Authorization: "Bearer " + auth.token },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load orders");
    orders = Array.isArray(data.data) ? data.data : [];
    oPage = data.page || 1;
    oPageSize = data.pageSize || 10;
    oTotalItems = data.total || 0;
    oTotalPages = data.totalPages || 1;
    renderOrders(orders);
    renderOrdersPagination();
    renderOrderSortIndicators();
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-8 text-center text-danger">
          <div class="flex flex-col items-center gap-2">
            <span class="material-symbols-outlined text-4xl">error</span>
            <p>${escapeHtml(err.message)}</p>
          </div>
        </td>
      </tr>`;
    renderOrdersPagination(true);
  }
}

function renderOrders(ordersToRender) {
  const tbody = document.getElementById("ordersTableBody");
  const permissions = new Set(
    (auth.user?.permissions || []).map((p) => p.name_permission)
  );

  if (ordersToRender.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    <div class="flex flex-col items-center gap-2">
                        <span class="material-symbols-outlined text-4xl">inbox</span>
                        <p>No orders found</p>
                    </div>
                </td>
            </tr>
        `;
    return;
  }

  tbody.innerHTML = ordersToRender
    .map((order) => {
      const canEdit = permissions.has("Edit");
      const canDelete = permissions.has("Delete");

      return `
            <tr class="bg-white dark:bg-gray-800/30 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">#${
                  order.id
                }</td>
                <td class="px-6 py-4">${escapeHtml(
                  order.item || "No description"
                )}</td>
                <td class="px-6 py-4">
                  <div class="flex flex-col">
                    <span class="font-medium">${escapeHtml(
                      order.customer_name || "-"
                    )}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">${escapeHtml(
                      order.customer_phone || order.customer_email || ""
                    )}</span>
                  </div>
                </td>
                <td class="px-6 py-4">${formatDate(order.created_at)}</td>
                <td class="px-6 py-4 text-right">
                    <div class="flex justify-end items-center gap-2">
                        ${
                          canEdit
                            ? `
                            <button onclick="editOrder(${order.id})" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" title="Edit Order">
                                <span class="material-symbols-outlined" style="font-size: 20px;">edit</span>
                            </button>
                        `
                            : `
                            <button class="p-2 rounded-full text-gray-300 dark:text-gray-600 cursor-not-allowed" disabled title="Permission Denied">
                                <span class="material-symbols-outlined" style="font-size: 20px;">edit</span>
                            </button>
                        `
                        }
                        ${
                          canDelete
                            ? `
                            <button onclick="deleteOrder(${order.id})" class="p-2 rounded-full hover:bg-danger/10 text-danger" title="Delete Order">
                                <span class="material-symbols-outlined" style="font-size: 20px;">delete</span>
                            </button>
                        `
                            : `
                            <button class="p-2 rounded-full text-gray-300 dark:text-gray-600 cursor-not-allowed" disabled title="Permission Denied">
                                <span class="material-symbols-outlined" style="font-size: 20px;">delete</span>
                            </button>
                        `
                        }
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}

// Deprecated client-side filter now handled server-side
function filterOrders() {}

function attachOrderSorting() {
  document.querySelectorAll("thead th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const f = th.getAttribute("data-sort");
      if (oSortField === f) {
        oSortDir = oSortDir === "asc" ? "desc" : "asc";
      } else {
        oSortField = f;
        oSortDir = "asc";
      }
      oPage = 1;
      loadOrders();
    });
  });
}

function renderOrderSortIndicators() {
  ["id", "item", "customer_name", "created_at"].forEach((f) => {
    const el = document.getElementById(`sort-${f}`);
    if (!el) return;
    if (oSortField === f) {
      el.textContent = oSortDir === "asc" ? "▲" : "▼";
      el.className = oSortDir === "asc" ? "text-green-600" : "text-blue-600";
    } else {
      el.textContent = "";
      el.className = "text-xs";
    }
  });
}

function attachOrderPagination() {
  document.getElementById("ordersPrevBtn").addEventListener("click", () => {
    if (oPage > 1) {
      oPage--;
      loadOrders();
    }
  });
  document.getElementById("ordersNextBtn").addEventListener("click", () => {
    if (oPage < oTotalPages) {
      oPage++;
      loadOrders();
    }
  });
  document.getElementById("ordersPageSize").addEventListener("change", (e) => {
    oPageSize = parseInt(e.target.value, 10) || 10;
    oPage = 1;
    loadOrders();
  });
}

function renderOrdersPagination(error = false) {
  const info = document.getElementById("ordersPageInfo");
  const prev = document.getElementById("ordersPrevBtn");
  const next = document.getElementById("ordersNextBtn");
  if (error) {
    info.textContent = "Error loading";
    prev.disabled = true;
    next.disabled = true;
    return;
  }
  info.textContent = `Page ${oPage} of ${oTotalPages} • ${oTotalItems} orders`;
  prev.disabled = oPage <= 1;
  next.disabled = oPage >= oTotalPages;
}

function editOrder(orderId) {
  window.location.href = `/update-order.html?id=${orderId}`;
}

async function deleteOrder(orderId) {
  if (!confirm(`Are you sure you want to delete order #${orderId}?`)) {
    return;
  }

  try {
    const res = await fetch(`/orders/${orderId}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + auth.token },
    });

    const data = await res.json();

    if (res.ok) {
      alert("Order deleted successfully!");
      loadOrders();
    } else {
      throw new Error(data.error || "Failed to delete order");
    }
  } catch (err) {
    alert("Error deleting order: " + err.message);
  }
}

function logout() {
  try {
    localStorage.removeItem("auth");
  } catch (e) {}
  window.location.href = "/login.html";
}

function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
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
