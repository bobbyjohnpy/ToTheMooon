export async function loadLayout() {
  const res = await fetch("/partials/layout.html");
  const html = await res.text();

  document.body.insertAdjacentHTML("afterbegin", html);
}
