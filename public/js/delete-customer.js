(function () {
  let auth;
  const saved = localStorage.getItem("auth");
  if (saved) {
    try {
      auth = JSON.parse(saved);
    } catch (e) {}
  }
  if (!auth) return location.replace("/login.html");
  const permSet = new Set(
    (auth.user?.permissions || [])
      .filter((p) => p.module === "Customer")
      .map((p) => p.name_permission)
  );
  if (!permSet.has("Delete")) {
    alert("You lack Delete permission for Customer.");
    return location.replace("/login.html");
  }

  const select = document.getElementById("customerSelect");
  const refreshBtn = document.getElementById("refreshBtn");
  const confirmContainer = document.getElementById("confirmContainer");
  const details = document.getElementById("details");
  const feedback = document.getElementById("feedback");
  const deleteBtn = document.getElementById("deleteBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  let customers = [];
  let currentId = null;

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("auth");
    location.replace("/login.html");
  });
  refreshBtn.addEventListener("click", loadCustomers);
  select.addEventListener("change", onSelect);
  cancelBtn.addEventListener("click", () => {
    confirmContainer.classList.add("d-none");
    currentId = null;
    select.value = "";
    feedback.innerHTML = "";
  });
  deleteBtn.addEventListener("click", onDelete);

  loadCustomers();

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
    select.innerHTML = '<option value="">Loading...</option>';
    feedback.innerHTML = "";
    confirmContainer.classList.add("d-none");
    currentId = null;
    try {
      const { data } = await api("/customers");
      customers = data || [];
      if (!customers.length) {
        select.innerHTML = '<option value="">No customers</option>';
        return;
      }
      select.innerHTML =
        '<option value="">-- Select customer --</option>' +
        customers
          .map((c) => `<option value="${c.id}">${c.name} (#${c.id})</option>`)
          .join("");
    } catch (e) {
      select.innerHTML = '<option value="">Error</option>';
      showError(e.message);
    }
  }

  function onSelect() {
    const id = parseInt(select.value, 10);
    if (!id) {
      confirmContainer.classList.add("d-none");
      currentId = null;
      return;
    }
    const c = customers.find((x) => x.id === id);
    if (!c) return;
    currentId = id;
    populate(c);
  }

  function populate(c) {
    details.innerHTML = `<strong>${escapeHtml(
      c.name
    )}</strong><br/>${escapeHtml(c.phone || c.email || "")}<br/>${escapeHtml(
      c.address || ""
    )}`;
    confirmContainer.classList.remove("d-none");
    feedback.innerHTML = "";
  }

  async function onDelete() {
    if (!currentId) return;
    deleteBtn.disabled = true;
    deleteBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm me-1"></span>Deleting';
    try {
      await api("/customers/" + currentId, { method: "DELETE" });
      showSuccess("Customer deleted");
      await loadCustomers();
    } catch (e) {
      showError(e.message);
    } finally {
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = '<i class="bi bi-trash me-1"></i>Delete';
    }
  }

  function showError(m) {
    feedback.innerHTML =
      '<div class="alert alert-danger py-2 mb-0">' + escapeHtml(m) + "</div>";
  }
  function showSuccess(m) {
    feedback.innerHTML =
      '<div class="alert alert-success py-2 mb-0">' + escapeHtml(m) + "</div>";
  }
  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }
})();
