export function injectNav(active) {
  document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <nav>
      <a href="index.html" class="${
        active === "dashboard" ? "active" : ""
      }">Dashboard</a>
      <a href="track.html" class="${
        active === "track" ? "active" : ""
      }">Track</a>
      <a href="tasks.html" class="${
        active === "tasks" ? "active" : ""
      }">Tasks</a>
      <a href="notes.html" class="${
        active === "notes" ? "active" : ""
      }">Notes</a>
      <a href="progress.html" class="${
        active === "progress" ? "active" : ""
      }">Progress</a>
      <button id="logoutBtn" onclick="logout()" style="display:none;">Log out</button>
    </nav>
    `
  );
}
