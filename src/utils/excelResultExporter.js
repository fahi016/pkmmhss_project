/**
 * excelResultExporter.js
 * ----------------------
 * Generates styled Excel analysis workbooks via ExcelJS matching +1 result analysis
 */

import ExcelJS from "exceljs";
import { rankSort, shortenGroup, getTotalMax } from "./resultAnalysisLogic";

const TITLE_FONT = { name: "Segoe UI", size: 13, bold: true };
const HEADER_FONT = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
const REGULAR_FONT = { name: "Segoe UI", size: 10 };
const BOLD_FONT = { name: "Segoe UI", size: 10, bold: true };

const HEADER_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF2C3E50" },
};

const FAIL_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFE8E8" },
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

export async function exportResultAnalysisExcel(analysisData, fileName = "PlusOne_Result_Analysis.xlsx") {
  const wb = new ExcelJS.Workbook();
  const {
    schoolName,
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
  } = analysisData;

  // 1. Summary Sheet
  const sumWs = wb.addWorksheet("Summary");
  sumWs.getCell("A1").value = `${schoolName} - PLUS ONE RESULT ANALYSIS`;
  sumWs.getCell("A1").font = TITLE_FONT;

  sumWs.getRow(3).values = ["Metric", "Count / Value"];
  sumWs.getRow(3).eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = CENTER_ALIGNMENT;
    cell.border = BORDER;
  });

  const summaryData = [
    ["Total Registered Students", totalStudents],
    ["Eligible For Higher Studies (Pass)", ehsCount],
    ["Not Eligible For Higher Studies (Fail)", nhsCount],
    ["Pass Percentage", `${passPct}%`],
    ["Full A+ Students (6 A+)", fullAPlusCount],
    ["5 A+ Students", fiveAPlusCount],
    ["4 A+ Students", fourAPlusCount],
  ];

  summaryData.forEach((row, idx) => {
    const r = sumWs.getRow(4 + idx);
    r.values = row;
    r.getCell(1).font = REGULAR_FONT;
    r.getCell(2).font = BOLD_FONT;
    r.getCell(1).border = BORDER;
    r.getCell(2).border = BORDER;
  });

  sumWs.getColumn(1).width = 36;
  sumWs.getColumn(2).width = 20;

  // Groupwise Table in Summary
  const startRowGroup = 13;
  sumWs.getCell(`A${startRowGroup}`).value = "Groupwise Results Summary";
  sumWs.getCell(`A${startRowGroup}`).font = BOLD_FONT;

  const groupHeaders = ["Group", "Attended", "Pass", "Fail", "Full A+", "5A+", "4A+", "Pass %"];
  const gHRow = sumWs.getRow(startRowGroup + 1);
  gHRow.values = groupHeaders;
  gHRow.eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = CENTER_ALIGNMENT;
    cell.border = BORDER;
  });

  groupwiseStats.forEach((g, idx) => {
    const r = sumWs.getRow(startRowGroup + 2 + idx);
    r.values = [g.group, g.attended, g.ehs, g.nhs, g.full_ap, g.five_ap, g.four_ap, `${g.pct}%`];
    r.eachCell((cell) => {
      cell.font = REGULAR_FONT;
      cell.border = BORDER;
      cell.alignment = CENTER_ALIGNMENT;
    });
  });

  // 2. Failed Students Sheet
  if (failedStudentsList.length > 0) {
    const failWs = wb.addWorksheet("Failed Students");
    failWs.getCell("A1").value = "List of Failed Students";
    failWs.getCell("A1").font = TITLE_FONT;

    const fHeaders = ["#", "Reg No", "Student Name", "Div", "Group", "Failed Subject(s)"];
    const fHRow = failWs.getRow(3);
    fHRow.values = fHeaders;
    fHRow.eachCell((cell) => {
      cell.font = HEADER_FONT;
      cell.fill = HEADER_FILL;
      cell.alignment = CENTER_ALIGNMENT;
      cell.border = BORDER;
    });

    failedStudentsList.forEach((f, idx) => {
      const r = failWs.getRow(4 + idx);
      r.values = [idx + 1, f.regno, f.name, f.division, f.group, f.failedSubjects];
      r.eachCell((cell) => {
        cell.font = REGULAR_FONT;
        cell.border = BORDER;
        cell.fill = FAIL_FILL;
      });
      r.getCell(1).alignment = CENTER_ALIGNMENT;
      r.getCell(4).alignment = CENTER_ALIGNMENT;
    });

    failWs.getColumn(1).width = 8;
    failWs.getColumn(2).width = 16;
    failWs.getColumn(3).width = 30;
    failWs.getColumn(4).width = 10;
    failWs.getColumn(5).width = 24;
    failWs.getColumn(6).width = 40;
  }

  // 3. Full Rank List Sheet
  const rankWs = wb.addWorksheet("Full Rank List");
  rankWs.getCell("A1").value = "Complete School Rank List";
  rankWs.getCell("A1").font = TITLE_FONT;

  const rHeaders = ["Rank", "Reg No", "Student Name", "Div", "Group", "Total Marks", "Pass/Fail"];
  const rHRow = rankWs.getRow(3);
  rHRow.values = rHeaders;
  rHRow.eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = CENTER_ALIGNMENT;
    cell.border = BORDER;
  });

  const sortedStudents = rankSort(students);
  sortedStudents.forEach((s, idx) => {
    const r = rankWs.getRow(4 + idx);
    const resultStr = s.failed ? "FAIL" : "PASS";
    r.values = [idx + 1, s.regno, s.name, s.division || "-", shortenGroup(s.subGroup), s.totalMarks, resultStr];

    r.eachCell((cell) => {
      cell.font = REGULAR_FONT;
      cell.border = BORDER;
      if (s.failed) cell.fill = FAIL_FILL;
    });
    r.getCell(1).alignment = CENTER_ALIGNMENT;
    r.getCell(4).alignment = CENTER_ALIGNMENT;
    r.getCell(7).alignment = CENTER_ALIGNMENT;
  });

  rankWs.getColumn(1).width = 8;
  rankWs.getColumn(2).width = 16;
  rankWs.getColumn(3).width = 32;
  rankWs.getColumn(4).width = 10;
  rankWs.getColumn(5).width = 24;
  rankWs.getColumn(6).width = 14;
  rankWs.getColumn(7).width = 12;

  // Write file buffer download
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
