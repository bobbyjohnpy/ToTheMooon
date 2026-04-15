export function compareValues(a, b, field, direction, categoryCountMap = {}) {
  console.count("comparevalues called");
  let v1 = a[field];
  let v2 = b[field];

  // Firestore timestamp
  if (v1?.seconds) v1 = v1.seconds;
  if (v2?.seconds) v2 = v2.seconds;

  // priority ordering
  if (field === "urgency") {
    const order = { low: 1, medium: 2, high: 3 };
    v1 = order[v1] || 0;
    v2 = order[v2] || 0;
  }

  // category ordering
  if (field === "category") {
    const name1 = v1?.name || v1;
    const name2 = v2?.name || v2;

    const count1 = categoryCountMap[name1] || 0;
    const count2 = categoryCountMap[name2] || 0;

    // Sort by count
    if (count1 !== count2) {
      return direction === "asc" ? count1 - count2 : count2 - count1;
    }

    // Tie-break alphabetical
    const str1 = name1?.toLowerCase() || "";
    const str2 = name2?.toLowerCase() || "";

    if (str1 < str2) return direction === "asc" ? -1 : 1;
    if (str1 > str2) return direction === "asc" ? 1 : -1;

    return 0;
  }

  if (v1 < v2) return direction === "asc" ? -1 : 1;
  if (v1 > v2) return direction === "asc" ? 1 : -1;

  return 0;
}
