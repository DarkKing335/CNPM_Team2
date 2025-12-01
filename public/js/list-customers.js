// Customers list & inline CRUD
let auth = null;
let customers = [];
let editingId = null;
// Pagination & sorting state
let currentPage = 1;
let pageSize = 10;
let totalPages = 1;
let totalItems = 0;
let sortField = "created_at";
let sortDir = "desc"; // asc | desc
let currentSearch = "";

(function init() {
  try {
    const saved = localStorage.getItem("auth");
    if (!saved) return redirectHome();
    auth = JSON.parse(saved);
    const perms = auth.user?.permissions || [];
    const byModule = perms.filter((p) => p.module === "Customer");
    const permSet = new Set(byModule.map((p) => p.name_permission));
    if (!permSet.has("View")) {
      alert("You do not have permission to view customers.");
      return redirectHome();
    }
    setupUI(permSet);
    attachSorting();
    attachPagination();
    loadCustomers();
  } catch (e) {
    redirectHome();
  }

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("auth");
    redirectHome();
  });
  document
    .getElementById("refreshBtn")
    .addEventListener("click", loadCustomers);
  document.getElementById("searchInput").addEventListener(
    "input",
    debounce((e) => {
      currentSearch = e.target.value.trim();
      currentPage = 1;
      loadCustomers();
    }, 300)
  );
})();

function redirectHome() {
  window.location.href = "/login.html";
}

function setupUI(permSet) {
  const actions = document.getElementById("actions");
  if (permSet.has("Add")) {
    const btn = document.createElement("button");
    btn.className = "btn btn-sm btn-success";
    btn.innerHTML = '<i class="bi bi-person-plus me-1"></i>New Customer';
    btn.onclick = () => showForm();
    actions.appendChild(btn);
  }
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + auth.token,
      ...(opts.headers || {}),
    },
  });

  if (res.status === 401) {
    // Token expired - redirect to login
    localStorage.removeItem("token");
    localStorage.removeItem("auth");
    localStorage.removeItem("lastLogin");
    alert("Session expired. Please login again.");
    window.location.href = "/login.html";
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function loadCustomers() {
  const tbody = document.getElementById("customersTable");
  tbody.innerHTML =
    '<tr><td colspan="6" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2" role="status"></div>Loading...</td></tr>';
  try {
    const query = new URLSearchParams({
      page: String(currentPage),
      pageSize: String(pageSize),
      sort: sortField,
      dir: sortDir,
      search: currentSearch,
    });
    const {
      data,
      page,
      total,
      totalPages: tp,
      pageSize: ps,
    } = await api(`/customers?${query.toString()}`);
    customers = Array.isArray(data) ? data : [];
    currentPage = page || 1;
    totalItems = total || 0;
    totalPages = tp || 1;
    pageSize = ps || 10;
    renderCustomers(customers);
    renderPagination();
    renderSortIndicators();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-2"></i>${escapeHtml(
      e.message
    )}</td></tr>`;
    renderPagination(true);
  }
}

function renderCustomers(list) {
  const tbody = document.getElementById("customersTable");
  const permSet = new Set(
    (auth.user?.permissions || [])
      .filter((p) => p.module === "Customer")
      .map((p) => p.name_permission)
  );
  if (!list.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center py-4 text-muted">No customers found</td></tr>';
    return;
  }
  tbody.innerHTML = list
    .map((c) => {
      const canEdit = permSet.has("Edit");
      const canDelete = permSet.has("Delete");
      return `<tr>
      <td class="align-middle"><strong>#${c.id}</strong></td>
      <td class="align-middle">${escapeHtml(c.name || "")}</td>
      <td class="align-middle"><small>${escapeHtml(
        c.phone || c.email || "-"
      )}</small></td>
      <td class="align-middle"><small>${escapeHtml(
        c.address || "-"
      )}</small></td>
      <td class="align-middle"><small>${formatDate(c.created_at)}</small></td>
      <td class="text-end align-middle">
        <div class="btn-group btn-group-sm" role="group">
          ${
            canEdit
              ? `<button class="btn btn-outline-warning btn-sm" onclick="editCustomer(${c.id})"><i class='bi bi-pencil'></i></button>`
              : ""
          }
          ${
            canDelete
              ? `<button class="btn btn-outline-danger btn-sm" onclick="deleteCustomer(${c.id})"><i class='bi bi-trash'></i></button>`
              : ""
          }
        </div>
      </td>
    </tr>`;
    })
    .join("");
}

function attachSorting() {
  const headers = document.querySelectorAll("thead th[data-sort]");
  headers.forEach((th) => {
    th.addEventListener("click", () => {
      const field = th.getAttribute("data-sort");
      if (sortField === field) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortField = field;
        sortDir = "asc";
      }
      currentPage = 1;
      loadCustomers();
    });
  });
}

function renderSortIndicators() {
  ["id", "name", "created_at"].forEach((f) => {
    const el = document.getElementById(`sort-${f}`);
    if (!el) return;
    if (sortField === f) {
      el.textContent = sortDir === "asc" ? "▲" : "▼";
      el.style.color = sortDir === "asc" ? "#28a745" : "#007bff";
    } else {
      el.textContent = "";
      el.style.color = "";
    }
  });
}

function attachPagination() {
  document.getElementById("prevPageBtn").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadCustomers();
    }
  });
  document.getElementById("nextPageBtn").addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadCustomers();
    }
  });
  document.getElementById("pageSizeSelect").addEventListener("change", (e) => {
    pageSize = parseInt(e.target.value, 10) || 10;
    currentPage = 1;
    loadCustomers();
  });
}

function renderPagination(error = false) {
  const info = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");
  if (error) {
    info.textContent = "Error loading";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }
  info.textContent = `Page ${currentPage} of ${totalPages} • ${totalItems} items`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

function showForm(customer) {
  editingId = customer ? customer.id : null;
  document.getElementById("formContainer").style.display = "block";
  document.getElementById("formTitle").textContent = editingId
    ? "Edit Customer"
    : "New Customer";
  document.getElementById("custName").value = customer?.name || "";
  document.getElementById("custPhone").value = customer?.phone || "";
  document.getElementById("custEmail").value = customer?.email || "";
  document.getElementById("custAddress").value = customer?.address || "";
  document.getElementById("cancelFormBtn").onclick = () => {
    document.getElementById("formContainer").style.display = "none";
    editingId = null;
  };
  document.getElementById("customerForm").onsubmit = saveCustomer;
}

function editCustomer(id) {
  const c = customers.find((x) => x.id === id);
  if (!c) return;
  showForm(c);
}

async function saveCustomer(e) {
  e.preventDefault();
  const nameInput = document.getElementById("custName");
  const phoneInput = document.getElementById("custPhone");
  const emailInput = document.getElementById("custEmail");
  const addressInput = document.getElementById("custAddress");

  if (!nameInput || !phoneInput || !emailInput || !addressInput) {
    alert("Form elements not found");
    return;
  }

  const payload = {
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim(),
    email: emailInput.value.trim(),
    address: addressInput.value.trim(),
  };

  if (!payload.name) {
    nameInput.focus();
    return alert("Name is required");
  }

  if (payload.email && !isValidEmail(payload.email)) {
    emailInput.focus();
    return alert("Please enter a valid email address");
  }
  try {
    if (editingId) {
      await api(`/customers/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      alert("Customer updated");
    } else {
      await api("/customers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      alert("Customer created");
    }
    document.getElementById("formContainer").style.display = "none";
    editingId = null;
    await loadCustomers();
  } catch (e) {
    alert("Error: " + e.message);
  }
}

async function deleteCustomer(id) {
  if (!confirm("Delete customer #" + id + "?")) return;
  try {
    await api(`/customers/${id}`, { method: "DELETE" });
    alert("Customer deleted");
    await loadCustomers();
  } catch (e) {
    alert("Error: " + e.message);
  }
}

// Deprecated client-side filter now handled server-side
function filterCustomers() {}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), ms);
  };
}

function isValidEmail(email) {
  if (!email) return true; // Optional field
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

function formatDate(d) {
  if (!d) return "N/A";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
}
