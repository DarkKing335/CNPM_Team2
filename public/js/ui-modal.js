(function () {
  // Ensure modal exists; if not, create one and append to body
  function createModal() {
    if (document.getElementById("globalUiModalOverlay")) {return;}
    const overlay = document.createElement("div");
    overlay.id = "globalUiModalOverlay";
    overlay.className =
      "hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center";
    overlay.innerHTML = `
      <div id="globalUiModalDialog" class="mx-4 max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div class="p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 id="globalUiModalTitle" class="text-lg font-semibold text-gray-900 dark:text-white">Message</h3>
        </div>
        <div class="p-4">
          <p id="globalUiModalMessage" class="text-sm text-gray-700 dark:text-gray-300"></p>
        </div>
        <div class="p-4 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-700">
          <button id="globalUiModalCancelBtn" class="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Cancel</button>
          <button id="globalUiModalOkBtn" class="px-4 py-2 rounded bg-primary text-white">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function getEls() {
    return {
      overlay: document.getElementById("globalUiModalOverlay"),
      title: document.getElementById("globalUiModalTitle"),
      message: document.getElementById("globalUiModalMessage"),
      ok: document.getElementById("globalUiModalOkBtn"),
      cancel: document.getElementById("globalUiModalCancelBtn"),
    };
  }

  function ensure() {
    if (!document.getElementById("globalUiModalOverlay")) {createModal();}
    return getEls();
  }

  window.showAlert = function showAlert(msg, titleText) {
    const els = ensure();
    if (!els.overlay || !els.ok || !els.message) {
      // fallback
      window.alert(msg);
      return Promise.resolve();
    }
    els.title.textContent = titleText || "Notice";
    els.message.textContent = msg;
    els.cancel.classList.add("hidden");
    els.overlay.classList.remove("hidden");
    return new Promise((resolve) => {
      const okHandler = function () {
        els.ok.removeEventListener("click", okHandler);
        els.overlay.classList.add("hidden");
        resolve();
      };
      els.ok.addEventListener("click", okHandler);
    });
  };

  window.showConfirm = function showConfirm(msg, titleText) {
    const els = ensure();
    if (!els.overlay || !els.ok || !els.cancel || !els.message) {
      // fallback
      return Promise.resolve(window.confirm(msg));
    }
    els.title.textContent = titleText || "Confirm";
    els.message.textContent = msg;
    els.cancel.classList.remove("hidden");
    els.overlay.classList.remove("hidden");
    return new Promise((resolve) => {
      const okHandler = function () {
        cleanup();
        resolve(true);
      };
      const cancelHandler = function () {
        cleanup();
        resolve(false);
      };
      function cleanup() {
        els.ok.removeEventListener("click", okHandler);
        els.cancel.removeEventListener("click", cancelHandler);
        els.overlay.classList.add("hidden");
      }
      els.ok.addEventListener("click", okHandler);
      els.cancel.addEventListener("click", cancelHandler);
    });
  };
})();
