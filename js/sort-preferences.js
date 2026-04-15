const PREF_KEY = "appPreferences";

function getPreferences() {
  const stored = localStorage.getItem(PREF_KEY);
  return stored ? JSON.parse(stored) : {};
}

function savePreferences(prefs) {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
}
export function getSortPreference(page) {
  const prefs = getPreferences();
  return prefs[page] || { field: "createdAt", direction: "desc" };
}
export function setSortPreference(page, sort) {
  const prefs = getPreferences();
  prefs[page] = sort;
  savePreferences(prefs);
}
