/**
 * resultAnalysisLogic.js
 * ----------------------
 * Core calculation logic for +1 Result Analysis converted 1:1 from
 * public/plus_one_result_analysis/result_analysis.py
 */

import * as XLSX from "xlsx";
import { compareDivisions } from "./constants";

const TE60_SUBS = new Set([
  "PHYSICS",
  "CHEMISTRY",
  "BIOLOGY",
  "COMPUTER SCIENCE",
  "MATHEMATICS",
  "COMPUTER APPLICATION",
  "ACCOUNTANCY",
]);

export function getTeMax(subName) {
  const su = String(subName || "").toUpperCase().trim();
  for (const key of TE60_SUBS) {
    if (su.includes(key)) return 60;
  }
  return 80;
}

export function getTotalMax(subName) {
  const su = String(subName || "").toUpperCase().trim();
  for (const key of TE60_SUBS) {
    if (su.includes(key)) return 80;
  }
  return 100;
}

export function pctToGrade(pct) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C+";
  if (pct >= 40) return "C";
  if (pct >= 30) return "D+";
  if (pct >= 20) return "D";
  return "E";
}

export function calculateTotalGrade(totalVal, subName) {
  try {
    const t = parseFloat(totalVal) || 0;
    const mx = getTotalMax(subName);
    return pctToGrade((t / mx) * 100);
  } catch (e) {
    return "E";
  }
}

/**
 * Fail if (total - CE) < 30% of TE_max. Handles grace marks correctly.
 */
export function isFailedSubject(ceVal, totalVal, subName) {
  try {
    const ce = parseFloat(ceVal) || 0;
    const total = parseFloat(totalVal) || 0;
    const teObtained = total - ce; // effective TE (may include grace)
    const teMaxVal = getTeMax(subName);
    return teObtained < 0.30 * teMaxVal;
  } catch (e) {
    return true; // treat missing/invalid as fail
  }
}

export function normalizeName(n) {
  let str = String(n || "").toUpperCase();
  str = str.replace(/[.,]/g, " ");
  str = str.replace(/\s+/g, " ").trim();
  return str;
}

export function toTitleCase(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function shortenGroup(g) {
  return g === "COMPUTER SCIENCE" ? "COMP SCIENCE" : g;
}

export function shortenSubject(s) {
  const su = String(s || "").toUpperCase().trim();
  if (su.includes("BUSINESS STUDIES")) return "BUSINESS STUDIES";
  if (su.includes("ACCOUNTANCY")) return "ACCOUNTANCY";
  if (su.includes("COMPUTER APPLICATION")) return "COMPUTER APPLICATION";
  return s;
}

export const SUBJECT_SHORT_CODES = {
  ENGLISH: "ENG",
  MALAYALAM: "MAL",
  ARABIC: "ARB",
  HINDI: "HIN",
  URUDU: "URD",
  PHYSICS: "PHY",
  CHEMISTRY: "CHE",
  BIOLOGY: "BIO",
  MATHEMATICS: "MAT",
  "COMPUTER SCIENCE": "CS",
  HISTORY: "HIS",
  ECONOMICS: "ECO",
  "POLITICAL SCIENCE": "POL",
  SOCIOLOGY: "SOC",
  "COMPUTER APPLICATION": "CA",
  ACCOUNTANCY: "ACC",
  "BUSINESS STUDIES": "BST",
  "ISLAMIC HISTORY": "ISH",
};

export function subjectCodeAbbr(s) {
  const su = String(s || "").toUpperCase().trim();
  for (const [key, abbr] of Object.entries(SUBJECT_SHORT_CODES)) {
    if (su.includes(key)) return abbr;
  }
  return su.slice(0, 4);
}

/**
 * Rank sort: passed students first (by TotalMarks desc), then failed students (by TotalMarks desc).
 */
export function rankSort(students) {
  return [...students].sort((a, b) => {
    if (a.failed !== b.failed) {
      return a.failed ? 1 : -1; // Passed (failed=false) first
    }
    return b.totalMarks - a.totalMarks; // TotalMarks descending
  });
}

/**
 * Distinct subjects for a stream (SCIENCE, COMMERCE, HUMANITIES)
 */
export function subjectsForStream(students, streamName) {
  const streamStudents = students.filter((s) => s.group === streamName);
  const seen = new Set();
  const ordered = [];

  for (let i = 0; i < 6; i++) {
    const colSubs = new Set();
    for (const s of streamStudents) {
      if (s.subjects[i] && s.subjects[i].subName) {
        colSubs.add(s.subjects[i].subName);
      }
    }
    const sortedCol = Array.from(colSubs).sort();
    for (const sub of sortedCol) {
      if (!seen.has(sub)) {
        seen.add(sub);
        ordered.push(sub);
      }
    }
  }

  return ordered;
}

/**
 * Subject-based ranklist for a subject within a stream
 */
export function getSubjectRanklist(students, streamName, subjectName) {
  const streamStudents = students.filter((s) => s.group === streamName);
  const records = [];

  for (const s of streamStudents) {
    const subMatch = s.subjects.find(
      (sub) => sub.subName.toUpperCase().trim() === subjectName.toUpperCase().trim()
    );
    if (!subMatch) continue;

    records.push({
      regno: s.regno,
      name: toTitleCase(s.name),
      rawName: s.name,
      division: s.division || "-",
      ce: subMatch.ce,
      te: subMatch.te,
      total: subMatch.total,
      grade: subMatch.grade,
      failed: subMatch.failed,
    });
  }

  records.sort((a, b) => {
    if (a.failed !== b.failed) return a.failed ? 1 : -1;
    return b.total - a.total;
  });

  return records;
}

/**
 * Subject-wise A+ Achievers summary across all streams
 */
export function getSubjectAplusSummary(students) {
  const streams = ["SCIENCE", "COMMERCE", "HUMANITIES"];
  const rows = [];

  for (const stream of streams) {
    const subjects = subjectsForStream(students, stream);
    for (const sub of subjects) {
      const records = getSubjectRanklist(students, stream, sub);
      const appeared = records.length;
      const aplus = records.filter((r) => r.grade === "A+").length;
      const pct = appeared > 0 ? parseFloat(((aplus / appeared) * 100).toFixed(2)) : 0;

      rows.push({
        stream: toTitleCase(stream),
        rawStream: stream,
        subject: shortenSubject(sub),
        fullSubject: sub,
        appeared,
        aplus,
        pct,
      });
    }
  }

  return rows;
}

/**
 * Main Analysis Engine: Processes raw result file + optional division file
 */
export function processResultAnalysis(resultWorkbook, divisionWorkbook = null) {
  // Parse result worksheet
  const firstSheetName = resultWorkbook.SheetNames[0];
  const ws = resultWorkbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  if (rawRows.length < 2) {
    throw new Error("Result sheet contains insufficient data rows.");
  }

  // Determine if row 0 is header or data
  const startIdx = String(rawRows[0][0]).toLowerCase().includes("school") ? 1 : 0;

  // Process division lookup if provided
  const regnoDivMap = {};
  const nameDivMap = {};

  if (divisionWorkbook) {
    const divSheetName = divisionWorkbook.SheetNames[0];
    const divWs = divisionWorkbook.Sheets[divSheetName];
    const divRows = XLSX.utils.sheet_to_json(divWs, { defval: "" });

    for (const dRow of divRows) {
      const keys = Object.keys(dRow);
      const regKey = keys.find((k) => k.toUpperCase().includes("REG"));
      const nameKey = keys.find((k) => k.toUpperCase() === "NAME");
      const divKey = keys.find((k) => k.toUpperCase().includes("DIVISION"));

      const divVal = divKey ? String(dRow[divKey]).trim() : "";
      if (divVal) {
        if (regKey && dRow[regKey]) {
          const regClean = String(dRow[regKey]).trim();
          regnoDivMap[regClean] = divVal;
        }
        if (nameKey && dRow[nameKey]) {
          const nameNorm = normalizeName(dRow[nameKey]);
          nameDivMap[nameNorm] = divVal;
        }
      }
    }
  }

  // Parse Student Records
  const students = [];
  let schoolRaw = "";

  for (let r = startIdx; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length < 4) continue;

    const school = String(row[0] || "").trim();
    const regno = String(row[1] || "").trim();
    const group = String(row[2] || "").trim().toUpperCase();
    const name = String(row[3] || "").trim();

    if (!regno && !name) continue;
    if (!schoolRaw && school) schoolRaw = school;

    // Lookup division
    let division = "";
    if (regno && regnoDivMap[regno]) {
      division = regnoDivMap[regno];
    } else {
      const normN = normalizeName(name);
      if (nameDivMap[normN]) {
        division = nameDivMap[normN];
      }
    }

    // Process 6 subjects
    const subjects = [];
    let failedAny = false;
    let aPlusCount = 0;
    let totalMarksSum = 0;

    for (let i = 1; i <= 6; i++) {
      const colBase = 4 + (i - 1) * 4;
      const subName = String(row[colBase] || "").trim();
      const ce = String(row[colBase + 1] || "0").trim();
      const te = String(row[colBase + 2] || "0").trim();
      const totalStr = String(row[colBase + 3] || "0").trim();

      const totalVal = parseFloat(totalStr) || 0;
      totalMarksSum += totalVal;

      const failed = isFailedSubject(ce, totalStr, subName);
      if (failed) failedAny = true;

      const grade = calculateTotalGrade(totalStr, subName);
      if (grade === "A+") aPlusCount++;

      subjects.push({
        index: i,
        subName,
        ce,
        te,
        total: totalVal,
        grade,
        failed,
      });
    }

    // SubGroup classification
    let subGroup = group;
    if (group === "SCIENCE") {
      subGroup = subjects[4]?.subName.toUpperCase() === "COMPUTER SCIENCE" ? "COMPUTER SCIENCE" : "BIO SCIENCE";
    }

    students.push({
      school,
      regno,
      group,
      subGroup,
      name,
      titleName: toTitleCase(name),
      division,
      subjects,
      failed: failedAny,
      aPlusCount,
      totalMarks: totalMarksSum,
    });
  }

  if (students.length === 0) {
    throw new Error("No student records could be parsed from the file.");
  }

  // Derive school name and exam year
  const schoolParts = schoolRaw.split(",").map((p) => p.trim());
  const schoolName = schoolParts.length >= 2 ? `${schoolParts[0]}, ${schoolParts[1]}` : schoolRaw || "PKMM HSS EDARIKODE";
  const schoolShort = schoolParts[0] || "PKMM HSS";

  // Summary Metrics
  const totalStudents = students.length;
  const ehsCount = students.filter((s) => !s.failed).length;
  const nhsCount = students.filter((s) => s.failed).length;
  const passPct = totalStudents > 0 ? parseFloat(((ehsCount / totalStudents) * 100).toFixed(2)) : 0;

  const fullAPlusCount = students.filter((s) => s.aPlusCount === 6).length;
  const fiveAPlusCount = students.filter((s) => s.aPlusCount === 5).length;
  const fourAPlusCount = students.filter((s) => s.aPlusCount === 4).length;

  // Groupwise Statistics
  const groupsList = ["BIO SCIENCE", "COMPUTER SCIENCE", "HUMANITIES", "COMMERCE"];
  const groupwiseStats = groupsList.map((g) => {
    const sList = students.filter((s) => s.subGroup === g);
    const attended = sList.length;
    const ehs = sList.filter((s) => !s.failed).length;
    const nhs = sList.filter((s) => s.failed).length;
    const fa = sList.filter((s) => s.aPlusCount === 6).length;
    const f5 = sList.filter((s) => s.aPlusCount === 5).length;
    const f4 = sList.filter((s) => s.aPlusCount === 4).length;
    const pct = attended > 0 ? parseFloat(((ehs / attended) * 100).toFixed(2)) : 0;

    return {
      group: g,
      shortGroup: shortenGroup(g),
      attended,
      ehs,
      nhs,
      full_ap: fa,
      five_ap: f5,
      four_ap: f4,
      pct,
    };
  });

  // Failed students list
  const failedStudentsList = students
    .filter((s) => s.failed)
    .map((s) => {
      const failedSubs = s.subjects
        .filter((sub) => sub.failed)
        .map((sub) => shortenSubject(sub.subName))
        .join(", ");

      return {
        regno: s.regno,
        name: toTitleCase(s.name),
        division: s.division || "-",
        group: shortenGroup(s.subGroup),
        failedSubjects: failedSubs,
      };
    });

  // Divisions present sorted naturally
  const divSet = new Set(students.map((s) => s.division).filter(Boolean));
  const divisionsPresent = Array.from(divSet).sort(compareDivisions);

  return {
    schoolName,
    schoolShort,
    students,
    totalStudents,
    ehsCount,
    nhsCount,
    passPct,
    fullAPlusCount,
    fiveAPlusCount,
    fourAPlusCount,
    groupwiseStats,
    failedStudentsList,
    divisionsPresent,
  };
}
