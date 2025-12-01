// Create Order page
let auth = null;

// Check authentication
try {
  const saved = localStorage.getItem("auth");
  if (!saved) {
    window.location.href = "/login.html";
  } else {
    auth = JSON.parse(saved);

    // Check if user has Add permission
    const permissions = new Set(
      (auth.user?.permissions || []).map((p) => p.name_permission)
    );
    if (!permissions.has("Add")) {
      alert("You do not have permission to create orders.");
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
      "flex items-center gap-3 px-3 py-2 rounded-lg text-[#616f89] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800";
    adminLink.href = "/admin.html";
    adminLink.innerHTML = `
            <span class="material-symbols-outlined">dashboard</span>
            <p class="text-sm font-medium leading-normal">Admin Dashboard</p>
        `;
    nav.insertBefore(adminLink, nav.firstChild);
  }

  // Event listeners
  document
    .getElementById("createOrderForm")
    .addEventListener("submit", createOrder);
  document.getElementById("cancelBtn").addEventListener("click", () => {
    if (
      confirm(
        "Are you sure you want to cancel? Any unsaved changes will be lost."
      )
    ) {
      window.location.href = "/login.html";
    }
  });
  document.getElementById("logoutLink").addEventListener("click", logout);
}

async function createOrder(e) {
  e.preventDefault();

  const description = document.getElementById("orderDescription").value.trim();

  if (!description) {
    alert("Please enter an order description.");
    return;
  }

  const submitBtn = document.getElementById("submitBtn");
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Creating...";

  try {
    const res = await fetch("/orders", {
      method: "POST",
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
      alert("Order created successfully!");
      document.getElementById("orderDescription").value = "";
      document.getElementById("customerName").value = "";
      document.getElementById("customerPhone").value = "";
      document.getElementById("customerEmail").value = "";
      document.getElementById("customerAddress").value = "";
      // Optionally redirect back to main app
      if (confirm("Order created! Go back to main app?")) {
        window.location.href = "/login.html";
      }
    } else {
      throw new Error(data.error || "Failed to create order");
    }
  } catch (err) {
    alert("Error creating order: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

function logout() {
  try {
    localStorage.removeItem("auth");
  } catch (e) {}
  window.location.href = "/login.html";
}
