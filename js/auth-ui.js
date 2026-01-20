import { signIn, upgradeAnonymousAccount, logout } from "./auth.js";

/* =====================================================
   AUTH ACTIONS (used by modal buttons)
===================================================== */
window.linkAccount = async function () {
  const email = document.getElementById("authEmail")?.value.trim();
  const password = document.getElementById("authPassword")?.value;

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  await upgradeAnonymousAccount(email, password);
};

window.signIn = async function () {
  const email = document.getElementById("authEmail")?.value.trim();
  const password = document.getElementById("authPassword")?.value;

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  await signIn(email, password);
};

/* =====================================================
   UI INITIALIZER (RUN ON EVERY PAGE)
===================================================== */
export function initAuthUI() {
  /* ---------- SIGN-IN MODAL ---------- */
  const authPanel = document.getElementById("authPanel");
  const authModal = document.querySelector(".auth-modal");
  const signInButton = document.getElementById("signInButton");
  const signInBtnModal = document.getElementById("signInButtonModal");
  const signInTab = document.getElementById("signInTab");
  const createTab = document.getElementById("createTab");
  const authCloseBtn = document.getElementById("authCloseBtn");

  let mode = "signin";

  if (signInButton && authPanel) {
    signInButton.addEventListener("click", () => {
      authPanel.classList.remove("hidden");
    });
  }

  if (signInTab && createTab && signInBtnModal) {
    signInTab.addEventListener("click", () => {
      mode = "signin";
      signInTab.classList.add("active");
      createTab.classList.remove("active");
      signInBtnModal.textContent = "SIGN IN";
    });

    createTab.addEventListener("click", () => {
      mode = "create";
      createTab.classList.add("active");
      signInTab.classList.remove("active");
      signInBtnModal.textContent = "CREATE ACCOUNT";
    });
  }

  signInBtnModal?.addEventListener("click", async () => {
    if (mode === "signin") {
      await window.signIn();
    } else {
      await window.linkAccount();
    }
  });

  authCloseBtn?.addEventListener("click", () => {
    authPanel.classList.add("hidden");
  });

  authModal?.addEventListener("click", (e) => e.stopPropagation());

  authPanel?.addEventListener("click", (e) => {
    if (e.target === authPanel) {
      authPanel.classList.add("hidden");
    }
  });

  /* ---------- LOGOUT MODAL ---------- */
  const logoutPanel = document.getElementById("logoutPanel");
  const logoutModal = logoutPanel?.querySelector(".auth-modal");
  const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");
  const cancelLogoutBtn = document.getElementById("cancelLogoutBtn");
  const logoutCloseBtn = document.getElementById("logoutCloseBtn");

  // 🔥 EVENT DELEGATION — WORKS ON EVERY PAGE
  document.addEventListener("click", (e) => {
    if (e.target.closest("#logoutBtn")) {
      logoutPanel?.classList.remove("hidden");
    }
  });

  confirmLogoutBtn?.addEventListener("click", async () => {
    logoutPanel.classList.add("hidden");
    await logout();
  });

  const closeLogoutModal = () => {
    logoutPanel?.classList.add("hidden");
  };

  cancelLogoutBtn?.addEventListener("click", closeLogoutModal);
  logoutCloseBtn?.addEventListener("click", closeLogoutModal);

  logoutModal?.addEventListener("click", (e) => e.stopPropagation());

  logoutPanel?.addEventListener("click", (e) => {
    if (e.target === logoutPanel) {
      closeLogoutModal();
    }
  });

  /* ---------- ESC KEY (GLOBAL) ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      authPanel?.classList.add("hidden");
      logoutPanel?.classList.add("hidden");
    }
  });
  function toggleDarkMode() {
    document.documentElement.classList.toggle("dark");
  }
  document
    .getElementById("darkModeToggle")
    .addEventListener("click", toggleDarkMode);
}
