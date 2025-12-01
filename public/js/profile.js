// Profile page functionality
const API_BASE = "";
let currentUser = null;
let sessionStartTime = Date.now();

// Initialize profile page
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  await loadProfileData();
  setupEventListeners();
  startSessionTimer();
});

// Load user profile data
async function loadProfileData() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("auth");
      localStorage.removeItem("lastLogin");
      window.location.href = "/login.html";
      return;
    }

    if (!response.ok) {
      throw new Error("Failed to load profile");
    }

    currentUser = await response.json();
    renderProfile(currentUser);
  } catch (error) {
    console.error("Error loading profile:", error);
    showError("Failed to load profile data");
  }
}

// Render profile information
function renderProfile(user) {
  // Update header username
  const headerUsername = document.getElementById("headerUsername");
  if (headerUsername) {
    headerUsername.textContent = user.username || "User";
  }

  // Basic info
  document.getElementById("profileUsername").textContent = user.username || "-";
  document.getElementById("profileUserId").textContent = user.userId || "-";

  // Roles
  const rolesContainer = document.getElementById("profileRoles");
  if (user.roles && user.roles.length > 0) {
    rolesContainer.innerHTML = user.roles
      .map(
        (role) =>
          `<span class="badge bg-primary me-1">${escapeHtml(role)}</span>`
      )
      .join("");
  } else {
    rolesContainer.innerHTML =
      '<span class="badge bg-secondary">No roles</span>';
  }

  // Permissions
  const permsContainer = document.getElementById("profilePermissions");
  if (user.permissions && user.permissions.length > 0) {
    const uniquePerms = [...new Set(user.permissions)];
    permsContainer.innerHTML = uniquePerms
      .map(
        (perm) =>
          `<span class="badge bg-success me-1 mb-1">${escapeHtml(perm)}</span>`
      )
      .join("");
  } else {
    permsContainer.innerHTML =
      '<span class="badge bg-secondary">No permissions</span>';
  }

  // Last login (if available)
  const lastLogin = localStorage.getItem("lastLogin");
  if (lastLogin) {
    document.getElementById("profileLastLogin").textContent = new Date(
      lastLogin
    ).toLocaleString();
  } else {
    document.getElementById("profileLastLogin").textContent = "Current session";
  }

  // Statistics
  updateStatistics(user);
}

// Update statistics section
function updateStatistics(user) {
  // Days since account created (mock data - would need backend support)
  document.getElementById("statDaysSinceCreated").textContent = "30+";

  // Permission count
  const permCount = user.permissions ? new Set(user.permissions).size : 0;
  document.getElementById("statPermissionCount").textContent = permCount;

  // Role count
  const roleCount = user.roles ? user.roles.length : 0;
  document.getElementById("statRoleCount").textContent = roleCount;

  // Session time
  document.getElementById("statSessionTime").textContent = "0m";
}

// Start session timer
function startSessionTimer() {
  setInterval(() => {
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    document.getElementById("statSessionTime").textContent = timeStr;
  }, 1000);
}

// Setup event listeners
function setupEventListeners() {
  // Logout button
  document.getElementById("logoutBtn").addEventListener("click", logout);

  // Password change form
  document
    .getElementById("changePasswordForm")
    .addEventListener("submit", handlePasswordChange);
}

// Handle password change
async function handlePasswordChange(e) {
  e.preventDefault();

  const currentPassword = document
    .getElementById("currentPassword")
    .value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmPassword = document
    .getElementById("confirmPassword")
    .value.trim();

  // Hide previous messages
  document.getElementById("passwordError").classList.add("d-none");
  document.getElementById("passwordSuccess").classList.add("d-none");

  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    showPasswordError("All fields are required");
    return;
  }

  if (newPassword.length < 6) {
    showPasswordError("New password must be at least 6 characters");
    document.getElementById("newPassword").focus();
    return;
  }

  if (newPassword !== confirmPassword) {
    showPasswordError("New passwords do not match");
    document.getElementById("confirmPassword").focus();
    return;
  }

  if (currentPassword === newPassword) {
    showPasswordError("New password must be different from current password");
    document.getElementById("newPassword").focus();
    return;
  }

  // Submit password change
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to change password");
    }

    showPasswordSuccess("Password changed successfully! Please login again.");
    document.getElementById("changePasswordForm").reset();

    // Logout after 2 seconds
    setTimeout(() => {
      logout();
    }, 2000);
  } catch (error) {
    console.error("Error changing password:", error);
    showPasswordError(error.message || "Failed to change password");
  }
}

// Show password error
function showPasswordError(message) {
  const errorEl = document.getElementById("passwordError");
  document.getElementById("passwordErrorText").textContent = message;
  errorEl.classList.remove("d-none");

  // Scroll to error
  errorEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Show password success
function showPasswordSuccess(message) {
  const successEl = document.getElementById("passwordSuccess");
  document.getElementById("passwordSuccessText").textContent = message;
  successEl.classList.remove("d-none");

  // Scroll to success
  successEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Show general error
function showError(message) {
  alert(message);
}

// Logout
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("lastLogin");
  window.location.href = "/login.html";
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  if (typeof str !== "string") str = String(str);

  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
