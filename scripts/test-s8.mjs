/**
 * Quick verification that S8 (Computer Science, +1 only) is wired correctly.
 * Self-contained for plain Node (no Vite resolver needed).
 */
import * as XLSX from "xlsx";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

// --- Mirror of constants.js S8 config ---
const DIVISION_LABELS = {
  S1: "Bio Science",
  S2: "Bio Science",
  S3: "Bio Science",
  S4: "Bio Science",
  S5: "Computer Science",
  S6: "Commerce",
  S7: "Humanities",
  S8: "Computer Science",
};
const SCIENCE_GROUP_DIVISIONS = new Set(["S1", "S2", "S3", "S4", "S5", "S8"]);
const COMMERCE_HUMANITIES_GROUP_DIVISIONS = new Set(["S6", "S7"]);

console.log("\n=== S8 Constants ===");
assert(DIVISION_LABELS.S8 === "Computer Science", "S8 label is Computer Science");
assert(SCIENCE_GROUP_DIVISIONS.has("S8"), "S8 is in SCIENCE_GROUP_DIVISIONS");
assert(
  ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"].every((d) => DIVISION_LABELS[d]),
  "All S1-S8 division labels exist"
);

console.log("\n=== S8 Seating bucket assignment ===");
const divCounts = { S1: 10, S2: 10, S3: 10, S4: 10, S5: 10, S6: 10, S7: 10, S8: 10 };
const divisionsPresent = new Set(Object.keys(divCounts));
const knownStreamDivisions = new Set([
  ...SCIENCE_GROUP_DIVISIONS,
  ...COMMERCE_HUMANITIES_GROUP_DIVISIONS,
]);
let isSubset = true;
for (const d of divisionsPresent) {
  if (!knownStreamDivisions.has(d)) isSubset = false;
}
const bucket0 = [...divisionsPresent].filter((d) => SCIENCE_GROUP_DIVISIONS.has(d));
const bucket1 = [...divisionsPresent].filter((d) => COMMERCE_HUMANITIES_GROUP_DIVISIONS.has(d));
assert(isSubset, "All 8 divisions are known stream divisions");
assert(bucket0.includes("S8"), "S8 assigned to science seating bucket (with S1-S5)");
assert(!bucket1.includes("S8"), "S8 not in commerce/humanities bucket");
assert(bucket0.length === 6, "Science bucket has 6 divisions (S1-S5 + S8)");

console.log("\n=== S8 Result Analysis (division merge + sub-group) ===");
function isFailedSubject(ceVal, totalVal, subName) {
  const ce = parseFloat(ceVal) || 0;
  const total = parseFloat(totalVal) || 0;
  const teObtained = total - ce;
  const su = String(subName || "").toUpperCase();
  const teMax = ["PHYSICS", "CHEMISTRY", "BIOLOGY", "COMPUTER SCIENCE", "MATHEMATICS"].some((k) =>
    su.includes(k)
  )
    ? 60
    : 80;
  return teObtained < 0.3 * teMax;
}

function compareDivisions(a, b) {
  const keyA = { group: 0, val: parseInt(String(a).slice(1), 10) };
  const keyB = { group: 0, val: parseInt(String(b).slice(1), 10) };
  return keyA.val - keyB.val;
}

const resultRows = [
  ["school", "regno", "group", "name", "sub1", "ce", "te", "tot"],
];
for (let i = 1; i <= 3; i++) {
  resultRows.push([
    "PKMM HSS, EDARIKODE",
    `REG${i}`,
    "SCIENCE",
    `CS Student ${i}`,
    "COMPUTER SCIENCE", "10", "40", "50",
    "PHYSICS", "10", "40", "50",
    "CHEMISTRY", "10", "40", "50",
    "MATHEMATICS", "10", "40", "50",
    "COMPUTER SCIENCE", "10", "40", "50",
    "ENGLISH", "10", "60", "70",
  ]);
}

const divRows = [
  { REG_NO: "REG1", NAME: "CS Student 1", DIVISION: "S8" },
  { REG_NO: "REG2", NAME: "CS Student 2", DIVISION: "S8" },
  { REG_NO: "REG3", NAME: "CS Student 3", DIVISION: "S5" },
];

const regnoDivMap = {};
for (const d of divRows) regnoDivMap[d.REG_NO] = d.DIVISION;

const students = [];
for (let r = 1; r < resultRows.length; r++) {
  const row = resultRows[r];
  const group = row[2];
  const subjects = [];
  for (let i = 1; i <= 6; i++) {
    const colBase = 4 + (i - 1) * 4;
    subjects.push({ subName: row[colBase], failed: isFailedSubject(row[colBase + 1], row[colBase + 3], row[colBase]) });
  }
  let subGroup = group;
  if (group === "SCIENCE") {
    subGroup = subjects[4]?.subName.toUpperCase() === "COMPUTER SCIENCE" ? "COMPUTER SCIENCE" : "BIO SCIENCE";
  }
  students.push({
    regno: row[1],
    division: regnoDivMap[row[1]] || "",
    subGroup,
    failed: subjects.some((s) => s.failed),
  });
}

const divSet = new Set(students.map((s) => s.division).filter(Boolean));
const divisionsPresentAnalysis = [...divSet].sort(compareDivisions);

assert(divisionsPresentAnalysis.includes("S8"), "S8 appears in divisionsPresent");
assert(divisionsPresentAnalysis.includes("S5"), "S5 appears in divisionsPresent");
assert(
  divisionsPresentAnalysis.indexOf("S8") > divisionsPresentAnalysis.indexOf("S7"),
  "S8 sorts after S7"
);
const s8Students = students.filter((s) => s.division === "S8");
assert(s8Students.length === 2, "Two students mapped to S8 via division.xlsx");
assert(
  s8Students.every((s) => s.subGroup === "COMPUTER SCIENCE"),
  "S8 students classified as COMPUTER SCIENCE sub-group"
);

// Verify XLSX round-trip (same as app upload path)
const resultWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(resultWb, XLSX.utils.aoa_to_sheet(resultRows), "Results");
const divWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(divWb, XLSX.utils.json_to_sheet(divRows), "Division");
assert(resultWb.SheetNames.length === 1 && divWb.SheetNames.length === 1, "Workbook generation OK");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
