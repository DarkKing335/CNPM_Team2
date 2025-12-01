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
  if (!permSet.has("Edit")) {
    alert("You lack Edit permission for Customer.");
    return location.replace("/login.html");
  }

  const select = document.getElementById("customerSelect");
  const refreshBtn = document.getElementById("refreshBtn");
  const editContainer = document.getElementById("editContainer");
  const feedback = document.getElementById("feedback");
  const form = document.getElementById("updateCustomerForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const saveBtn = document.getElementById("saveBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  let customers = [];
  let currentId = null;

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("auth");
    location.replace("/login.html");
  });
  refreshBtn.addEventListener("click", loadCustomers);
  select.addEventListener("change", onSelect);
  cancelBtn.addEventListener("click", () => {
    editContainer.classList.add("d-none");
    currentId = null;
    select.value = "";
  });
  form.addEventListener("submit", onSave);

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
    editContainer.classList.add("d-none");
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
      editContainer.classList.add("d-none");
      currentId = null;
      return;
    }
    const c = customers.find((x) => x.id === id);
    if (!c) return;
    currentId = id;
    populate(c);
  }

  function populate(c) {
    document.getElementById("custName").value = c.name || "";
    document.getElementById("custPhone").value = c.phone || "";
    document.getElementById("custEmail").value = c.email || "";
    document.getElementById("custAddress").value = c.address || "";
    editContainer.classList.remove("d-none");
    feedback.innerHTML = "";
  }

  async function onSave(e) {
    e.preventDefault();
    if (!currentId) return showError("Select a customer.");
    const payload = {
      name: val("custName"),
      phone: val("custPhone"),
      email: val("custEmail"),
      address: val("custAddress"),
    };
    if (!payload.name) return showError("Name required");
    saveBtn.disabled = true;
    saveBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm me-1"></span>Saving';
    try {
      await api("/customers/" + currentId, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      showSuccess("Updated");
      await loadCustomers();
      select.value = currentId;
      onSelect();
    } catch (err) {
      showError(err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-save me-1"></i>Save Changes';
    }
  }

  function val(id) {
    return document.getElementById(id).value.trim();
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
    d.textContent = s;
    return d.innerHTML;
  }
})();
