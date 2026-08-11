/**
 * plusTwoResultAnalysisLogic.js
 * -----------------------------
 * Core calculation logic converted 1:1 from
 * public/plus_two_result_analalysis/result3.py
 */

import * as XLSX from "xlsx";

export const PLUS_TWO_GROUPS = [
  "BIO SCIENCE",
  "COMPUTER SCIENCE",
  "HUMANITIES",
  "COMMERCE",
];

export const PLUS_TWO_MAX_MARK = 1200;

const FAIL_GRADES = new Set(["D", "E", "F"]);

const SUBJECT_SHORT_CODES = {
  ENGLISH: "ENG",
  MALAYALAM: "MAL",
  ARABIC: "ARB",
  HINDI: "HIN",
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
  "ACCOUNTANCY WITH COMPUTER ACCOUNTING": "ACC",
};

function normalizeCell(value) {
  return String(value ?? "").trim();
}

function digitStringToNumber(value) {
  const text = normalizeCell(value);
  return /^\d+$/.test(text) ? parseInt(text, 10) : 0;
}

export function toTitleCase(str) {
  return String(str ?? "")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function shortenGroup(group) {
  return group === "COMPUTER SCIENCE" ? "COMP SCIENCE" : group;
}

export function shortenFailedSubject(subject) {
  const upperSubject = normalizeCell(subject).toUpperCase();
  if (upperSubject.includes("BUSINESS STUDIES")) {
    return "BUSINESS STUDIES";
  }
  return normalizeCell(subject);
}

export function subjectCodeAbbr(subject) {
  const upperSubject = normalizeCell(subject).toUpperCase();
  for (const [key, abbr] of Object.entries(SUBJECT_SHORT_CODES)) {
    if (upperSubject.includes(key)) {
      return abbr;
    }
  }
  return upperSubject.slice(0, 4);
}

export function calculateMaxMarkPercentage(totalMarks) {
  return Number(((Number(totalMarks || 0) / PLUS_TWO_MAX_MARK) * 100).toFixed(2));
}

export function sortByTotalMarksDesc(students) {
  return [...students].sort((a, b) => b.totalMarks - a.totalMarks);
}

export function getTop10Students(students, groupName) {
  return sortByTotalMarksDesc(
    students.filter((student) => student.subGroup === groupName)
  ).slice(0, 10);
}

export function getAPlusStudents(students, groupName, aPlusCount) {
  return sortByTotalMarksDesc(
    students.filter(
      (student) => student.subGroup === groupName && student.aPlusCount === aPlusCount
    )
  );
}

export function buildSubjectHeaders(students) {
  const sampleStudent = students[0];
  if (!sampleStudent) {
    return [];
  }

  return sampleStudent.subjects.map((subject, index) =>
    index === 1 ? "SL" : subjectCodeAbbr(subject.subName)
  );
}

function mapSubjectsFromRow(row) {
  const subjects = [];

  for (let index = 1; index <= 6; index += 1) {
    const colBase = 3 + (index - 1) * 5;
    subjects.push({
      index,
      subName: normalizeCell(row[colBase]),
      totalRaw: normalizeCell(row[colBase + 1]),
      total: digitStringToNumber(row[colBase + 1]),
      grace: normalizeCell(row[colBase + 2]),
      written: normalizeCell(row[colBase + 3]),
      grade: normalizeCell(row[colBase + 4]),
    });
  }

  return subjects;
}

export function processPlusTwoResultAnalysis(resultWorkbook) {
  const firstSheetName = resultWorkbook.SheetNames[0];
  const worksheet = resultWorkbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  if (rawRows.length === 0) {
    throw new Error("Result sheet contains no usable rows.");
  }

  const students = [];

  for (const rawRow of rawRows) {
    const row = Array.from({ length: 34 }, (_, index) => normalizeCell(rawRow[index]));

    if (row.every((cell) => cell === "")) {
      continue;
    }

    const regno = row[0];
    const group = row[1];
    const name = row[2];
    const subjects = mapSubjectsFromRow(row);
    const ehsNhs = row[33];

    const subGroup =
      group === "SCIENCE"
        ? subjects[4]?.subName === "COMPUTER SCIENCE"
          ? "COMPUTER SCIENCE"
          : "BIO SCIENCE"
        : group;

    const failed = subjects.some((subject) => FAIL_GRADES.has(subject.grade));
    const aPlusCount = subjects.filter((subject) => subject.grade === "A+").length;
    const totalMarks = subjects.reduce((sum, subject) => sum + subject.total, 0);

    students.push({
      regno,
      group,
      subGroup,
      name,
      titleName: toTitleCase(name),
      ehsNhs,
      subjects,
      failed,
      aPlusCount,
      totalMarks,
    });
  }

  if (students.length === 0) {
    throw new Error("No student records could be parsed from the CSV file.");
  }

  const totalStudents = students.length;
  const ehsCount = students.filter((student) => student.ehsNhs === "EHS").length;
  const nhsCount = students.filter((student) => student.ehsNhs === "NHS").length;
  const passPct =
    totalStudents > 0 ? Number(((ehsCount / totalStudents) * 100).toFixed(2)) : 0;
  const fullAPlusCount = students.filter((student) => student.aPlusCount === 6).length;
  const fiveAPlusCount = students.filter((student) => student.aPlusCount === 5).length;
  const fourAPlusCount = students.filter((student) => student.aPlusCount === 4).length;

  const groupwiseStats = PLUS_TWO_GROUPS.map((groupName) => {
    const groupStudents = students.filter((student) => student.subGroup === groupName);
    const attended = groupStudents.length;
    const ehs = groupStudents.filter((student) => student.ehsNhs === "EHS").length;
    const nhs = groupStudents.filter((student) => student.ehsNhs === "NHS").length;
    const full_ap = groupStudents.filter((student) => student.aPlusCount === 6).length;
    const five_ap = groupStudents.filter((student) => student.aPlusCount === 5).length;
    const pct = attended > 0 ? Number(((ehs / attended) * 100).toFixed(2)) : 0;

    return {
      group: groupName,
      shortGroup: shortenGroup(groupName),
      attended,
      ehs,
      nhs,
      full_ap,
      five_ap,
      pct,
    };
  });

  const failedStudentsList = students
    .filter((student) => student.failed)
    .map((student) => ({
      regno: student.regno,
      name: student.name,
      group: shortenGroup(student.subGroup),
      failedSubjects: student.subjects
        .filter((subject) => FAIL_GRADES.has(subject.grade))
        .map((subject) => shortenFailedSubject(subject.subName))
        .join(", "),
    }));

  return {
    schoolName: "PKMMHSS EDARIKODE",
    schoolShort: "PKMMHSS",
    examYear: "2026",
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
  };
}
