// Settings page functionality
const API_BASE = "";

// Default settings
const DEFAULT_SETTINGS = {
  theme: "light",
  fontSize: "medium",
  language: "en",
  emailNotifications: true,
  browserNotifications: false,
  soundNotifications: true,
  sessionTimeout: 60,
  rememberMe: true,
  twoFactorAuth: false,
  defaultPageSize: 10,
  dateFormat: "MM/DD/YYYY",
  highContrast: false,
  reducedMotion: false,
  keyboardNav: false,
};

let currentSettings = { ...DEFAULT_SETTINGS };

// Initialize settings page
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  // Set username in header and verify token
  try {
    const auth = localStorage.getItem("auth");
    if (auth) {
      const authData = JSON.parse(auth);
      const headerUsername = document.getElementById("headerUsername");
      if (headerUsername && authData.user) {
        headerUsername.textContent = authData.user.username || "User";
      }
    }

    // Verify token is still valid by making a test request
    const testResponse = await fetch("/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (testResponse.status === 401) {
      // Token expired - redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("auth");
      localStorage.removeItem("lastLogin");
      window.location.href = "/login.html";
      return;
    }
  } catch (e) {
    console.error("Error loading user data:", e);
  }

  loadSettings();
  setupEventListeners();
  applyTheme();
});

// Load settings from localStorage
function loadSettings() {
  try {
    const saved = localStorage.getItem("userSettings");
    if (saved) {
      currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error("Error loading settings:", error);
    currentSettings = { ...DEFAULT_SETTINGS };
  }

  renderSettings();
}

// Render settings in UI
function renderSettings() {
  // Appearance
  document.getElementById("themeSelect").value = currentSettings.theme;
  document.getElementById("fontSizeSelect").value = currentSettings.fontSize;
  document.getElementById("languageSelect").value = currentSettings.language;

  // Notifications
  document.getElementById("emailNotifications").checked =
    currentSettings.emailNotifications;
  document.getElementById("browserNotifications").checked =
    currentSettings.browserNotifications;
  document.getElementById("soundNotifications").checked =
    currentSettings.soundNotifications;

  // Privacy & Security
  document.getElementById("sessionTimeout").value =
    currentSettings.sessionTimeout;
  document.getElementById("rememberMe").checked = currentSettings.rememberMe;
  document.getElementById("twoFactorAuth").checked =
    currentSettings.twoFactorAuth;
  document.getElementById("twoFactorAuth").disabled = true; // Coming soon

  // Data & Storage
  document.getElementById("defaultPageSize").value =
    currentSettings.defaultPageSize;
  document.getElementById("dateFormat").value = currentSettings.dateFormat;

  // Accessibility
  document.getElementById("highContrast").checked =
    currentSettings.highContrast;
  document.getElementById("reducedMotion").checked =
    currentSettings.reducedMotion;
  document.getElementById("keyboardNav").checked = currentSettings.keyboardNav;
}

// Setup event listeners
function setupEventListeners() {
  // Logout button
  document.getElementById("logoutBtn").addEventListener("click", logout);

  // Save button
  document.getElementById("saveBtn").addEventListener("click", saveSettings);

  // Reset button
  document.getElementById("resetBtn").addEventListener("click", resetSettings);

  // Clear cache button
  document
    .getElementById("clearCacheBtn")
    .addEventListener("click", clearCache);

  // Auto-save on change for better UX
  const inputs = document.querySelectorAll('select, input[type="checkbox"]');
  inputs.forEach((input) => {
    input.addEventListener("change", autoSave);
  });

  // Theme change - apply immediately
  document.getElementById("themeSelect").addEventListener("change", (e) => {
    currentSettings.theme = e.target.value;
    applyTheme();
  });

  // Font size change - apply immediately
  document.getElementById("fontSizeSelect").addEventListener("change", (e) => {
    currentSettings.fontSize = e.target.value;
    applyFontSize();
  });

  // Request browser notification permission
  document
    .getElementById("browserNotifications")
    .addEventListener("change", async (e) => {
      if (e.target.checked) {
        const permission = await requestNotificationPermission();
        if (permission !== "granted") {
          e.target.checked = false;
          showAlert("Browser notifications permission denied", "warning");
        }
      }
    });
}

// Auto-save settings
function autoSave() {
  setTimeout(() => {
    saveSettings(false); // Silent save
  }, 300);
}

// Save settings
function saveSettings(showMessage = true) {
  try {
    // Collect all settings
    currentSettings = {
      theme: document.getElementById("themeSelect").value,
      fontSize: document.getElementById("fontSizeSelect").value,
      language: document.getElementById("languageSelect").value,
      emailNotifications: document.getElementById("emailNotifications").checked,
      browserNotifications: document.getElementById("browserNotifications")
        .checked,
      soundNotifications: document.getElementById("soundNotifications").checked,
      sessionTimeout: parseInt(document.getElementById("sessionTimeout").value),
      rememberMe: document.getElementById("rememberMe").checked,
      twoFactorAuth: document.getElementById("twoFactorAuth").checked,
      defaultPageSize: parseInt(
        document.getElementById("defaultPageSize").value
      ),
      dateFormat: document.getElementById("dateFormat").value,
      highContrast: document.getElementById("highContrast").checked,
      reducedMotion: document.getElementById("reducedMotion").checked,
      keyboardNav: document.getElementById("keyboardNav").checked,
    };

    // Save to localStorage
    localStorage.setItem("userSettings", JSON.stringify(currentSettings));

    // Apply settings
    applySettings();

    if (showMessage) {
      showAlert("Settings saved successfully!", "success");
    }
  } catch (error) {
    console.error("Error saving settings:", error);
    showAlert("Failed to save settings", "danger");
  }
}

// Reset settings to defaults
function resetSettings() {
  if (confirm("Are you sure you want to reset all settings to defaults?")) {
    currentSettings = { ...DEFAULT_SETTINGS };
    localStorage.setItem("userSettings", JSON.stringify(currentSettings));
    renderSettings();
    applySettings();
    showAlert("Settings reset to defaults", "info");
  }
}

// Clear cache
function clearCache() {
  if (
    confirm(
      "Are you sure you want to clear all cached data? This will not log you out."
    )
  ) {
    try {
      // Clear everything except auth token and settings
      const token = localStorage.getItem("token");
      const auth = localStorage.getItem("auth");
      const settings = localStorage.getItem("userSettings");

      localStorage.clear();

      if (token) localStorage.setItem("token", token);
      if (auth) localStorage.setItem("auth", auth);
      if (settings) localStorage.setItem("userSettings", settings);

      showAlert("Cache cleared successfully!", "success");
    } catch (error) {
      console.error("Error clearing cache:", error);
      showAlert("Failed to clear cache", "danger");
    }
  }
}

// Apply all settings
function applySettings() {
  applyTheme();
  applyFontSize();
  applyAccessibility();
}

// Apply theme
function applyTheme() {
  const theme = currentSettings.theme;
  const root = document.documentElement;

  if (theme === "dark") {
    root.setAttribute("data-bs-theme", "dark");
  } else if (theme === "light") {
    root.setAttribute("data-bs-theme", "light");
  } else {
    // Auto theme - follow system preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    root.setAttribute("data-bs-theme", prefersDark ? "dark" : "light");
  }
}

// Apply font size
function applyFontSize() {
  const fontSize = currentSettings.fontSize;
  const root = document.documentElement;

  switch (fontSize) {
    case "small":
      root.style.fontSize = "14px";
      break;
    case "large":
      root.style.fontSize = "18px";
      break;
    default:
      root.style.fontSize = "16px";
  }
}

// Apply accessibility settings
function applyAccessibility() {
  const root = document.documentElement;

  // High contrast
  if (currentSettings.highContrast) {
    root.classList.add("high-contrast");
  } else {
    root.classList.remove("high-contrast");
  }

  // Reduced motion
  if (currentSettings.reducedMotion) {
    root.style.setProperty("--bs-transition-duration", "0s");
  } else {
    root.style.removeProperty("--bs-transition-duration");
  }
}

// Request notification permission
async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

// Show alert message
function showAlert(message, type = "info") {
  const alertContainer = document.getElementById("alertContainer");
  const alertId = "alert-" + Date.now();

  const alertHTML = `
    <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
      <i class="bi ${getAlertIcon(type)} me-2"></i>${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;

  alertContainer.insertAdjacentHTML("beforeend", alertHTML);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    const alert = document.getElementById(alertId);
    if (alert) {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
      bsAlert.close();
    }
  }, 5000);

  // Scroll to top to show alert
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Get icon for alert type
function getAlertIcon(type) {
  const icons = {
    success: "bi-check-circle-fill",
    danger: "bi-exclamation-triangle-fill",
    warning: "bi-exclamation-circle-fill",
    info: "bi-info-circle-fill",
  };
  return icons[type] || "bi-info-circle-fill";
}

// Logout
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("auth");
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

// Listen for system theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    if (currentSettings.theme === "auto") {
      applyTheme();
    }
  });
