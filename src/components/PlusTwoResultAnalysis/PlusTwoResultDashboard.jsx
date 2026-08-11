import React, { useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { generatePlusTwoPdfReport } from "../../utils/plusTwoPdfGenerator";
import {
  PLUS_TWO_GROUPS,
  buildSubjectHeaders,
  calculateMaxMarkPercentage,
  getAPlusStudents,
  getTop10Students,
} from "../../utils/plusTwoResultAnalysisLogic";

function StudentMarksTable({ students }) {
  if (students.length === 0) {
    return <div className="text-xs text-slate-500">No students found for the selected group.</div>;
  }

  const subjectHeaders = buildSubjectHeaders(students);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left border-collapse text-xs">
        <thead className="bg-slate-900 text-white font-bold">
          <tr>
            <th className="p-2.5 text-center">Rank</th>
            <th className="p-2.5">Reg No</th>
            <th className="p-2.5">Student Name</th>
            {subjectHeaders.map((header) => (
              <th key={header} className="p-2.5 text-center">
                {header}
              </th>
            ))}
            <th className="p-2.5 text-center">Total</th>
            <th className="p-2.5 text-center">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium">
          {students.map((student, index) => (
            <tr key={`${student.regno}-${index}`} className="hover:bg-slate-50">
              <td className="p-2.5 text-center font-bold text-indigo-600">#{index + 1}</td>
              <td className="p-2.5 font-mono">{student.regno}</td>
              <td className="p-2.5 font-bold text-slate-800">{student.titleName}</td>
              {student.subjects.map((subject) => (
                <td key={`${student.regno}-${subject.index}`} className="p-2.5 text-center">
                  {subject.total}
                </td>
              ))}
              <td className="p-2.5 text-center font-bold text-emerald-700">
                {student.totalMarks}
              </td>
              <td className="p-2.5 text-center font-bold text-slate-700">
                {calculateMaxMarkPercentage(student.totalMarks)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PlusTwoResultDashboard({ analysisData, onReset }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedGroup, setSelectedGroup] = useState("BIO SCIENCE");
  const [selectedAPlusCount, setSelectedAPlusCount] = useState(6);

  const {
    schoolName,
    totalStudents,
    ehsCount,
    nhsCount,
    passPct,
    fullAPlusCount,
    fiveAPlusCount,
    fourAPlusCount,
    groupwiseStats,
    failedStudentsList,
    students,
  } = analysisData;

  const top10Students = getTop10Students(students, selectedGroup);
  const achieverStudents = getAPlusStudents(students, selectedGroup, selectedAPlusCount);

  return (
    <div className="space-y-6">
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
              Plus Two Result Analysis 2026 · {totalStudents} Students Evaluated
            </p>
          </div>
        </div>

        <button
          onClick={() => generatePlusTwoPdfReport(analysisData)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-red-600/20 transition flex items-center gap-1.5"
        >
          <FileText className="w-4 h-4" />
          Export Full PDF Report
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Registered</div>
          <div className="text-xl font-extrabold text-slate-800 mt-1">{totalStudents}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">EHS</div>
          <div className="text-xl font-extrabold text-emerald-800 mt-1">{ehsCount}</div>
        </div>
        <div className="bg-red-50 border border-red-200 p-3.5 rounded-2xl">
          <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">NHS</div>
          <div className="text-xl font-extrabold text-red-800 mt-1">{nhsCount}</div>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl">
          <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">EHS %</div>
          <div className="text-xl font-extrabold text-indigo-800 mt-1">{passPct}%</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-2xl">
          <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Full A+</div>
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

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        {[
          { id: "overview", label: "School Overview" },
          { id: "failed", label: `Failed List (${failedStudentsList.length})` },
          { id: "top10", label: "Top 10 Students" },
          { id: "aplus", label: "Full A+ and 5 A+ Lists" },
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

      {activeTab === "overview" && (
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
                  <th className="p-3 text-center">EHS</th>
                  <th className="p-3 text-center">NHS</th>
                  <th className="p-3 text-center">Full A+</th>
                  <th className="p-3 text-center">5A+</th>
                  <th className="p-3 text-center">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {groupwiseStats.map((groupStat) => (
                  <tr key={groupStat.group} className="hover:bg-slate-50">
                    <td className="p-3 font-bold">{groupStat.shortGroup}</td>
                    <td className="p-3 text-center">{groupStat.attended}</td>
                    <td className="p-3 text-center text-emerald-700 font-bold">{groupStat.ehs}</td>
                    <td className="p-3 text-center text-red-600 font-bold">{groupStat.nhs}</td>
                    <td className="p-3 text-center">{groupStat.full_ap}</td>
                    <td className="p-3 text-center">{groupStat.five_ap}</td>
                    <td className="p-3 text-center font-bold text-indigo-600">{groupStat.pct}%</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td className="p-3">TOTAL</td>
                  <td className="p-3 text-center">{totalStudents}</td>
                  <td className="p-3 text-center text-emerald-700">{ehsCount}</td>
                  <td className="p-3 text-center text-red-600">{nhsCount}</td>
                  <td className="p-3 text-center">{fullAPlusCount}</td>
                  <td className="p-3 text-center">{fiveAPlusCount}</td>
                  <td className="p-3 text-center text-indigo-700">{passPct}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-500 italic text-right">
            *Absent students treated as NHS.
          </p>
        </div>
      )}

      {activeTab === "failed" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider text-red-700">
            List of Failed Students ({failedStudentsList.length})
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3 w-28">Reg No</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3 w-32">Group</th>
                  <th className="p-3 text-red-600">Failed Subject(s)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {failedStudentsList.map((student, index) => (
                  <tr key={`${student.regno}-${index}`} className="bg-red-50/50 hover:bg-red-100/50">
                    <td className="p-3 text-center font-bold text-slate-400">{index + 1}</td>
                    <td className="p-3 font-mono">{student.regno}</td>
                    <td className="p-3 font-bold text-slate-800">{student.name}</td>
                    <td className="p-3">{student.group}</td>
                    <td className="p-3 font-bold text-red-700">{student.failedSubjects}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "top10" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 uppercase">Select Group:</span>
            <select
              value={selectedGroup}
              onChange={(event) => setSelectedGroup(event.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800"
            >
              {PLUS_TWO_GROUPS.map((groupName) => (
                <option key={groupName} value={groupName}>
                  {groupName}
                </option>
              ))}
            </select>
          </div>

          <StudentMarksTable students={top10Students} />
        </div>
      )}

      {activeTab === "aplus" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600 uppercase">Select Group:</span>
              <select
                value={selectedGroup}
                onChange={(event) => setSelectedGroup(event.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800"
              >
                {PLUS_TWO_GROUPS.map((groupName) => (
                  <option key={groupName} value={groupName}>
                    {groupName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600 uppercase">List Type:</span>
              <select
                value={selectedAPlusCount}
                onChange={(event) => setSelectedAPlusCount(Number(event.target.value))}
                className="bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800"
              >
                <option value={6}>Full A+ Students</option>
                <option value={5}>5 A+ Students</option>
              </select>
            </div>
          </div>

          <StudentMarksTable students={achieverStudents} />
        </div>
      )}
    </div>
  );
}
