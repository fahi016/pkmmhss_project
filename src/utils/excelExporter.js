/**
 * excelExporter.js
 * ----------------
 * Generates and downloads styled Excel workbooks using ExcelJS
 * matching 100% of the styling from public/python_code/seating_logic.py
 */

import ExcelJS from "exceljs";
import {
  DIVISION_LABELS,
  SECOND_LANGUAGE_LABELS,
  SCIENCE_GROUP_DIVISIONS,
  COMMERCE_HUMANITIES_GROUP_DIVISIONS,
  groupDisplayLabel,
  formatStudentDivision,
  rollSortKey,
  compareDivisions,
  seatLabel,
} from "./constants";

// --------------------------------------------------------------------------- //
// Style Definitions matching python openpyxl constants
// --------------------------------------------------------------------------- //

const TITLE_FONT = { name: "Segoe UI", size: 13, bold: true };
const SUBTITLE_FONT = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF555555" } };
const HEADER_FONT = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
const REGULAR_FONT = { name: "Segoe UI", size: 10 };
const BOLD_FONT = { name: "Segoe UI", size: 10, bold: true };

const HEADER_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF2C3E50" }, // Dark navy #2C3E50
};

const DIVISION_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE8EEF3" }, // Soft blue-gray #E8EEF3
};

const THIN_SIDE = { style: "thin", color: { argb: "FFAAAAAA" } };
const BORDER = {
  top: THIN_SIDE,
  left: THIN_SIDE,
  bottom: THIN_SIDE,
  right: THIN_SIDE,
};

const CENTER_ALIGNMENT = {
  horizontal: "center",
  vertical: "middle",
  wrapText: true,
};

/**
 * Triggers client-side browser download of an ExcelJS workbook buffer.
 */
export async function downloadWorkbook(wb, fileName) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Apply styling to header row
 */
function styleHeaderRow(ws, rowIdx, numCols) {
  const row = ws.getRow(rowIdx);
  for (let c = 1; c <= numCols; c++) {
    const cell = row.getCell(c);
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = CENTER_ALIGNMENT;
    cell.border = BORDER;
  }
}

/**
 * 1. Export Seating Arrangement Workbook
 */
export async function exportSeatingArrangement(
  result,
  rooms,
  fileName = "Seating_Arrangement.xlsx",
  examDate = ""
) {
  const wb = new ExcelJS.Workbook();
  const byRoom = result.byRoom();

  const allDivsSet = new Set();
  for (const a of result.assignments) {
    if (a.student) allDivsSet.add(a.student.division);
  }
  const allDivs = Array.from(allDivsSet).sort(compareDivisions);

  const knownStreamDivisions = new Set([
    ...SCIENCE_GROUP_DIVISIONS,
    ...COMMERCE_HUMANITIES_GROUP_DIVISIONS,
  ]);
  const fixedScheme = allDivs.length > 0 && allDivs.every((d) => knownStreamDivisions.has(d));

  const scienceSide = allDivs.filter((d) => SCIENCE_GROUP_DIVISIONS.has(d));
  const commerceSide = allDivs.filter((d) => COMMERCE_HUMANITIES_GROUP_DIVISIONS.has(d));

  function divRange(divs) {
    if (!divs || divs.length === 0) return "";
    return divs.length > 1 ? `${divs[0]} to ${divs[divs.length - 1]}` : divs[0];
  }

  function streamLabels(divs) {
    const seen = [];
    for (const d of divs) {
      const lbl = DIVISION_LABELS[d] || d;
      if (!seen.includes(lbl)) seen.push(lbl);
    }
    return seen.join(" / ");
  }

  // --- Summary Sheet (at index 0) ---
  const summaryWs = wb.addWorksheet("Summary");

  // Title
  summaryWs.getCell("A1").value = "Exam Seating Arrangement - Summary";
  summaryWs.getCell("A1").font = TITLE_FONT;

  // Header row at row 3
  summaryWs.getCell("A3").value = "Room No";
  summaryWs.getCell("B3").value = "Total Students";
  summaryWs.getCell("C3").value = "Divisions Present";
  summaryWs.getCell("D3").value = "Details";
  styleHeaderRow(summaryWs, 3, 4);

  let r = 4;
  let grandTotal = 0;
  for (const room of rooms) {
    const seats = byRoom[room.name] || [];
    const counts = {};
    for (const a of seats) {
      if (a.student) {
        counts[a.student.division] = (counts[a.student.division] || 0) + 1;
      }
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    grandTotal += total;

    const divsPresent = Object.keys(counts).sort(compareDivisions).join(", ");
    const details = Object.entries(counts)
      .sort((a, b) => compareDivisions(a[0], b[0]))
      .map(([d, c]) => `${d}:${c}`)
      .join(", ");

    const row = summaryWs.getRow(r);
    row.getCell(1).value = room.name;
    row.getCell(2).value = total;
    row.getCell(3).value = divsPresent;
    row.getCell(4).value = details;

    for (let c = 1; c <= 4; c++) {
      const cell = row.getCell(c);
      cell.font = REGULAR_FONT;
      cell.border = BORDER;
      cell.alignment = CENTER_ALIGNMENT;
    }
    r++;
  }

  // Total row
  const totalRow = summaryWs.getRow(r);
  totalRow.getCell(1).value = "TOTAL";
  totalRow.getCell(1).font = BOLD_FONT;
  totalRow.getCell(1).alignment = CENTER_ALIGNMENT;
  totalRow.getCell(1).border = BORDER;

  totalRow.getCell(2).value = grandTotal;
  totalRow.getCell(2).font = BOLD_FONT;
  totalRow.getCell(2).alignment = CENTER_ALIGNMENT;
  totalRow.getCell(2).border = BORDER;

  for (let c = 3; c <= 4; c++) {
    const cell = totalRow.getCell(c);
    cell.border = BORDER;
  }

  summaryWs.getColumn(1).width = 12;
  summaryWs.getColumn(2).width = 16;
  summaryWs.getColumn(3).width = 24;
  summaryWs.getColumn(4).width = 40;

  // --- Room Sheets ---
  for (const room of rooms) {
    const sheetName = room.name.slice(0, 31);
    const ws = wb.addWorksheet(sheetName);

    const numCols = room.seatsPerBench + 1;

    // Header Title (Row 1)
    let headerTitle = `EXAM SEATING ARRANGEMENT - ${room.name.toUpperCase()}`;
    if (examDate) {
      headerTitle = `EXAM SEATING ARRANGEMENT (${examDate}) - ${room.name.toUpperCase()}`;
    }
    ws.mergeCells(1, 1, 1, numCols);
    const cellA1 = ws.getCell("A1");
    cellA1.value = headerTitle;
    cellA1.font = TITLE_FONT;

    // Subtitle (Row 2)
    let subtitle = "";
    if (fixedScheme && room.seatsPerBench >= 2) {
      const { b0, b1 } = room.bucketColumns();
      const b0Label = b0
        .map(
          (c) =>
            `${seatLabel(c, room.seatsPerBench)}(${
              seatLabel(c, room.seatsPerBench)[0]
            })`
        )
        .join(" & ");
      const b1Label = b1
        .map(
          (c) =>
            `${seatLabel(c, room.seatsPerBench)}(${
              seatLabel(c, room.seatsPerBench)[0]
            })`
        )
        .join(" & ");
      subtitle =
        `Seating: ${b0Label} - ${divRange(scienceSide)} (${streamLabels(
          scienceSide
        )}) | ` +
        `${b1Label} - ${commerceSide.join(" & ")} (${streamLabels(
          commerceSide
        )})`;
    } else {
      const colsDesc = Array.from({ length: room.seatsPerBench }, (_, i) =>
        seatLabel(i + 1, room.seatsPerBench)
      ).join(", ");
      subtitle = `Seats per bench: ${colsDesc}`;
    }

    ws.mergeCells(2, 1, 2, numCols);
    const cellA2 = ws.getCell("A2");
    cellA2.value = subtitle;
    cellA2.font = SUBTITLE_FONT;

    // Header row at row 4
    const headerRowIdx = 4;
    const hRow = ws.getRow(headerRowIdx);
    hRow.getCell(1).value = "Bench No";
    for (let c = 1; c <= room.seatsPerBench; c++) {
      hRow.getCell(c + 1).value = `${seatLabel(c, room.seatsPerBench)} Seat`;
    }
    styleHeaderRow(ws, headerRowIdx, numCols);

    // Bench Data Rows
    const seats = byRoom[room.name] || [];
    const byBench = {};
    for (const a of seats) {
      if (!byBench[a.benchNo]) byBench[a.benchNo] = {};
      byBench[a.benchNo][a.column] = a;
    }

    let rIdx = headerRowIdx + 1;
    for (let benchNo = 1; benchNo <= room.numBenches; benchNo++) {
      const row = ws.getRow(rIdx);
      row.height = 42; // Set row height to 42 matching openpyxl

      const cellBench = row.getCell(1);
      cellBench.value = benchNo;
      cellBench.font = REGULAR_FONT;
      cellBench.alignment = CENTER_ALIGNMENT;
      cellBench.border = BORDER;

      for (let c = 1; c <= room.seatsPerBench; c++) {
        const a = byBench[benchNo]?.[c];
        const cell = row.getCell(c + 1);
        if (a && a.student) {
          const div = formatStudentDivision(a.student);
          cell.value = `${a.student.name}\n(${a.student.rollNo}) ${div}`;
        } else {
          cell.value = "";
        }
        cell.font = REGULAR_FONT;
        cell.alignment = CENTER_ALIGNMENT;
        cell.border = BORDER;
      }
      rIdx++;
    }

    // Set Column Widths
    ws.getColumn(1).width = 10;
    for (let c = 2; c <= numCols; c++) {
      ws.getColumn(c).width = 26;
    }
  }

  await downloadWorkbook(wb, fileName);
}

/**
 * Helper to write a styled notice sheet
 */
function writeNoticeSheet(wb, sheetName, title, assignments, sortKey = null, examDate = "") {
  const safeName = (sheetName || "UNASSIGNED").slice(0, 31);
  const ws = wb.addWorksheet(safeName);

  // Title (Row 1)
  ws.mergeCells(1, 1, 1, 6);
  const cellA1 = ws.getCell("A1");
  cellA1.value = title;
  cellA1.font = TITLE_FONT;

  // Subtitle (Row 2)
  let subTitle = "Please check your Room Number, Bench Number and Seat below";
  if (examDate) {
    subTitle = `Date: ${examDate}    |    ${subTitle}`;
  }
  ws.mergeCells(2, 1, 2, 6);
  const cellA2 = ws.getCell("A2");
  cellA2.value = subTitle;
  cellA2.font = SUBTITLE_FONT;

  // Table Headers (Row 4)
  const headers = ["Sl No", "Roll No", "Student Name", "Room No", "Bench No", "Seat"];
  const hRow = ws.getRow(4);
  headers.forEach((h, idx) => {
    hRow.getCell(idx + 1).value = h;
  });
  styleHeaderRow(ws, 4, 6);

  const keyFn = sortKey || ((a) => rollSortKey(a.student.rollNo));
  const rows = [...assignments].sort((a, b) => {
    const keyA = keyFn(a);
    const keyB = keyFn(b);
    if (Array.isArray(keyA) && Array.isArray(keyB)) {
      for (let i = 0; i < keyA.length; i++) {
        if (keyA[i] !== keyB[i]) {
          if (typeof keyA[i] === "number" && typeof keyB[i] === "number") return keyA[i] - keyB[i];
          return String(keyA[i]).localeCompare(String(keyB[i]));
        }
      }
      return 0;
    }
    if (typeof keyA === "number" && typeof keyB === "number") return keyA - keyB;
    return String(keyA).localeCompare(String(keyB));
  });

  let rIdx = 5;
  rows.forEach((a, idx) => {
    const row = ws.getRow(rIdx);
    row.height = 22; // Row height 22 matching openpyxl

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = a.student.rollNo;
    row.getCell(3).value = a.student.name;
    row.getCell(4).value = a.room;
    row.getCell(5).value = a.benchNo;
    row.getCell(6).value = a._label || seatLabel(a.column, 3);

    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c);
      cell.font = REGULAR_FONT;
      cell.alignment = CENTER_ALIGNMENT;
      cell.border = BORDER;
    }
    rIdx++;
  });

  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 32;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 10;
  ws.getColumn(6).width = 10;
}

function noticeTitleForGroup(code, label) {
  if (SECOND_LANGUAGE_LABELS[code]) {
    return `EXAM SEATING ARRANGEMENT NOTICE - SECOND LANGUAGE: ${label} (${code})`;
  }
  if (DIVISION_LABELS[code]) {
    return `EXAM SEATING ARRANGEMENT NOTICE - DIVISION ${code} (${label})`;
  }
  return `EXAM SEATING ARRANGEMENT NOTICE - ${code}` + (label && label !== code ? ` (${label})` : "");
}

/**
 * 2. Export Student Notice Workbook
 */
export async function exportStudentNotice(
  result,
  fileName = "Student_Seating_Notice.xlsx",
  divisionLabels = null,
  includeClassDivisionNotices = false,
  examDate = ""
) {
  const divLabels = divisionLabels || { ...DIVISION_LABELS };
  const wb = new ExcelJS.Workbook();

  const seated = result.assignments.filter((a) => a.student);
  const bySeating = {};
  for (const a of seated) {
    if (!bySeating[a.student.division]) bySeating[a.student.division] = [];
    bySeating[a.student.division].push(a);
  }

  const byLanguageExam = Object.keys(bySeating).some((k) => SECOND_LANGUAGE_LABELS[k]);
  const sortedCodes = Object.keys(bySeating).sort(compareDivisions);

  for (const code of sortedCodes) {
    const label = divLabels[code] || groupDisplayLabel(code);
    let title = noticeTitleForGroup(code, label);
    if (examDate && title.includes("NOTICE")) {
      title = title.replace("NOTICE", `NOTICE (${examDate})`);
    }

    let sortKey = null;
    if (byLanguageExam && SECOND_LANGUAGE_LABELS[code]) {
      sortKey = (a) => [a.student.classDivision || "", rollSortKey(a.student.rollNo)];
    } else {
      sortKey = (a) => rollSortKey(a.student.rollNo);
    }

    writeNoticeSheet(wb, code, title, bySeating[code], sortKey, examDate);
  }

  if (includeClassDivisionNotices) {
    const byClass = {};
    for (const a of seated) {
      const key = a.student.classDivision || a.student.division;
      if (!byClass[key]) byClass[key] = [];
      byClass[key].push(a);
    }

    const sortedClassCodes = Object.keys(byClass).sort(compareDivisions);
    for (const code of sortedClassCodes) {
      const label = DIVISION_LABELS[code] || groupDisplayLabel(code);
      let title = `EXAM SEATING ARRANGEMENT NOTICE - DIVISION ${code} (${label})`;
      if (examDate) {
        title = `EXAM SEATING ARRANGEMENT NOTICE (${examDate}) - DIVISION ${code} (${label})`;
      }
      const sheetName = bySeating[code] ? `DIV-${code}` : code;
      writeNoticeSheet(wb, sheetName, title, byClass[code], (a) => rollSortKey(a.student.rollNo), examDate);
    }
  }

  await downloadWorkbook(wb, fileName);
}

/**
 * 3. Export Attendance Sheets Workbook
 */
export async function exportAttendanceSheets(
  result,
  rooms,
  fileName = "Attendance_Sheets.xlsx",
  dateColumns = null,
  groupLabels = null,
  examDate = ""
) {
  let dates = dateColumns;
  if (examDate && (!dates || dates.length === 0)) {
    dates = [examDate];
  } else if (!dates || dates.length === 0) {
    dates = ["Date 1", "Date 2", "Date 3", "Date 4"];
  }

  const gLabels = groupLabels || {};
  const wb = new ExcelJS.Workbook();
  const byRoom = result.byRoom();

  for (const room of rooms) {
    const seats = (byRoom[room.name] || []).filter((a) => a.student);
    const sheetName = room.name.slice(0, 31);
    const ws = wb.addWorksheet(sheetName);

    const baseHeaders = ["S.No", "Roll No", "Student Name", "Division", "Bench No"];
    const headers = [...baseHeaders, ...dates];
    const numCols = headers.length;

    // Title (Row 1)
    const sheetTitle = examDate ? `EXAM ATTENDANCE SHEET (${examDate})` : "EXAM ATTENDANCE SHEET";
    ws.mergeCells(1, 1, 1, numCols);
    const cellA1 = ws.getCell("A1");
    cellA1.value = sheetTitle;
    cellA1.font = TITLE_FONT;

    // Subtitle (Row 2)
    ws.mergeCells(2, 1, 2, numCols);
    const cellA2 = ws.getCell("A2");
    cellA2.value = `${room.name.toUpperCase()}    |    Total Students: ${seats.length}`;
    cellA2.font = SUBTITLE_FONT;

    // Invigilator (Row 3)
    ws.mergeCells(3, 1, 3, numCols);
    const cellA3 = ws.getCell("A3");
    cellA3.value = "Invigilator: ____________________";
    cellA3.font = SUBTITLE_FONT;

    // Table Headers (Row 5)
    const hRow = ws.getRow(5);
    headers.forEach((h, idx) => {
      hRow.getCell(idx + 1).value = h;
    });
    styleHeaderRow(ws, 5, numCols);

    const byDiv = {};
    for (const a of seats) {
      if (!byDiv[a.student.division]) byDiv[a.student.division] = [];
      byDiv[a.student.division].push(a);
    }

    const sortedDivs = Object.keys(byDiv).sort(compareDivisions);
    let rIdx = 6;
    let sno = 1;

    for (const div of sortedDivs) {
      const label = gLabels[div] || groupDisplayLabel(div);
      const groupHeader = label !== div ? `GROUP: ${div} (${label})` : `GROUP: ${div}`;

      // Division Group Header Row with DIVISION_FILL (#E8EEF3)
      ws.mergeCells(rIdx, 1, rIdx, numCols);
      const divCell = ws.getCell(rIdx, 1);
      divCell.value = groupHeader;
      divCell.font = BOLD_FONT;
      divCell.fill = DIVISION_FILL;
      divCell.alignment = { vertical: "middle" };

      rIdx++;

      const sortedSeats = [...byDiv[div]].sort((a, b) => {
        const rA = rollSortKey(a.student.rollNo);
        const rB = rollSortKey(b.student.rollNo);
        if (typeof rA === "number" && typeof rB === "number") return rA - rB;
        return String(rA).localeCompare(String(rB));
      });

      for (const a of sortedSeats) {
        const row = ws.getRow(rIdx);
        row.getCell(1).value = sno++;
        row.getCell(2).value = a.student.rollNo;
        row.getCell(3).value = a.student.name;
        row.getCell(4).value = a.student.classDivision || a.student.division;
        row.getCell(5).value = a.benchNo;

        for (let c = 1; c <= numCols; c++) {
          const cell = row.getCell(c);
          cell.font = REGULAR_FONT;
          cell.border = BORDER;
          cell.alignment = CENTER_ALIGNMENT;
        }
        rIdx++;
      }
    }

    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 12;
    ws.getColumn(3).width = 28;
    ws.getColumn(4).width = 10;
    ws.getColumn(5).width = 10;
    for (let i = baseHeaders.length + 1; i <= numCols; i++) {
      ws.getColumn(i).width = 14;
    }
  }

  await downloadWorkbook(wb, fileName);
}

/**
 * 4. Export Question Paper Count Workbook
 */
export async function exportQuestionPaperCount(
  result,
  rooms,
  fileName = "Question_Paper_Count.xlsx",
  examDate = ""
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Question Paper Count");

  const allDivsSet = new Set();
  for (const a of result.assignments) {
    if (a.student) allDivsSet.add(a.student.division);
  }
  const allDivisions = Array.from(allDivsSet).sort(compareDivisions);
  const numCols = allDivisions.length + 2;

  let titleText = "CLASS-WISE / SUBJECT-WISE STUDENT COUNT PER EXAM ROOM (For Question Paper Count)";
  if (examDate) {
    titleText += ` - ${examDate}`;
  }

  // Title (Row 1)
  ws.mergeCells(1, 1, 1, numCols);
  const cellA1 = ws.getCell("A1");
  cellA1.value = titleText;
  cellA1.font = TITLE_FONT;

  // Header (Row 3)
  const hRow = ws.getRow(3);
  hRow.getCell(1).value = "Room No";
  allDivisions.forEach((div, idx) => {
    hRow.getCell(idx + 2).value = div;
  });
  hRow.getCell(numCols).value = "Total";
  styleHeaderRow(ws, 3, numCols);

  const byRoom = result.byRoom();
  const colTotals = {};
  for (const d of allDivisions) colTotals[d] = 0;
  let grandTotal = 0;

  let rIdx = 4;
  for (const room of rooms) {
    const seats = (byRoom[room.name] || []).filter((a) => a.student);
    const counts = {};
    for (const a of seats) {
      counts[a.student.division] = (counts[a.student.division] || 0) + 1;
    }

    const row = ws.getRow(rIdx);
    row.getCell(1).value = room.name;

    let rowTotal = 0;
    allDivisions.forEach((div, idx) => {
      const cnt = counts[div] || 0;
      if (cnt > 0) {
        row.getCell(idx + 2).value = cnt;
        colTotals[div] += cnt;
        rowTotal += cnt;
      } else {
        row.getCell(idx + 2).value = "";
      }
    });

    row.getCell(numCols).value = rowTotal;
    grandTotal += rowTotal;

    for (let c = 1; c <= numCols; c++) {
      const cell = row.getCell(c);
      cell.font = REGULAR_FONT;
      cell.border = BORDER;
      cell.alignment = CENTER_ALIGNMENT;
    }
    rIdx++;
  }

  // Total row at bottom
  const totalRow = ws.getRow(rIdx);
  totalRow.getCell(1).value = "TOTAL";
  totalRow.getCell(1).font = BOLD_FONT;
  totalRow.getCell(1).border = BORDER;
  totalRow.getCell(1).alignment = CENTER_ALIGNMENT;

  allDivisions.forEach((div, idx) => {
    const cell = totalRow.getCell(idx + 2);
    cell.value = colTotals[div];
    cell.font = BOLD_FONT;
    cell.border = BORDER;
    cell.alignment = CENTER_ALIGNMENT;
  });

  const cellGrand = totalRow.getCell(numCols);
  cellGrand.value = grandTotal;
  cellGrand.font = BOLD_FONT;
  cellGrand.border = BORDER;
  cellGrand.alignment = CENTER_ALIGNMENT;

  ws.getColumn(1).width = 12;
  for (let i = 2; i <= numCols; i++) {
    ws.getColumn(i).width = 10;
  }

  await downloadWorkbook(wb, fileName);
}
