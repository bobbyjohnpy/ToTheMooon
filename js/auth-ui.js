import { signIn, upgradeAnonymousAccount, logout, getUser } from "./auth.js";

export function initAuthUI() {
  let authInProgress = false;
  let mode = "signin"; // signin or create

  const authPanel = document.getElementById("authPanel");
  const authModal = document.querySelector(".auth-modal");
  const signInBtn = document.getElementById("signInButtonModal");
  const signInTab = document.getElementById("signInTab");
  const createTab = document.getElementById("createTab");
  const authCloseBtn = document.getElementById("authCloseBtn");

  const logoutPanel = document.getElementById("logoutPanel");
  const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");
  const cancelLogoutBtn = document.getElementById("cancelLogoutBtn");
  const logoutCloseBtn = document.getElementById("logoutCloseBtn");

  // -------------------- SHOW AUTH PANEL --------------------
  document.getElementById("signInButton")?.addEventListener("click", () => {
    authPanel?.classList.remove("hidden");
    mode = "signin";
    signInTab?.classList.add("active");
    createTab?.classList.remove("active");
    signInBtn.textContent = "SIGN IN";
  });

  // -------------------- SWITCH TABS --------------------
  signInTab?.addEventListener("click", () => {
    mode = "signin";
    signInTab.classList.add("active");
    createTab.classList.remove("active");
    signInBtn.textContent = "SIGN IN";
  });

  createTab?.addEventListener("click", () => {
    mode = "create";
    createTab.classList.add("active");
    signInTab.classList.remove("active");
    signInBtn.textContent = "CREATE ACCOUNT";
  });

  // -------------------- SUBMIT AUTH --------------------
  signInBtn?.addEventListener("click", async () => {
    if (authInProgress) return;
    authInProgress = true;

    const email = document.getElementById("authEmail")?.value.trim();
    const password = document.getElementById("authPassword")?.value;

    if (!email || !password) {
      alert("Enter email and password");
      authInProgress = false;
      return;
    }

    try {
      const user = getUser();
      if (!user) throw new Error("Auth not ready");

      if (mode === "signin") {
        await signIn(email, password);
      } else {
        if (!user.isAnonymous) {
          alert("You already have an account");
          return;
        }
        await upgradeAnonymousAccount(email, password);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Authentication failed");
    } finally {
      authInProgress = false;
    }
  });

  // -------------------- CLOSE MODALS --------------------
  authCloseBtn?.addEventListener("click", () =>
    authPanel?.classList.add("hidden"),
  );
  authPanel?.addEventListener("click", (e) => {
    if (e.target === authPanel) authPanel.classList.add("hidden");
  });
  authModal?.addEventListener("click", (e) => e.stopPropagation());

  // -------------------- LOGOUT --------------------
  document.addEventListener("click", (e) => {
    if (e.target.closest("#logoutBtn")) logoutPanel?.classList.remove("hidden");
  });

  const closeLogoutModal = () => logoutPanel?.classList.add("hidden");
  cancelLogoutBtn?.addEventListener("click", closeLogoutModal);
  logoutCloseBtn?.addEventListener("click", closeLogoutModal);
  confirmLogoutBtn?.addEventListener("click", async () => {
    closeLogoutModal();
    await logout();
  });
  logoutPanel?.addEventListener("click", (e) => {
    if (e.target === logoutPanel) closeLogoutModal();
  });

  logoutPanel
    ?.querySelector(".auth-modal")
    ?.addEventListener("click", (e) => e.stopPropagation());

  // -------------------- ESC KEY --------------------
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      authPanel?.classList.add("hidden");
      logoutPanel?.classList.add("hidden");
    }
  });
}
