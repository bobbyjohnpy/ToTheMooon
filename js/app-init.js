// js/app-init.js
import { loadLayout } from "./layout.js";
import { initNav } from "./nav.js";
import { initAuthUI } from "./auth-ui.js";
import { initAuth, onAuthReady } from "./auth.js";
import { loadTasks, clearTasksUI } from "./tasks.js";
import { initThemeToggle } from "./theme.js";
let lastLoadedUID = null;

(async function initApp() {
  // 1️⃣ Load global layout
  await loadLayout();

  // 2️⃣ Init nav
  initNav();

  // 3️⃣ Init auth UI (THIS makes sign-in button work)
  initAuthUI();

  // 4️⃣ Start Firebase auth (anon → upgrade flow)
  initAuth();
  initThemeToggle(); // 🔥 AFTER layout
  // 5️⃣ React to auth state changes
  onAuthReady((user) => {
    if (!document.getElementById("todo")) return;

    // 🔄 UID changed (initial anon, sign-in, upgrade, logout)
    if (user.uid !== lastLoadedUID) {
      console.log("Auth change → reload tasks:", user.uid);

      clearTasksUI(); // 🔥 clear previous user's tasks
      lastLoadedUID = user.uid;
      loadTasks(user.uid); // 🔥 load correct user's tasks
    }
  });

  // 6️⃣ Service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js");
    });
  }
})();
