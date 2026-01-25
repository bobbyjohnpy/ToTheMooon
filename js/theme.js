const STORAGE_KEY = "theme";

export function initThemeToggle() {
  const btn = document.getElementById("darkModeToggle");
  if (!btn) return;

  // Restore saved state
  if (localStorage.getItem(STORAGE_KEY) === "dark") {
    document.documentElement.classList.add("dark");
  }

  btn.addEventListener("click", () => {
    const html = document.documentElement;
    const isDark = html.classList.toggle("dark");

    localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  });
}
