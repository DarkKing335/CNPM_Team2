(function () {
  const auth =
    window.__AUTH__ || JSON.parse(localStorage.getItem("auth") || "null");
  if (!auth) {
    location.replace("/login.html");
    return;
  }
  const token = auth.token;
  const userPermissions = new Set(
    (auth.user?.permissions || []).map(
      (p) => `${p.name_permission}:${p.module}`
    )
  );

  // Dynamic sidebar menu based on permissions
  function buildAdminMenu() {
    const nav = document.querySelector(".sidebar-nav");
    nav.innerHTML = "";

    const menuItems = [
      { id: "users", label: "Quản lý Người dùng", permission: "View:User" },
      {
        id: "permissions",
        label: "Quản lý Quyền",
        permission: "View:Permission",
      },
      {
        id: "functions",
        label: "Quản lý Chức năng",
        permission: "View:Module",
      },
      {
        id: "assign-functions",
        label: "Gán Chức năng",
        permission: "Edit:Permission",
      },
    ];

    menuItems.forEach((item, index) => {
      // For now, show all to Admin (can be refined with granular permissions)
      const btn = document.createElement("button");
      btn.className = index === 0 ? "nav-btn active" : "nav-btn";
      btn.dataset.tab = item.id;
      btn.textContent = item.label;
      nav.appendChild(btn);
    });

    // Re-attach event listeners
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".nav-btn")
          .forEach((b) => b.classList.remove("active"));
        document
          .querySelectorAll(".tab-content")
          .forEach((t) => t.classList.remove("active"));
        btn.classList.add("active");
        const tabId = btn.dataset.tab;
        const tab = document.getElementById(tabId);
        if (tab) tab.classList.add("active");
      });
    });
  }

  buildAdminMenu();

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("lastLogin");
    location.replace("/login.html");
  });

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      ...opts,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
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

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ error: "Request failed" }));
      throw new Error(errorData.error || "Request failed");
    }
    return res.json();
  }

  // Demo data loads - these endpoints are protected by permissions
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  async function loadUsers() {
    try {
      const tbody = document.getElementById("usersTable");
      const { data } = await api("/admin/users");
      tbody.innerHTML =
        data
          .map(
            (u) =>
              `<tr>
                <td><span class="badge bg-secondary">${escapeHtml(
                  String(u.id)
                )}</span></td>
                <td><i class="bi bi-person-fill text-primary me-2"></i>${escapeHtml(
                  u.username
                )}</td>
                <td>${(u.roles || [])
                  .map(
                    (r) =>
                      `<span class="badge bg-info me-1">${escapeHtml(r)}</span>`
                  )
                  .join("")}</td>
              </tr>`
          )
          .join("") ||
        '<tr><td colspan="3" class="text-center text-muted">Không có người dùng</td></tr>';
    } catch (err) {
      console.error("Error loading users:", err);
      document.getElementById("usersTable").innerHTML =
        '<tr><td colspan="3"><div class="alert alert-danger mb-0">Lỗi tải danh sách người dùng</div></td></tr>';
    }
  }

  async function loadPermissions() {
    try {
      const tbody = document.getElementById("permissionsTable");
      const { data } = await api("/admin/permissions");
      const rows = data
        .map(
          (p) =>
            `<tr>
              <td><span class="badge bg-secondary">${escapeHtml(
                String(p.id)
              )}</span></td>
              <td><span class="badge bg-primary">${escapeHtml(
                p.name_permission
              )}</span></td>
              <td><span class="badge bg-success">${escapeHtml(
                p.module
              )}</span></td>
              <td>-</td>
              <td><button class="btn btn-sm btn-outline-secondary" disabled><i class="bi bi-pencil"></i></button></td>
            </tr>`
        )
        .join("");
      tbody.innerHTML =
        rows ||
        '<tr><td colspan="5" class="text-center text-muted">Không có quyền</td></tr>';
    } catch (err) {
      console.error("Error loading permissions:", err);
      document.getElementById("permissionsTable").innerHTML =
        '<tr><td colspan="5"><div class="alert alert-danger mb-0">Lỗi tải danh sách quyền</div></td></tr>';
    }
  }

  async function loadFunctions() {
    try {
      const tbody = document.getElementById("functionsTable");
      const { data } = await api("/admin/modules");
      tbody.innerHTML = data
        .map(
          (m, i) =>
            `<tr>
              <td><span class="badge bg-secondary">${i + 1}</span></td>
              <td><span class="badge bg-info">${escapeHtml(m)}</span></td>
              <td>Module</td>
            </tr>`
        )
        .join("");
    } catch (err) {
      console.error("Error loading modules:", err);
      document.getElementById("functionsTable").innerHTML =
        '<tr><td colspan="3"><div class="alert alert-danger mb-0">Lỗi tải danh sách chức năng</div></td></tr>';
    }
  }

  // Assign functions to role
  async function setupAssignTab() {
    const roleSel = document.getElementById("permissionSelect");
    const moduleSel = document.getElementById("moduleSelect");
    const grid = document.getElementById("functionsGrid");
    const saveBtn = document.getElementById("saveAssignmentsBtn");
    const toggleAll = document.getElementById("toggleAllModule");
    const hint = document.getElementById("selectionHint");

    let perms = [];
    let permsByModule = new Map();
    let currentSelected = new Set();

    function renderModuleOptions() {
      const modules = Array.from(permsByModule.keys());
      moduleSel.innerHTML =
        '<option value="">-- Chọn module --</option>' +
        modules
          .map(
            (m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`
          )
          .join("");
      moduleSel.disabled = modules.length === 0;
      toggleAll.disabled = true;
    }

    function renderGridForModule(moduleName) {
      grid.innerHTML = "";
      if (!moduleName) {
        toggleAll.checked = false;
        toggleAll.disabled = true;
        hint.textContent =
          "Hãy chọn một module để gán các phần nhỏ (View/Edit/Add/Delete).";
        return;
      }
      const list = permsByModule.get(moduleName) || [];
      const html = list
        .map((p) => {
          const checked = currentSelected.has(p.id) ? "checked" : "";
          return `
            <div class="col-md-6">
              <div class="form-check p-3 border rounded bg-light">
                <input class="form-check-input module-perm" data-module="${escapeHtml(
                  p.module
                )}" type="checkbox" value="${escapeHtml(
            String(p.id)
          )}" ${checked} id="perm${p.id}">
                <label class="form-check-label" for="perm${p.id}">
                  <strong>${escapeHtml(
                    p.name_permission
                  )}</strong> trong <span class="badge bg-info">${escapeHtml(
            p.module
          )}</span>
                </label>
              </div>
            </div>`;
        })
        .join("");
      grid.innerHTML =
        html ||
        '<div class="col-12 text-muted">Module này chưa có phần nhỏ nào.</div>';

      // Setup change handlers
      grid.querySelectorAll(".module-perm").forEach((cb) => {
        cb.addEventListener("change", () => {
          const id = parseInt(cb.value, 10);
          if (cb.checked) currentSelected.add(id);
          else currentSelected.delete(id);
          updateToggleAllState(moduleName);
        });
      });

      toggleAll.disabled = list.length === 0;
      updateToggleAllState(moduleName);
      hint.textContent = `Đang gán phần nhỏ cho module: ${moduleName}`;
    }

    function updateToggleAllState(moduleName) {
      const list = permsByModule.get(moduleName) || [];
      if (!list.length) {
        toggleAll.checked = false;
        toggleAll.indeterminate = false;
        return;
      }
      const total = list.length;
      const selected = list.filter((p) => currentSelected.has(p.id)).length;
      toggleAll.indeterminate = selected > 0 && selected < total;
      toggleAll.checked = selected === total;
    }

    toggleAll.addEventListener("change", () => {
      const moduleName = moduleSel.value;
      const list = permsByModule.get(moduleName) || [];
      list.forEach((p) => {
        if (toggleAll.checked) currentSelected.add(p.id);
        else currentSelected.delete(p.id);
      });
      renderGridForModule(moduleName);
    });

    try {
      const [rolesRes, permsRes] = await Promise.all([
        api("/admin/roles"),
        api("/admin/permissions"),
      ]);
      const roles = rolesRes.data;
      perms = permsRes.data;
      permsByModule = perms.reduce((map, p) => {
        if (!map.has(p.module)) map.set(p.module, []);
        map.get(p.module).push(p);
        return map;
      }, new Map());

      roleSel.innerHTML =
        '<option value="">-- Chọn quyền --</option>' +
        roles
          .map(
            (r) =>
              `<option value="${escapeHtml(String(r.id))}">${escapeHtml(
                r.name_role
              )}</option>`
          )
          .join("");

      renderModuleOptions();

      roleSel.addEventListener("change", async () => {
        const roleId = parseInt(roleSel.value, 10);
        grid.innerHTML = "";
        moduleSel.value = "";
        toggleAll.checked = false;
        toggleAll.disabled = true;
        hint.textContent =
          "Hãy chọn một module để gán các phần nhỏ (View/Edit/Add/Delete).";
        saveBtn.disabled = !roleId;
        if (!roleId) return;

        try {
          const current = (
            await api("/admin/role-permissions?roleId=" + roleId)
          ).data;
          currentSelected = new Set(current);
          // User can now pick module
          moduleSel.disabled = false;
        } catch (err) {
          console.error("Error loading role permissions:", err);
          grid.innerHTML =
            '<div class="col-12"><div class="alert alert-danger">Error loading permissions for this role</div></div>';
        }
      });

      moduleSel.addEventListener("change", () => {
        const moduleName = moduleSel.value;
        renderGridForModule(moduleName);
      });

      saveBtn.addEventListener("click", async () => {
        const roleId = parseInt(roleSel.value, 10);
        if (!roleId) return;

        try {
          await api("/admin/role-permissions", {
            method: "POST",
            body: JSON.stringify({
              roleId,
              permissionIds: Array.from(currentSelected),
            }),
          });
          alert("Đã lưu gán chức năng cho quyền.");
        } catch (err) {
          console.error("Error saving role permissions:", err);
          alert("Lỗi: Không thể lưu gán chức năng. " + err.message);
        }
      });
    } catch (err) {
      console.error("Error setting up assign tab:", err);
      roleSel.innerHTML = "<option>Error loading roles</option>";
      saveBtn.disabled = true;
    }
  }

  // Add Permission Modal Handler
  function setupAddPermissionModal() {
    const addPermissionBtn = document.getElementById("addPermissionBtn");
    const savePermissionBtn = document.getElementById("savePermissionBtn");
    const permissionForm = document.getElementById("addPermissionForm");
    const permissionNameInput = document.getElementById("permissionName");
    const permissionModuleInput = document.getElementById("permissionModule");
    const errorDiv = document.getElementById("permissionError");
    const successDiv = document.getElementById("permissionSuccess");

    const modal = new bootstrap.Modal(
      document.getElementById("addPermissionModal")
    );

    // Open modal
    addPermissionBtn.addEventListener("click", () => {
      permissionForm.reset();
      errorDiv.classList.add("d-none");
      successDiv.classList.add("d-none");
      modal.show();
    });

    // Save permission
    savePermissionBtn.addEventListener("click", async () => {
      errorDiv.classList.add("d-none");
      successDiv.classList.add("d-none");

      const permissionName = permissionNameInput.value.trim();
      const permissionModule = permissionModuleInput.value.trim();

      // Validation
      if (!permissionName || !permissionModule) {
        errorDiv.textContent = "Vui lòng điền đầy đủ thông tin";
        errorDiv.classList.remove("d-none");
        return;
      }

      if (permissionModule.length < 1 || permissionModule.length > 100) {
        errorDiv.textContent = "Tên module phải từ 1-100 ký tự";
        errorDiv.classList.remove("d-none");
        return;
      }

      // Disable button while processing
      savePermissionBtn.disabled = true;
      savePermissionBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-1"></span>Đang tạo...';

      try {
        const response = await api("/admin/permissions", {
          method: "POST",
          body: JSON.stringify({
            name_permission: permissionName,
            module: permissionModule,
          }),
        });

        successDiv.textContent = `Đã tạo quyền ${permissionName} cho module ${permissionModule} thành công!`;
        successDiv.classList.remove("d-none");

        // Reset form
        permissionForm.reset();

        // Reload permissions table
        await loadPermissions();

        // Close modal after 1.5 seconds
        setTimeout(() => {
          modal.hide();
        }, 1500);
      } catch (err) {
        console.error("Error creating permission:", err);
        errorDiv.textContent =
          err.message || "Lỗi khi tạo quyền. Vui lòng thử lại.";
        errorDiv.classList.remove("d-none");
      } finally {
        savePermissionBtn.disabled = false;
        savePermissionBtn.innerHTML =
          '<i class="bi bi-check-circle me-1"></i>Tạo Quyền';
      }
    });

    // Reset form when modal closes
    document
      .getElementById("addPermissionModal")
      .addEventListener("hidden.bs.modal", () => {
        permissionForm.reset();
        errorDiv.classList.add("d-none");
        successDiv.classList.add("d-none");
      });
  }

  // Initial loads
  loadUsers();
  loadPermissions();
  loadFunctions();
  setupAssignTab();
  setupAddPermissionModal();
})();
