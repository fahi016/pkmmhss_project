import React, { useState } from "react";
import {
  Award,
  Users,
  CheckCircle,
  XCircle,
  Percent,
  FileText,
  FileSpreadsheet,
  ArrowLeft,
  Search,
  BookOpen,
} from "lucide-react";
import { generatePdfReport } from "../../utils/pdfGenerator";
import { exportResultAnalysisExcel } from "../../utils/excelResultExporter";
import {
  rankSort,
  shortenGroup,
  toTitleCase,
  subjectsForStream,
  getSubjectRanklist,
  getSubjectAplusSummary,
} from "../../utils/resultAnalysisLogic";

export function ResultDashboard({ analysisData, onReset }) {
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'failed' | 'top10' | 'aplus' | 'groupRanks' | 'classRanks' | 'subjectRanks' | 'aplusSummary'
  const [selectedGroup, setSelectedGroup] = useState("BIO SCIENCE");
  const [selectedStream, setSelectedStream] = useState("SCIENCE");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDivision, setSelectedDivision] = useState(
    analysisData.divisionsPresent[0] || "S1"
  );
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleExportPdf = () => {
    generatePdfReport(analysisData, "2026");
  };

  const handleExportExcel = () => {
    exportResultAnalysisExcel(analysisData, "PlusOne_Result_Analysis_2026.xlsx");
  };

  // Filter students by search
  const filteredStudents = students.filter((s) => {
    return (
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.regno.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.division.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Subjects for selected stream
  const availableStreamSubjects = subjectsForStream(students, selectedStream);
  const activeSubjectName = selectedSubject || availableStreamSubjects[0] || "";

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Upload Different File"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{schoolName}</h2>
            <p className="text-xs text-slate-500 font-medium">
              Plus One Result Analysis 2026 · {totalStudents} Students Evaluated
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-red-600/20 transition flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            Export Full PDF Report
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel Workbook
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Registered</div>
          <div className="text-xl font-extrabold text-slate-800 mt-1">{totalStudents}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Passed (EHS)</div>
          <div className="text-xl font-extrabold text-emerald-800 mt-1">{ehsCount}</div>
        </div>
        <div className="bg-red-50 border border-red-200 p-3.5 rounded-2xl">
          <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Failed (NHS)</div>
          <div className="text-xl font-extrabold text-red-800 mt-1">{nhsCount}</div>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl">
          <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Pass %</div>
          <div className="text-xl font-extrabold text-indigo-800 mt-1">{passPct}%</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-2xl">
          <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Full A+ (6 A+)</div>
          <div className="text-xl font-extrabold text-purple-800 mt-1">{fullAPlusCount}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">5 A+</div>
          <div className="text-xl font-extrabold text-amber-800 mt-1">{fiveAPlusCount}</div>
        </div>
        <div className="bg-cyan-50 border border-cyan-200 p-3.5 rounded-2xl">
          <div className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider">4 A+</div>
          <div className="text-xl font-extrabold text-cyan-800 mt-1">{fourAPlusCount}</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        {[
          { id: "overview", label: "📊 School Overview" },
          { id: "failed", label: `❌ Failed List (${failedStudentsList.length})` },
          { id: "top10", label: "🏆 Top 10 Stream Achievers" },
          { id: "aplus", label: "⭐ Full A+ & 5 A+ Lists" },
          { id: "groupRanks", label: "📋 Stream Rank Lists" },
          { id: "classRanks", label: "🏫 Class Division Ranks" },
          { id: "subjectRanks", label: "📚 Subject Rank Lists" },
          { id: "aplusSummary", label: "🎯 Subject A+ Summary" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl transition ${
              activeTab === tab.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
              Groupwise Result Summary Table
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-900 text-white font-semibold">
                  <tr>
                    <th className="p-3">Group</th>
                    <th className="p-3 text-center">Attended</th>
                    <th className="p-3 text-center">Pass (EHS)</th>
                    <th className="p-3 text-center">Fail (NHS)</th>
                    <th className="p-3 text-center">Full A+</th>
                    <th className="p-3 text-center">5 A+</th>
                    <th className="p-3 text-center">4 A+</th>
                    <th className="p-3 text-center">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {groupwiseStats.map((g) => (
                    <tr key={g.group} className="hover:bg-slate-50">
                      <td className="p-3 font-bold">{g.group}</td>
                      <td className="p-3 text-center">{g.attended}</td>
                      <td className="p-3 text-center text-emerald-700 font-bold">{g.ehs}</td>
                      <td className="p-3 text-center text-red-600 font-bold">{g.nhs}</td>
                      <td className="p-3 text-center">{g.full_ap}</td>
                      <td className="p-3 text-center">{g.five_ap}</td>
                      <td className="p-3 text-center">{g.four_ap}</td>
                      <td className="p-3 text-center font-bold text-indigo-600">{g.pct}%</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="p-3">TOTAL</td>
                    <td className="p-3 text-center">{totalStudents}</td>
                    <td className="p-3 text-center text-emerald-700">{ehsCount}</td>
                    <td className="p-3 text-center text-red-600">{nhsCount}</td>
                    <td className="p-3 text-center">{fullAPlusCount}</td>
                    <td className="p-3 text-center">{fiveAPlusCount}</td>
                    <td className="p-3 text-center">{fourAPlusCount}</td>
                    <td className="p-3 text-center text-indigo-700">{passPct}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-500 italic text-right">
              *Absent treated as Fail.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: FAILED LIST */}
      {activeTab === "failed" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider text-red-700">
              List of Failed Students ({failedStudentsList.length})
            </h3>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3 w-28">Reg No</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3 w-16 text-center">Div</th>
                  <th className="p-3 w-32">Group</th>
                  <th className="p-3 text-red-600">Failed Subject(s)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {failedStudentsList.map((f, idx) => (
                  <tr key={idx} className="bg-red-50/50 hover:bg-red-100/50">
                    <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-mono">{f.regno}</td>
                    <td className="p-3 font-bold text-slate-800">{toTitleCase(f.name)}</td>
                    <td className="p-3 text-center">{f.division}</td>
                    <td className="p-3">{f.group}</td>
                    <td className="p-3 font-bold text-red-700">{f.failedSubjects}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TOP 10 ACHIEVERS */}
      {activeTab === "top10" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 uppercase">Select Stream:</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800"
            >
              <option value="BIO SCIENCE">BIO SCIENCE</option>
              <option value="COMPUTER SCIENCE">COMPUTER SCIENCE</option>
              <option value="COMMERCE">COMMERCE</option>
              <option value="HUMANITIES">HUMANITIES</option>
            </select>
          </div>

          {(() => {
            const top10 = rankSort(
              students.filter((s) => s.subGroup === selectedGroup)
            ).slice(0, 10);

            if (top10.length === 0) return <div className="text-xs text-slate-500">No students in group.</div>;

            return (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="p-2.5 text-center">Rank</th>
                      <th className="p-2.5">Reg No</th>
                      <th className="p-2.5">Student Name</th>
                      <th className="p-2.5 text-center">Div</th>
                      {top10[0].subjects.map((sub, idx) => (
                        <th key={idx} className="p-2.5 text-center">
                          {idx === 1 ? "SL" : sub.subName.slice(0, 4)}
                        </th>
                      ))}
                      <th className="p-2.5 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {top10.map((s, idx) => (
                      <tr key={s.regno} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center font-bold text-indigo-600">#{idx + 1}</td>
                        <td className="p-2.5 font-mono">{s.regno}</td>
                        <td className="p-2.5 font-bold text-slate-800">{toTitleCase(s.name)}</td>
                        <td className="p-2.5 text-center">{s.division || "-"}</td>
                        {s.subjects.map((sub, i) => (
                          <td key={i} className="p-2.5 text-center">
                            {sub.total} <span className="text-[10px] text-purple-600">({sub.grade})</span>
                          </td>
                        ))}
                        <td className="p-2.5 text-center font-bold text-emerald-700">{s.totalMarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 7: SUBJECT RANK LISTS */}
      {activeTab === "subjectRanks" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase">Stream:</span>
              <select
                value={selectedStream}
                onChange={(e) => {
                  setSelectedStream(e.target.value);
                  const subs = subjectsForStream(students, e.target.value);
                  setSelectedSubject(subs[0] || "");
                }}
                className="bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800"
              >
                <option value="SCIENCE">SCIENCE</option>
                <option value="COMMERCE">COMMERCE</option>
                <option value="HUMANITIES">HUMANITIES</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase">Subject:</span>
              <select
                value={activeSubjectName}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800"
              >
                {availableStreamSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(() => {
            const subjectRanklist = getSubjectRanklist(students, selectedStream, activeSubjectName);

            if (subjectRanklist.length === 0)
              return <div className="text-xs text-slate-500">No records found for subject.</div>;

            return (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="p-2.5 text-center">Rank</th>
                      <th className="p-2.5">Reg No</th>
                      <th className="p-2.5">Student Name</th>
                      <th className="p-2.5 text-center">Div</th>
                      <th className="p-2.5 text-center">CE</th>
                      <th className="p-2.5 text-center">TE</th>
                      <th className="p-2.5 text-center">Total</th>
                      <th className="p-2.5 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {subjectRanklist.map((r, idx) => (
                      <tr
                        key={r.regno}
                        className={r.failed ? "bg-red-50/70 hover:bg-red-100/50" : "hover:bg-slate-50"}
                      >
                        <td className="p-2.5 text-center font-bold text-slate-500">#{idx + 1}</td>
                        <td className="p-2.5 font-mono">{r.regno}</td>
                        <td className="p-2.5 font-bold text-slate-800">{r.name}</td>
                        <td className="p-2.5 text-center">{r.division}</td>
                        <td className="p-2.5 text-center">{r.ce}</td>
                        <td className="p-2.5 text-center">{r.te}</td>
                        <td className="p-2.5 text-center font-bold">{r.total}</td>
                        <td className="p-2.5 text-center font-bold text-purple-700">{r.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 8: SUBJECT A+ ACHIEVERS SUMMARY */}
      {activeTab === "aplusSummary" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
            Subject-wise A+ Achievers Summary
          </h3>

          {(() => {
            const summaryRows = getSubjectAplusSummary(students);

            return (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="p-3 text-center">#</th>
                      <th className="p-3">Stream</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3 text-center">Appeared</th>
                      <th className="p-3 text-center">A+ Count</th>
                      <th className="p-3 text-center">A+ %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {summaryRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-semibold">{r.stream}</td>
                        <td className="p-3 font-bold text-slate-800">{r.subject}</td>
                        <td className="p-3 text-center">{r.appeared}</td>
                        <td className="p-3 text-center font-bold text-purple-700">{r.aplus}</td>
                        <td className="p-3 text-center font-bold text-emerald-700">{r.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
