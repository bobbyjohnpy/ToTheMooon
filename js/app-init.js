// js/app-init.js
import { loadLayout } from "./layout.js";
import { initNav } from "./nav.js";
import { initAuthUI } from "./auth-ui.js";
import { initAuth, onAuthReady, getUID } from "./auth.js";
import { clearTasksUI } from "./tasks.js";
import { initThemeToggle } from "./theme.js";
import { initProjectTasks } from "./tasks.js";
import { setCurrentProject } from "./project.js";
import { initProjectUI, populateProjectDropdown } from "./project-ui.js";
import { ensureFirstProject } from "./projects-service.js";
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
  onAuthReady(async (user) => {
    if (!document.getElementById("todo")) return;

    if (user.uid !== lastLoadedUID) {
      console.log("Auth change → init project task system:", user.uid);

      clearTasksUI();
      lastLoadedUID = user.uid;

      // 1️⃣ Ensure at least one project exists
      const firstProjectId = await ensureFirstProject(user.uid);

      // 2️⃣ Populate dropdown (existing OR newly created projects)
      await populateProjectDropdown(user.uid);

      // 3️⃣ Init project-aware task listeners
      initProjectTasks(user.uid);
      initProjectUI();
      // 4️⃣ Activate project (triggers task load)
      setCurrentProject(firstProjectId);
    }
  });

  // 6️⃣ Service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js");
    });
  }
})();
