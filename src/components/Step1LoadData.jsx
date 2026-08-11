import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Calendar,
  Layers,
} from "lucide-react";
import {
  readWorkbookFromFile,
  getSheetNames,
  getHeaders,
  loadStudentsFromWorkbook,
} from "../utils/excelParser";
import {
  DIVISION_LABELS,
  SECOND_LANGUAGE_LABELS,
  groupDisplayLabel,
} from "../utils/constants";

export function Step1LoadData({
  onStudentsLoaded,
  onSessionTypeChanged,
  onSessionLabelChanged,
  onCustomDateChanged,
  currentStudents,
}) {
  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [headerRow, setHeaderRow] = useState("1");
  const [availableHeaders, setAvailableHeaders] = useState([]);

  // Session options
  const [sessionType, setSessionType] = useState("Regular Subjects");
  const [singleGroup, setSingleGroup] = useState(false);
  const [sessionLabel, setSessionLabel] = useState("Regular");

  // Column choices
  const [colRoll, setColRoll] = useState("");
  const [colName, setColName] = useState("");
  const [colDivision, setColDivision] = useState("");
  const [colAdmn, setColAdmn] = useState("(none)");

  // Custom schedule mode
  const [customDate, setCustomDate] = useState("");
  const [customDivs, setCustomDivs] = useState({
    S1: { enabled: true, subject: "Bio Science" },
    S2: { enabled: true, subject: "Bio Science" },
    S3: { enabled: true, subject: "Bio Science" },
    S4: { enabled: true, subject: "Bio Science" },
    S5: { enabled: true, subject: "Computer Science" },
    S6: { enabled: true, subject: "Commerce" },
    S7: { enabled: true, subject: "Humanities" },
  });

  const [statusMsg, setStatusMsg] = useState(null);

  // Auto-guess columns from headers
  const autoGuessColumns = (headers, currentSession) => {
    if (!headers || headers.length === 0) return;

    const findMatch = (keywords) => {
      for (const h of headers) {
        if (keywords.includes(h.trim().toLowerCase())) return h;
      }
      for (const h of headers) {
        if (keywords.some((k) => h.toLowerCase().includes(k))) return h;
      }
      return "";
    };

    setColRoll(findMatch(["roll", "sl no", "admn", "id"]) || headers[0]);
    setColName(findMatch(["name"]) || headers[0]);

    if (currentSession === "Second Language") {
      setColDivision(findMatch(["sl", "second lang", "language"]) || headers[0]);
    } else if (currentSession.startsWith("English")) {
      setColDivision(findMatch(["sl", "division", "class", "stream"]) || headers[0]);
    } else {
      setColDivision(findMatch(["division", "class", "stream"]) || headers[0]);
    }

    const admnGuess = findMatch(["admn"]);
    setColAdmn(admnGuess || "(none)");
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    try {
      setFile(selectedFile);
      const wb = await readWorkbookFromFile(selectedFile);
      setWorkbook(wb);
      const sheetList = getSheetNames(wb);
      setSheets(sheetList);

      if (sheetList.length > 0) {
        setSelectedSheet(sheetList[0]);
        reloadHeadersForSheet(wb, sheetList[0], parseInt(headerRow, 10) || 1, sessionType);
      }
    } catch (err) {
      setStatusMsg({ type: "error", text: `Error reading file: ${err.message}` });
    }
  };

  const reloadHeadersForSheet = (wb, sheetName, rowIdx, currentSession) => {
    try {
      const hdrs = getHeaders(wb, sheetName, rowIdx);
      setAvailableHeaders(hdrs);
      autoGuessColumns(hdrs, currentSession);
    } catch (err) {
      setStatusMsg({ type: "error", text: `Error reading headers: ${err.message}` });
    }
  };

  const handleRefreshHeaders = () => {
    if (workbook && selectedSheet) {
      reloadHeadersForSheet(workbook, selectedSheet, parseInt(headerRow, 10) || 1, sessionType);
    }
  };

  const handleSessionTypeChange = (newType) => {
    setSessionType(newType);
    onSessionTypeChanged(newType);

    if (newType === "Regular Subjects") {
      setSingleGroup(false);
      setSessionLabel("Regular");
      onSessionLabelChanged("Regular");
    } else if (newType === "Second Language") {
      setSingleGroup(false);
      setSessionLabel("SecondLanguage");
      onSessionLabelChanged("SecondLanguage");
    } else if (newType.startsWith("English")) {
      setSingleGroup(true);
      setSessionLabel("English");
      onSessionLabelChanged("English");
    } else if (newType === "Custom") {
      setSingleGroup(false);
      const formattedDate = customDate ? customDate.replace(/\//g, "-").replace(/\s+/g, "_") : "";
      const label = formattedDate ? `Custom_${formattedDate}` : "Custom";
      setSessionLabel(label);
      onSessionLabelChanged(label);
    }

    if (availableHeaders.length > 0) {
      autoGuessColumns(availableHeaders, newType);
    }
  };

  const handleDateChange = (val) => {
    setCustomDate(val);
    onCustomDateChanged(val);
    if (sessionType === "Custom") {
      const formattedDate = val ? val.replace(/\//g, "-").replace(/\s+/g, "_") : "";
      const label = formattedDate ? `Custom_${formattedDate}` : "Custom";
      setSessionLabel(label);
      onSessionLabelChanged(label);
    }
  };

  const handleLoadStudents = () => {
    if (!workbook || !selectedSheet) {
      setStatusMsg({ type: "warning", text: "Please select an Excel file first." });
      return;
    }

    try {
      const rowIdx = parseInt(headerRow, 10) || 1;
      const admnColumn = colAdmn === "(none)" ? null : colAdmn;
      const divColumn = singleGroup ? colDivision || colName : colDivision;

      let subjectMapping = null;
      if (sessionType === "Custom") {
        subjectMapping = {};
        for (const divCode in customDivs) {
          if (customDivs[divCode].enabled) {
            const subj = customDivs[divCode].subject.trim();
            subjectMapping[divCode] = subj || DIVISION_LABELS[divCode] || divCode;
          }
        }
        if (Object.keys(subjectMapping).length === 0) {
          setStatusMsg({
            type: "warning",
            text: "Please check at least one division for Custom exam date mode.",
          });
          return;
        }
      }

      const students = loadStudentsFromWorkbook({
        workbook,
        sheetName: selectedSheet,
        colRoll,
        colName,
        colDivision: divColumn,
        colAdmn: admnColumn,
        headerRowIndex: rowIdx,
        subjectMapping,
      });

      if (singleGroup) {
        const groupLabel = sessionLabel.trim() || "ALL";
        for (const s of students) {
          s.division = groupLabel;
        }
      }

      if (students.length === 0) {
        setStatusMsg({
          type: "error",
          text: "No students found in file. Please check column mapping.",
        });
        return;
      }

      // Counts per division
      const counts = {};
      for (const s of students) {
        counts[s.division] = (counts[s.division] || 0) + 1;
      }

      const loadedCodes = new Set(Object.keys(counts));
      const isSLDivisionCodes = Array.from(loadedCodes).every((c) =>
        ["S1", "S2", "S3", "S4", "S5", "S6", "S7"].includes(c)
      );
      const isRegularSLCodes = Array.from(loadedCodes).every((c) =>
        ["A", "H", "M", "U"].includes(c)
      );

      let warnText = "";
      if (sessionType === "Second Language" && isSLDivisionCodes) {
        warnText =
          "WARNING: These look like DIVISION codes (S1-S7), not Second Language. " +
          "Second Language expects SL column (A/H/M/U). Map the SL column.";
      } else if (sessionType === "Regular Subjects" && isRegularSLCodes) {
        warnText =
          "WARNING: These look like Second Language codes (A/H/M/U), not divisions. " +
          "For Regular Subjects map the DIVISION column (S1-S7).";
      } else if (sessionType === "Second Language" && Object.keys(counts).length < 2) {
        warnText =
          "WARNING: Second Language expects several language groups (A/H/M/U), but only 1 was found.";
      } else if (sessionType === "Regular Subjects" && Object.keys(counts).length < 2) {
        warnText =
          "WARNING: Regular Subjects expects several divisions (S1-S7), but only 1 was found.";
      }

      const summaryParts = Object.entries(counts)
        .map(([code, count]) => {
          const lbl = groupDisplayLabel(code);
          return lbl !== code ? `${code} (${lbl}): ${count}` : `${code}: ${count}`;
        })
        .join(", ");

      setStatusMsg({
        type: warnText ? "warning" : "success",
        text: `Loaded ${students.length} students across ${Object.keys(counts).length} group(s).\n${summaryParts}${
          warnText ? `\n\n${warnText}` : ""
        }`,
      });

      onStudentsLoaded(students);
    } catch (err) {
      setStatusMsg({ type: "error", text: `Error loading students: ${err.message}` });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
          Step 1 - Load Student Data
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Upload student list Excel/CSV file, pick exam session type, and configure column mapping.
        </p>
      </div>

      {/* File Upload Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <label className="flex-1 cursor-pointer border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-xl p-4 transition text-center flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-indigo-500" />
            <span className="text-sm font-medium text-slate-700">
              {file ? file.name : "Click or drop student Excel (.xlsx, .xls, .csv) file"}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <div className="w-full sm:w-64 space-y-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
              Exam Session Type
            </label>
            <select
              value={sessionType}
              onChange={(e) => handleSessionTypeChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="Regular Subjects">Regular Subjects (S1-S7)</option>
              <option value="Second Language">Second Language (A/H/M/U)</option>
              <option value="English (single group)">English (single group)</option>
              <option value="Custom">Custom Exam Schedule</option>
            </select>
          </div>
        </div>

        {/* Sheet & Header row control */}
        {sheets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                Select Worksheet
              </label>
              <select
                value={selectedSheet}
                onChange={(e) => {
                  setSelectedSheet(e.target.value);
                  reloadHeadersForSheet(
                    workbook,
                    e.target.value,
                    parseInt(headerRow, 10) || 1,
                    sessionType
                  );
                }}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-2 font-medium"
              >
                {sheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                Header Row Index
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={headerRow}
                  onChange={(e) => setHeaderRow(e.target.value)}
                  className="w-20 bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-2 text-center font-medium"
                />
                <button
                  onClick={handleRefreshHeaders}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                Session Output Label
              </label>
              <input
                type="text"
                value={sessionLabel}
                onChange={(e) => {
                  setSessionLabel(e.target.value);
                  onSessionLabelChanged(e.target.value);
                }}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-2 font-medium"
                placeholder="e.g. Regular, SL, English"
              />
            </div>
          </div>
        )}
      </div>

      {/* Column Mapping Section */}
      {availableHeaders.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Column Header Mapping
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Roll / ID Column (Optional):
              </label>
              <select
                value={colRoll}
                onChange={(e) => setColRoll(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-2 font-medium"
              >
                {availableHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Student Name Column:
              </label>
              <select
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-2 font-medium"
              >
                {availableHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                {sessionType === "Second Language"
                  ? "Second Language Column (SL):"
                  : "Division Column (S1-S7, class/stream):"}
              </label>
              <select
                disabled={singleGroup}
                value={colDivision}
                onChange={(e) => setColDivision(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-2 font-medium disabled:opacity-50"
              >
                {availableHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Admission No. Column (Optional):
              </label>
              <select
                value={colAdmn}
                onChange={(e) => setColAdmn(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-2 font-medium"
              >
                <option value="(none)">(none)</option>
                {availableHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={singleGroup}
                onChange={(e) => setSingleGroup(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span>
                Treat everyone as ONE single group (English exam day only — everyone takes same paper)
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Custom Schedule Panel */}
      {sessionType === "Custom" && (
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Custom Exam Date & Subject Schedule
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-600">Exam Date:</label>
            <input
              type="text"
              value={customDate}
              onChange={(e) => handleDateChange(e.target.value)}
              placeholder="e.g. 15-08-2026 or Day 1"
              className="bg-white border border-slate-300 text-slate-800 text-sm rounded-xl p-2 w-64 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.keys(customDivs).map((divCode) => (
              <div key={divCode} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 min-w-[80px]">
                  <input
                    type="checkbox"
                    checked={customDivs[divCode].enabled}
                    onChange={(e) =>
                      setCustomDivs((prev) => ({
                        ...prev,
                        [divCode]: { ...prev[divCode], enabled: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  Div {divCode}
                </label>

                <input
                  type="text"
                  disabled={!customDivs[divCode].enabled}
                  value={customDivs[divCode].subject}
                  onChange={(e) =>
                    setCustomDivs((prev) => ({
                      ...prev,
                      [divCode]: { ...prev[divCode], subject: e.target.value },
                    }))
                  }
                  placeholder="Subject"
                  className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-1.5 font-medium disabled:opacity-40"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button & Status Output */}
      <div className="space-y-4">
        <button
          onClick={handleLoadStudents}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
        >
          <span>Load Students & Continue</span>
          <span>→</span>
        </button>

        {statusMsg && (
          <div
            className={`p-4 rounded-xl text-xs font-mono leading-relaxed whitespace-pre-line border ${
              statusMsg.type === "error"
                ? "bg-red-50 text-red-800 border-red-200"
                : statusMsg.type === "warning"
                ? "bg-amber-50 text-amber-900 border-amber-200"
                : "bg-emerald-50 text-emerald-900 border-emerald-200"
            }`}
          >
            {statusMsg.text}
          </div>
        )}
      </div>
    </div>
  );
}
