/**
 * plusTwoPdfGenerator.js
 * ----------------------
 * Client-side PDF generator converted from
 * public/plus_two_result_analalysis/result3.py
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  PLUS_TWO_GROUPS,
  calculateMaxMarkPercentage,
  buildSubjectHeaders,
  getAPlusStudents,
  getTop10Students,
} from "./plusTwoResultAnalysisLogic";

const PAGE_TITLE = "PLUS TWO RESULT-2026";
const SCHOOL_NAME = "PKMMHSS EDARIKODE";
const PAGE_SUBTITLE = "PKMMHSS EDARIKODE  |  PLUS TWO RESULT 2026";
const PAGE_FOOTER = "PKMMHSS Result Analysis 2026";

export function generatePlusTwoPdfReport(analysisData) {
  const {
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
  } = analysisData;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const tableStartY = margin + 18;

  function drawPageBorder() {
    doc.setLineWidth(0.5);
    doc.rect(margin - 4, margin - 4, pageWidth - 2 * margin + 8, pageHeight - 2 * margin + 8);
  }

  function drawMainPageHeader() {
    drawPageBorder();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(PAGE_TITLE, pageWidth / 2, margin + 4, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(SCHOOL_NAME, pageWidth / 2, margin + 10, { align: "center" });

    doc.setLineWidth(0.6);
    doc.line(margin, margin + 14, pageWidth - margin, margin + 14);

    return margin + 20;
  }

  function drawSectionPageHeader(title) {
    drawPageBorder();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(title, pageWidth / 2, margin + 4, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(PAGE_SUBTITLE, pageWidth / 2, margin + 10, { align: "center" });

    doc.setLineWidth(0.6);
    doc.line(margin, margin + 14, pageWidth - margin, margin + 14);
  }

  function drawPageFooter() {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(PAGE_FOOTER, pageWidth / 2, pageHeight - margin + 6, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  function addPagedTablePage({ title, headers, rows, bodyFill = [247, 247, 247] }) {
    doc.addPage();

    autoTable(doc, {
      startY: tableStartY,
      margin: { top: tableStartY, left: margin, right: margin },
      head: [headers],
      body: rows,
      styles: {
        fontSize: 8,
        halign: "center",
        cellPadding: 1.8,
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: bodyFill },
      columnStyles: {
        2: { halign: "left" },
      },
      didDrawPage: (data) => {
        const pageTitle =
          data.pageNumber > 1 ? `${title} (contd.)` : title;
        drawSectionPageHeader(pageTitle);
        drawPageFooter();
      },
    });
  }

  let currentY = drawMainPageHeader();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Total Result of the School", pageWidth / 2, currentY, { align: "center" });
  currentY += 7;

  const statRows = [
    ["Total Students Registered for HSE Exam", totalStudents, false],
    ["No. of Students Eligible For Higher Studies", ehsCount, false],
    ["No. of Students Not Eligible For Higher Studies", nhsCount, false],
    ["Percentage of Eligible Students", `${passPct}%`, false],
    ["Number of Full A+ Students", fullAPlusCount, true],
    ["Number of 5 A+ Students", fiveAPlusCount, false],
    ["No. of 4 A+ Students", fourAPlusCount, false],
  ];

  doc.setFontSize(10);
  for (const [label, value, boldLabel] of statRows) {
    doc.setFont("helvetica", boldLabel ? "bold" : "normal");
    doc.text(String(label), margin + 5, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(String(value), pageWidth - margin - 5, currentY, { align: "right" });
    currentY += 6;
  }

  currentY += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Groupwise Result", pageWidth / 2, currentY, { align: "center" });
  currentY += 4;

  const groupTableRows = groupwiseStats.map((groupStat) => [
    groupStat.shortGroup,
    groupStat.attended,
    groupStat.ehs,
    groupStat.nhs,
    groupStat.full_ap,
    groupStat.five_ap,
    `${groupStat.pct}%`,
  ]);

  groupTableRows.push([
    "TOTAL",
    totalStudents,
    ehsCount,
    nhsCount,
    fullAPlusCount,
    fiveAPlusCount,
    `${passPct}%`,
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Group", "Attended", "EHS", "NHS", "Full A+", "5A+", "Percentage"]],
    body: groupTableRows,
    styles: {
      fontSize: 8.5,
      halign: "center",
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [208, 208, 208],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [247, 247, 247] },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === groupTableRows.length - 1) {
        data.cell.styles.fillColor = [208, 208, 208];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  currentY = doc.lastAutoTable.finalY + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("* Absent students treated as NHS", pageWidth - margin - 2, currentY, {
    align: "right",
  });
  currentY += 6;

  if (failedStudentsList.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("List of Failed Students :", margin + 2, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [["Reg No", "Name", "Group", "Subject(s) Failed"]],
      body: failedStudentsList.map((student) => [
        student.regno,
        student.name,
        student.group,
        student.failedSubjects,
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 1.8,
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [208, 208, 208],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [255, 240, 240] },
      columnStyles: {
        1: { cellWidth: 55 },
        3: { cellWidth: "auto" },
      },
      didDrawPage: () => {
        drawPageBorder();
        drawPageFooter();
      },
    });
  } else {
    drawPageFooter();
  }

  for (const groupName of PLUS_TWO_GROUPS) {
    const top10Students = getTop10Students(students, groupName);
    if (top10Students.length === 0) {
      continue;
    }

    addPagedTablePage({
      title: `TOP 10 STUDENTS - ${groupName}`,
      headers: ["#", "Reg No", "Name", ...buildSubjectHeaders(top10Students), "Total", "%"],
      rows: top10Students.map((student, index) => [
        index + 1,
        student.regno,
        student.titleName,
        ...student.subjects.map((subject) => subject.total),
        student.totalMarks,
        `${calculateMaxMarkPercentage(student.totalMarks)}%`,
      ]),
    });
  }

  for (const aPlusCount of [6, 5]) {
    for (const groupName of PLUS_TWO_GROUPS) {
      const achievers = getAPlusStudents(students, groupName, aPlusCount);
      if (achievers.length === 0) {
        continue;
      }

      addPagedTablePage({
        title: `${aPlusCount === 6 ? "FULL A+ STUDENTS" : "5 A+ STUDENTS"} - ${groupName}`,
        headers: ["#", "Reg No", "Name", ...buildSubjectHeaders(achievers), "Total", "%"],
        rows: achievers.map((student, index) => [
          index + 1,
          student.regno,
          student.titleName,
          ...student.subjects.map((subject) => subject.total),
          student.totalMarks,
          `${calculateMaxMarkPercentage(student.totalMarks)}%`,
        ]),
      });
    }
  }

  doc.save("PKMMHSS_Result_2026.pdf");
}
