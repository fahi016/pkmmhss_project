/**
 * constants.js
 * ------------
 * Fixed division/stream mappings, labels, and formatting helper functions
 * matching public/python_code/seating_logic.py
 */

export const DIVISION_LABELS = {
  S1: "Bio Science",
  S2: "Bio Science",
  S3: "Bio Science",
  S4: "Bio Science",
  S5: "Computer Science",
  S6: "Commerce",
  S7: "Humanities",
  S8: "Computer Science", // +1 only — second CS section (from 2026)
};

export const SECOND_LANGUAGE_LABELS = {
  A: "Arabic",
  H: "Hindi",
  M: "Malayalam",
  U: "Urdu",
};

export const DIVISION_CODES = new Set(Object.keys(DIVISION_LABELS));
export const SECOND_LANGUAGE_CODES = new Set(Object.keys(SECOND_LANGUAGE_LABELS));

export const SCIENCE_GROUP_DIVISIONS = new Set(["S1", "S2", "S3", "S4", "S5", "S8"]);
export const COMMERCE_HUMANITIES_GROUP_DIVISIONS = new Set(["S6", "S7"]);

/**
 * Human-readable label for a seating group code (division or language).
 */
export function groupDisplayLabel(code) {
  if (!code) return "";
  const strCode = String(code).trim();
  if (DIVISION_LABELS[strCode]) {
    return DIVISION_LABELS[strCode];
  }
  if (SECOND_LANGUAGE_LABELS[strCode]) {
    return SECOND_LANGUAGE_LABELS[strCode];
  }
  return strCode;
}

/**
 * Label for seating sheets and preview.
 * Custom date-wise exam: 'Physics (S1)' — subject + division.
 * Second Language exam: 'Arabic (S1)' — language name + class division.
 * Regular Subjects: 'Bio Science (S1)' — stream name + division code.
 */
export function formatStudentDivision(student) {
  if (!student) return "";
  const classDiv = student.classDivision || student.division || "";
  
  if (student.subject) {
    if (classDiv && classDiv !== student.subject) {
      return `${student.subject} (${classDiv})`;
    }
    return student.subject;
  }
  
  if (SECOND_LANGUAGE_LABELS[student.division]) {
    return `${SECOND_LANGUAGE_LABELS[student.division]} (${classDiv})`;
  }
  
  if (DIVISION_LABELS[classDiv]) {
    return `${DIVISION_LABELS[classDiv]} (${classDiv})`;
  }
  
  return classDiv;
}

/**
 * Sort roll numbers numerically when possible.
 */
export function rollSortKey(rollNo) {
  if (rollNo === null || rollNo === undefined) return 0;
  const str = String(rollNo).trim();
  const num = parseInt(str, 10);
  return isNaN(num) ? str : num;
}

/**
 * Sort S1, S2, ... S10 numerically; other codes alphabetically.
 */
export function divisionSortKey(code) {
  const c = String(code || "").trim().toUpperCase();
  if (c.length >= 2 && c[0] === 'S') {
    const numPart = parseInt(c.slice(1), 10);
    if (!isNaN(numPart)) {
      return { group: 0, val: numPart };
    }
  }
  return { group: 1, val: c };
}

/**
 * Compare function using divisionSortKey
 */
export function compareDivisions(a, b) {
  const keyA = divisionSortKey(a);
  const keyB = divisionSortKey(b);
  if (keyA.group !== keyB.group) {
    return keyA.group - keyB.group;
  }
  if (typeof keyA.val === 'number' && typeof keyB.val === 'number') {
    return keyA.val - keyB.val;
  }
  return String(keyA.val).localeCompare(String(keyB.val));
}

/**
 * Parse 'S1, S2, S3' into ['S1', 'S2', 'S3'] sorted ascending.
 */
export function parseDivisionList(text) {
  if (!text) return [];
  const normalized = text.replace(/;/g, ",");
  const codes = normalized
    .split(",")
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
  
  const unique = Array.from(new Set(codes));
  return unique.sort(compareDivisions);
}

/**
 * Human friendly label for a column position (1-based index).
 */
export function seatLabel(column, seatsPerBench) {
  if (seatsPerBench === 1) {
    return "Only";
  }
  if (seatsPerBench === 2) {
    return column === 1 ? "Left" : "Right";
  }
  if (seatsPerBench === 3) {
    const map = { 1: "Left", 2: "Middle", 3: "Right" };
    return map[column] || `Seat ${column}`;
  }
  return `Seat ${column}`;
}
