export function initNav() {
  const links = document.querySelectorAll("header nav a");

  const page =
    location.pathname.split("/").pop().replace(".html", "") || "index";
  console.log(page);
  links.forEach((link) => {
    const target = link.textContent.toLowerCase();
    console.log(target);

    if (target === page || (target === "dashboard" && page === "index")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }

    link.addEventListener("click", () => {
      if (target !== "dashboard") {
        location.href = `/${target}.html`;
      } else {
        location.href = "index.html";
      }
    });
  });
}
