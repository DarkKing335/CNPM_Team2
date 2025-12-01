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
  if (!permSet.has("Add")) {
    alert("You lack Add permission for Customer.");
    return location.replace("/login.html");
  }

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("auth");
    location.replace("/login.html");
  });

  const form = document.getElementById("createCustomerForm");
  const feedback = document.getElementById("feedback");
  const saveBtn = document.getElementById("saveBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    feedback.innerHTML = "";
    const payload = {
      name: document.getElementById("custName").value.trim(),
      phone: document.getElementById("custPhone").value.trim(),
      email: document.getElementById("custEmail").value.trim(),
      address: document.getElementById("custAddress").value.trim(),
    };
    if (!payload.name) {
      return showError("Name is required");
    }
    saveBtn.disabled = true;
    saveBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm me-1"></span>Saving';
    try {
      const res = await fetch("/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + auth.token,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      showSuccess("Customer created successfully");
      form.reset();
    } catch (err) {
      showError(err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-save me-1"></i>Save';
    }
  });

  function showError(msg) {
    feedback.innerHTML =
      '<div class="alert alert-danger py-2 mb-0">' + escapeHtml(msg) + "</div>";
  }
  function showSuccess(msg) {
    feedback.innerHTML =
      '<div class="alert alert-success py-2 mb-0">' +
      escapeHtml(msg) +
      "</div>";
  }
  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
})();
