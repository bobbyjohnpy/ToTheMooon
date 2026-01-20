import { loadLayout } from "./layout.js";
import { initAuthUI } from "./auth-ui.js";
import { initAuth } from "./auth.js";
import { initNav } from "./nav.js";

document.addEventListener("DOMContentLoaded", async () => {
  await loadLayout(); // inject HTML FIRST
  initNav(); // wire navbar
  initAuthUI(); // wire modals
  initAuth(); // firebase auth
});
