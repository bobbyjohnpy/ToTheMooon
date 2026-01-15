import { signIn, upgradeAnonymousAccount, logout } from "./auth.js";

window.linkAccount = async function () {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  try {
    await upgradeAnonymousAccount(email, password);
    alert("Account created. Your data is now synced.");
  } catch (err) {
    alert(err.message);
  }
};

window.signIn = async function () {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  try {
    await signIn(email, password);
  } catch (err) {
    alert(err.message);
  }
};
