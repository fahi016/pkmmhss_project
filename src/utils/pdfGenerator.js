/**
 * pdfGenerator.js
 * ----------------
 * Client-side PDF report generator using jsPDF & autoTable, matching ReportLab output
 * 1:1 from public/plus_one_result_analysis/result_analysis.py
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  shortenGroup,
  shortenSubject,
  subjectCodeAbbr,
  rankSort,
  getTotalMax,
  toTitleCase,
  subjectsForStream,
  getSubjectRanklist,
  getSubjectAplusSummary,
} from "./resultAnalysisLogic";
import { DIVISION_LABELS } from "./constants";

export function generatePdfReport(analysisData, examYear = "2026") {
  const {
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
  } = analysisData;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - 2 * margin;

  const pdfTitle = `PLUS ONE RESULT-${examYear}`;
  const pdfSubtitle = `${schoolName}  |  PLUS ONE RESULT ${examYear}`;
  const pdfFooter = `${schoolShort} Result Analysis ${examYear} — Plus One - By HB`;

  function drawPageBorder() {
    doc.setLineWidth(0.5);
    doc.setDrawColor(44, 62, 80);
    doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - 2 * margin + 8);
  }

  function drawPageHeader(subtitle = null) {
    drawPageBorder();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(pdfTitle, pageWidth / 2, margin + 4, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(schoolName, pageWidth / 2, margin + 10, { align: "center" });

    if (subtitle) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(subtitle, pageWidth / 2, margin + 16, { align: "center" });
    }

    const lineY = subtitle ? margin + 20 : margin + 14;
    doc.setLineWidth(0.8);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, lineY, pageWidth - margin, lineY);

    return lineY + 6;
  }

  function drawPageFooter() {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(pdfFooter, pageWidth / 2, pageHeight - margin + 6, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  // ════════════════════════════════════════════════════════════════════
  // PAGE 1 — ANALYSIS SUMMARY
  // ════════════════════════════════════════════════════════════════════
  let currentY = drawPageHeader();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Total Result of the School", pageWidth / 2, currentY, { align: "center" });
  currentY += 6;

  // Stat rows
  const stats = [
    ["Total Students Registered for HSE First Year Exam", totalStudents],
    ["No. of Students Eligible For Higher Studies (Pass)", ehsCount],
    ["No. of Students Not Eligible For Higher Studies (Fail)", nhsCount],
    ["Percentage of Pass", `${passPct}%`],
    ["Number of Full A+ Students", fullAPlusCount],
    ["Number of 5 A+ Students", fiveAPlusCount],
    ["No. of 4 A+ Students", fourAPlusCount],
  ];

  doc.setFontSize(9.5);
  stats.forEach(([label, val], idx) => {
    const isBold = idx === 0 || idx === 3 || idx === 4;
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.text(String(label), margin + 4, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(String(val), pageWidth - margin - 4, currentY, { align: "right" });
    currentY += 6;
  });

  currentY += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Groupwise Result", pageWidth / 2, currentY, { align: "center" });
  currentY += 4;

  // Groupwise Table
  const groupTableRows = groupwiseStats.map((g) => [
    g.shortGroup,
    g.attended,
    g.ehs,
    g.nhs,
    g.full_ap,
    g.five_ap,
    g.four_ap,
    `${g.pct}%`,
  ]);

  groupTableRows.push([
    "TOTAL",
    totalStudents,
    ehsCount,
    nhsCount,
    fullAPlusCount,
    fiveAPlusCount,
    fourAPlusCount,
    `${passPct}%`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Group", "Attended", "Pass", "Fail", "Full A+", "5A+", "4A+", "Percentage"]],
    body: groupTableRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8.5, halign: "center", cellPadding: 2 },
    headStyles: { fillColor: [208, 208, 208], textColor: [0, 0, 0], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 247, 247] },
  });

  currentY = doc.lastAutoTable.finalY + 2;

  // Footnote present in original Python code: "*Absent treated as Fail."
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text("*Absent treated as Fail.", pageWidth - margin - 2, currentY, { align: "right" });
  doc.setTextColor(0, 0, 0);
  currentY += 6;

  // Failed Students Table on Page 1
  if (failedStudentsList.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("List of Failed Students :", margin + 2, currentY);
    currentY += 4;

    const failedRows = failedStudentsList.map((f, idx) => [
      idx + 1,
      f.regno,
      toTitleCase(f.name),
      f.division,
      f.group,
      f.failedSubjects,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["#", "Reg No", "Name", "Div", "Group", "Subject(s) Failed"]],
      body: failedRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 1.8 },
      headStyles: { fillColor: [208, 208, 208], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 22 },
        2: { cellWidth: 42 },
        3: { halign: "center", cellWidth: 14 },
        4: { cellWidth: 26 },
        5: { cellWidth: "auto" },
      },
      alternateRowStyles: { fillColor: [255, 240, 240] },
      didDrawPage: () => {
        drawPageBorder();
        drawPageFooter();
      },
    });
  } else {
    drawPageFooter();
  }

  // ════════════════════════════════════════════════════════════════════
  // TOP 10 ACHIEVERS PER STREAM
  // ════════════════════════════════════════════════════════════════════
  const groups = ["BIO SCIENCE", "COMPUTER SCIENCE", "COMMERCE", "HUMANITIES"];

  for (const grp of groups) {
    const groupStudents = students.filter((s) => s.subGroup === grp);
    if (groupStudents.length === 0) continue;

    const top10 = rankSort(groupStudents).slice(0, 10);
    if (top10.length === 0) continue;

    doc.addPage();
    drawPageHeader(`TOP 10 STUDENTS — ${grp}`);

    const sampleSubs = top10[0].subjects;
    const subHeaders = sampleSubs.map((s, idx) => (idx === 1 ? "SL" : subjectCodeAbbr(s.subName)));
    const headers = ["#", "Reg No", "Name", "Div", ...subHeaders, "Total", "%"];

    const tableRows = top10.map((s, idx) => {
      const marks = s.subjects.map((sub) => sub.total);
      const maxTot = s.subjects.reduce((sum, sub) => sum + getTotalMax(sub.subName), 0);
      const pctVal = parseFloat(((s.totalMarks / maxTot) * 100).toFixed(2));
      return [idx + 1, s.regno, toTitleCase(s.name), s.division || "-", ...marks, s.totalMarks, `${pctVal}%`];
    });

    autoTable(doc, {
      startY: margin + 26,
      head: [headers],
      body: tableRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, halign: "center", cellPadding: 2 },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 2: { halign: "left" } },
      alternateRowStyles: { fillColor: [247, 247, 247] },
      didDrawPage: () => {
        drawPageBorder();
        drawPageFooter();
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // FULL A+ & 5 A+ ACHIEVERS PER STREAM
  // ════════════════════════════════════════════════════════════════════
  for (const aCount of [6, 5]) {
    for (const grp of groups) {
      const achievers = rankSort(
        students.filter((s) => s.subGroup === grp && s.aPlusCount === aCount)
      );
      if (achievers.length === 0) continue;

      doc.addPage();
      const titleLabel = aCount === 6 ? `FULL A+ STUDENTS — ${grp}` : `5 A+ STUDENTS — ${grp}`;
      drawPageHeader(titleLabel);

      const sampleSubs = achievers[0].subjects;
      const subHeaders = sampleSubs.map((s, idx) => (idx === 1 ? "SL" : subjectCodeAbbr(s.subName)));
      const headers = ["#", "Reg No", "Name", "Div", ...subHeaders, "Total", "%"];

      const tableRows = achievers.map((s, idx) => {
        const marks = s.subjects.map((sub) => sub.total);
        const maxTot = s.subjects.reduce((sum, sub) => sum + getTotalMax(sub.subName), 0);
        const pctVal = parseFloat(((s.totalMarks / maxTot) * 100).toFixed(2));
        return [idx + 1, s.regno, toTitleCase(s.name), s.division || "-", ...marks, s.totalMarks, `${pctVal}%`];
      });

      autoTable(doc, {
        startY: margin + 26,
        head: [headers],
        body: tableRows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, halign: "center", cellPadding: 2 },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: { 2: { halign: "left" } },
        alternateRowStyles: { fillColor: [247, 247, 247] },
        didDrawPage: () => {
          drawPageBorder();
          drawPageFooter();
        },
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // GROUP RANK LISTS (ALL STUDENTS)
  // ════════════════════════════════════════════════════════════════════
  for (const grp of groups) {
    const groupStudents = rankSort(students.filter((s) => s.subGroup === grp));
    if (groupStudents.length === 0) continue;

    doc.addPage();
    drawPageHeader(`RANK LIST — ${grp}`);

    const sampleSubs = groupStudents[0].subjects;
    const subHeaders = sampleSubs.map((s, idx) => (idx === 1 ? "SL" : subjectCodeAbbr(s.subName)));
    const headers = ["#", "Reg No", "Name", "Div", ...subHeaders, "Total", "%"];

    const tableRows = groupStudents.map((s, idx) => {
      const marks = s.subjects.map((sub) => sub.total);
      const maxTot = s.subjects.reduce((sum, sub) => sum + getTotalMax(sub.subName), 0);
      const pctVal = parseFloat(((s.totalMarks / maxTot) * 100).toFixed(2));
      return [idx + 1, s.regno, toTitleCase(s.name), s.division || "-", ...marks, s.totalMarks, `${pctVal}%`];
    });

    autoTable(doc, {
      startY: margin + 26,
      head: [headers],
      body: tableRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, halign: "center", cellPadding: 1.5 },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 2: { halign: "left" } },
      didParseCell: (data) => {
        if (data.section === "body") {
          const rowStudent = groupStudents[data.row.index];
          if (rowStudent && rowStudent.failed) {
            data.cell.styles.fillColor = [255, 232, 232];
          }
        }
      },
      didDrawPage: () => {
        drawPageBorder();
        drawPageFooter();
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // CLASS (DIVISION) RANK LISTS (S1, S2, S3...)
  // ════════════════════════════════════════════════════════════════════
  for (const divName of divisionsPresent) {
    const divStudents = rankSort(students.filter((s) => s.division === divName));
    if (divStudents.length === 0) continue;

    doc.addPage();
    const divLabel = DIVISION_LABELS[divName] || "";
    const headerTitle = divLabel
      ? `CLASS RANK LIST — DIVISION ${divName} (${divLabel})`
      : `CLASS RANK LIST — DIVISION ${divName}`;
    drawPageHeader(headerTitle);

    const headers = ["#", "Reg No", "Name", "Group", "Total", "%", "Result"];

    const tableRows = divStudents.map((s, idx) => {
      const maxTot = s.subjects.reduce((sum, sub) => sum + getTotalMax(sub.subName), 0);
      const pctVal = parseFloat(((s.totalMarks / maxTot) * 100).toFixed(2));
      const resStr = s.failed ? "FAIL" : "PASS";
      return [idx + 1, s.regno, toTitleCase(s.name), shortenGroup(s.subGroup), s.totalMarks, `${pctVal}%`, resStr];
    });

    autoTable(doc, {
      startY: margin + 26,
      head: [headers],
      body: tableRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, halign: "center", cellPadding: 2 },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 2: { halign: "left" } },
      didParseCell: (data) => {
        if (data.section === "body") {
          const rowStudent = divStudents[data.row.index];
          if (rowStudent && rowStudent.failed) {
            data.cell.styles.fillColor = [255, 232, 232];
          }
        }
      },
      didDrawPage: () => {
        drawPageBorder();
        drawPageFooter();
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // SUBJECT-BASED RANK LISTS — SCIENCE, COMMERCE, HUMANITIES
  // ════════════════════════════════════════════════════════════════════
  const rawStreams = ["SCIENCE", "COMMERCE", "HUMANITIES"];

  for (const streamName of rawStreams) {
    const subjects = subjectsForStream(students, streamName);
    for (const subName of subjects) {
      const records = getSubjectRanklist(students, streamName, subName);
      if (records.length === 0) continue;

      doc.addPage();
      const pageTitle = `${shortenSubject(subName)} — ${streamName} (Subject Rank List)`;
      drawPageHeader(pageTitle);

      const headers = ["#", "Reg No", "Name", "Div", "CE", "TE", "Total", "Grade"];
      const tableRows = records.map((r, idx) => [
        idx + 1,
        r.regno,
        r.name,
        r.division,
        r.ce,
        r.te,
        r.total,
        r.grade,
      ]);

      autoTable(doc, {
        startY: margin + 26,
        head: [headers],
        body: tableRows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, halign: "center", cellPadding: 1.8 },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: { 2: { halign: "left", cellWidth: 50 } },
        didParseCell: (data) => {
          if (data.section === "body") {
            const rowRec = records[data.row.index];
            if (rowRec && rowRec.failed) {
              data.cell.styles.fillColor = [255, 232, 232];
            }
          }
        },
        didDrawPage: () => {
          drawPageBorder();
          drawPageFooter();
        },
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // SUBJECT-WISE A+ ACHIEVERS SUMMARY PAGE (Last Page)
  // ════════════════════════════════════════════════════════════════════
  const aplusSummary = getSubjectAplusSummary(students);
  if (aplusSummary.length > 0) {
    doc.addPage();
    drawPageHeader("Subject-wise A+ Achievers");

    const headers = ["#", "Stream", "Subject", "Appeared", "A+ Count", "A+ %"];
    const tableRows = aplusSummary.map((r, idx) => [
      idx + 1,
      r.stream,
      r.subject,
      r.appeared,
      r.aplus,
      `${r.pct}%`,
    ]);

    autoTable(doc, {
      startY: margin + 26,
      head: [headers],
      body: tableRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8.5, halign: "center", cellPadding: 2 },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 247, 247] },
      didDrawPage: () => {
        drawPageBorder();
        drawPageFooter();
      },
    });
  }

  doc.save(`${schoolShort.replace(/\s+/g, "_")}_PlusOne_Result_${examYear}.pdf`);
}
