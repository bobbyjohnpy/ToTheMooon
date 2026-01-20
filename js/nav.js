export function initNav() {
  const links = document.querySelectorAll("header nav a");

  const page =
    location.pathname.split("/").pop().replace(".html", "") || "index";

  links.forEach((link) => {
    const target = link.textContent.toLowerCase();

    if (target === page) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }

    link.addEventListener("click", () => {
      location.href = `/${target}.html`;
    });
  });
}
