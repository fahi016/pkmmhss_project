/**
 * excelParser.js
 * --------------
 * Excel & CSV file parsing using SheetJS (xlsx package) matching public/python_code/seating_logic.py
 */

import * as XLSX from "xlsx";
import { Student } from "./seatingLogic";

/**
 * Reads an uploaded File object (from <input type="file">) and returns a SheetJS Workbook.
 */
export async function readWorkbookFromFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  return XLSX.read(arrayBuffer, { type: "array" });
}

/**
 * Get sheet names from workbook.
 */
export function getSheetNames(workbook) {
  return workbook ? workbook.SheetNames || [] : [];
}

/**
 * Get headers from a worksheet at a given 1-based header row index.
 */
export function getHeaders(workbook, sheetName, headerRowIndex = 1) {
  if (!workbook || !sheetName || !workbook.Sheets[sheetName]) return [];
  const ws = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");

  const r = headerRowIndex - 1; // 0-based row index
  if (r < range.s.r || r > range.e.r) return [];

  const headers = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellAddress = XLSX.utils.encode_cell({ r, c });
    const cell = ws[cellAddress];
    if (cell && cell.v !== undefined && cell.v !== null) {
      headers.push(String(cell.v).trim());
    }
  }
  return headers;
}

/**
 * Assign roll numbers 1, 2, 3... within each division/class in file order.
 * Reset counter when the key changes.
 */
export function assignRollNumbersByDivision(students, keyFunc = (s) => s.classDivision) {
  const counters = {};
  for (const s of students) {
    const key = keyFunc(s) || s.division || "UNASSIGNED";
    counters[key] = (counters[key] || 0) + 1;
    s.rollNo = String(counters[key]);
  }
}

/**
 * Read students from workbook sheet matching Python's load_students_from_excel.
 */
export function loadStudentsFromWorkbook({
  workbook,
  sheetName,
  colRoll,
  colName,
  colDivision,
  colAdmn,
  colClassDivision = "DIVISION",
  headerRowIndex = 1,
  subjectMapping = null,
}) {
  if (!workbook || !sheetName || !workbook.Sheets[sheetName]) {
    throw new Error(`Sheet '${sheetName}' not found in workbook.`);
  }

  const ws = workbook.Sheets[sheetName];
  const rowsJson = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  const hRow = headerRowIndex - 1;
  if (hRow < 0 || hRow >= rowsJson.length) {
    throw new Error(`Header row ${headerRowIndex} is out of bounds.`);
  }

  const headerCells = rowsJson[hRow] || [];
  const headersMap = {};
  headerCells.forEach((val, idx) => {
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      headersMap[String(val).trim().toLowerCase()] = idx;
    }
  });

  function findColIdx(targetName, required = true) {
    if (!targetName) return -1;
    const key = targetName.trim().toLowerCase();
    if (headersMap[key] === undefined) {
      if (required) {
        throw new Error(
          `Column '${targetName}' not found in sheet '${sheetName}'. ` +
          `Available columns: ${Object.keys(headersMap).join(", ")}`
        );
      }
      return -1;
    }
    return headersMap[key];
  }

  const cName = findColIdx(colName, true);
  const cDiv = findColIdx(colDivision, true);
  const cAdmn = colAdmn ? findColIdx(colAdmn, false) : -1;
  const cClassDiv = colClassDivision ? findColIdx(colClassDivision, false) : -1;

  const students = [];

  for (let r = hRow + 1; r < rowsJson.length; r++) {
    const row = rowsJson[r];
    if (!row || row.length === 0) continue;

    const nameVal = cName >= 0 ? row[cName] : "";
    if (nameVal === undefined || nameVal === null || String(nameVal).trim() === "") {
      continue;
    }

    const divVal = cDiv >= 0 ? row[cDiv] : "";
    const admnVal = cAdmn >= 0 ? row[cAdmn] : "";
    const classDivVal = cClassDiv >= 0 ? row[cClassDiv] : divVal;

    let seatingDivision = divVal !== undefined && divVal !== null ? String(divVal).trim() : "UNASSIGNED";
    let classDivision = classDivVal !== undefined && classDivVal !== null ? String(classDivVal).trim() : seatingDivision;

    let subj = "";
    if (subjectMapping !== null) {
      const mapped = subjectMapping[classDivision] || "";
      if (!mapped || mapped.trim().toUpperCase() === "NO EXAM") {
        continue;
      }
      subj = mapped.trim();
      seatingDivision = subj;
    }

    students.push(
      new Student({
        rollNo: "",
        name: String(nameVal).trim(),
        division: seatingDivision,
        classDivision: classDivision,
        admn: admnVal !== undefined && admnVal !== null ? String(admnVal).trim() : "",
        subject: subj,
      })
    );
  }

  const rollKeyFunc = cClassDiv >= 0 ? (s) => s.classDivision : (s) => s.division;
  assignRollNumbersByDivision(students, rollKeyFunc);

  return students;
}
