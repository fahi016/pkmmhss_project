import React, { useState } from "react";
import { FileCheck, FileSpreadsheet, Check, ArrowDown } from "lucide-react";
import {
  exportSeatingArrangement,
  exportStudentNotice,
  exportAttendanceSheets,
  exportQuestionPaperCount,
} from "../utils/excelExporter";

export function Step4Export({ result, rooms, sessionType, sessionLabel, customDate }) {
  const [selectedExports, setSelectedExports] = useState({
    seating: true,
    notice: true,
    attendance: true,
    qpCount: true,
  });

  const [downloadLogs, setDownloadLogs] = useState([]);

  const prefix = sessionLabel ? `${sessionLabel.trim()}_` : "";
  const examDate = sessionType === "Custom" ? customDate || "" : "";

  const handleExportSingle = (key) => {
    if (!result) {
      alert("Please generate the seating arrangement in Step 3 first.");
      return;
    }

    try {
      if (key === "seating") {
        const fileName = `${prefix}Seating_Arrangement.xlsx`;
        exportSeatingArrangement(result, rooms, fileName, examDate);
        addLog(fileName);
      } else if (key === "notice") {
        const fileName = `${prefix}Student_Seating_Notice.xlsx`;
        const includeClassNotices = ["Second Language", "English (single group)", "Custom"].includes(sessionType);
        exportStudentNotice(result, fileName, null, includeClassNotices, examDate);
        addLog(fileName);
      } else if (key === "attendance") {
        const fileName = `${prefix}Attendance_Sheets.xlsx`;
        const singleDateSession = ["Second Language", "English (single group)", "Custom"].includes(sessionType);
        const dateCols = sessionType === "Custom" && examDate ? [examDate] : singleDateSession ? ["Date"] : null;
        exportAttendanceSheets(result, rooms, fileName, dateCols, null, examDate);
        addLog(fileName);
      } else if (key === "qpCount") {
        const fileName = `${prefix}Question_Paper_Count.xlsx`;
        exportQuestionPaperCount(result, rooms, fileName, examDate);
        addLog(fileName);
      }
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleExportAllSelected = () => {
    if (!result) {
      alert("Please generate the seating arrangement in Step 3 first.");
      return;
    }

    if (selectedExports.seating) handleExportSingle("seating");
    if (selectedExports.notice) handleExportSingle("notice");
    if (selectedExports.attendance) handleExportSingle("attendance");
    if (selectedExports.qpCount) handleExportSingle("qpCount");
  };

  const addLog = (fileName) => {
    setDownloadLogs((prev) => Array.from(new Set([...prev, fileName])));
  };

  const reports = [
    {
      id: "seating",
      title: "Seating Arrangement (per room)",
      desc: "Detailed room sheets bench-by-bench with student roll numbers, names, and streams + Summary sheet",
    },
    {
      id: "notice",
      title: "Student Seating Notice (by division / group)",
      desc: "Public student notice sheets sorted by class/language division showing room and bench numbers",
    },
    {
      id: "attendance",
      title: "Attendance Sheets (per room)",
      desc: "Invigilator attendance sheets with student lists grouped by division and date signature columns",
    },
    {
      id: "qpCount",
      title: "Question Paper Count Matrix",
      desc: "Class-wise and subject-wise student count per exam room for question paper envelope distribution",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-indigo-600" />
          Step 4 - Export Excel Reports
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Select reports to generate and download client-side Excel workbooks directly to your browser downloads folder.
        </p>
      </div>

      {!result && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold">
          ⚠️ Please generate seating arrangement in Step 3 before exporting.
        </div>
      )}

      {/* Reports Card List */}
      <div className="space-y-3">
        {reports.map((r) => (
          <div
            key={r.id}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4 hover:border-indigo-200 transition"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedExports[r.id]}
                onChange={(e) =>
                  setSelectedExports((prev) => ({ ...prev, [r.id]: e.target.checked }))
                }
                className="w-5 h-5 text-indigo-600 rounded border-slate-300 mt-0.5 focus:ring-indigo-500"
              />
              <div>
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  {r.title}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
              </div>
            </div>

            <button
              onClick={() => handleExportSingle(r.id)}
              disabled={!result}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition disabled:opacity-40"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        ))}
      </div>

      {/* Export All Action */}
      <div className="space-y-4 pt-2">
        <button
          onClick={handleExportAllSelected}
          disabled={!result}
          className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-2 disabled:opacity-40"
        >
          <FileCheck className="w-5 h-5" />
          <span>Export All Selected Reports (.xlsx)</span>
        </button>

        {downloadLogs.length > 0 && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-mono text-emerald-900 space-y-1">
            <div className="font-bold text-emerald-800 flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              Successfully generated and downloaded files:
            </div>
            {downloadLogs.map((log, i) => (
              <div key={i}>• {log}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
