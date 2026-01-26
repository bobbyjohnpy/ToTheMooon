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
import { setKanbanMode } from "./kanban-mode.js";
import { loadRootKanban } from "./root-kanban.js";
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
    if (user.uid === lastLoadedUID) return;

    console.log("Auth change → init project system:", user.uid);

    lastLoadedUID = user.uid;

    // 🔹 ALWAYS run (all pages)
    const firstProjectId = await ensureFirstProject(user.uid);
    await populateProjectDropdown(user.uid);
    initProjectUI(); // dropdown listeners, root option, etc.

    // 🔹 Tasks page ONLY
    if (document.getElementById("todo")) {
      clearTasksUI();

      initProjectTasks(user.uid);

      // start in ROOT kanban
      setKanbanMode("root");
      loadRootKanban(user.uid);
    }
  });

  // 6️⃣ Service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js");
    });
  }
})();
window.addEventListener("enter-project", (e) => {
  const projectId = e.detail;
  const uid = getUID();
  if (!uid || !projectId) return;

  setKanbanMode("project");
  setCurrentProject(projectId);
});
