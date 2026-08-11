import React, { useState } from "react";
import { PlayCircle, AlertTriangle, CheckCircle2, LayoutGrid, Table, Eye } from "lucide-react";
import {
  assignSeats,
  attachSeatLabels,
  verifyNoAdjacentSameDivision,
} from "../utils/seatingLogic";
import { formatStudentDivision, seatLabel } from "../utils/constants";
import { BenchGrid } from "./BenchGrid";

export function Step3Generate({
  students,
  rooms,
  divisionBatches,
  onResultGenerated,
  currentResult,
}) {
  const [result, setResult] = useState(currentResult);
  const [selectedRoomName, setSelectedRoomName] = useState(rooms[0]?.name || "");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [warningsList, setWarningsList] = useState([]);
  const [violationsList, setViolationsList] = useState([]);

  const handleGenerate = () => {
    if (!students || students.length === 0) {
      alert("Please load student data in Step 1 first.");
      return;
    }
    if (!rooms || rooms.length === 0) {
      alert("Please configure rooms in Step 2 first.");
      return;
    }

    const res = assignSeats(students, rooms, divisionBatches);
    attachSeatLabels(res, rooms);
    const violations = verifyNoAdjacentSameDivision(res, rooms);

    setResult(res);
    setWarningsList(res.warnings || []);
    setViolationsList(violations || []);
    onResultGenerated(res);

    if (rooms.length > 0) {
      setSelectedRoomName(rooms[0].name);
    }
  };

  const selectedRoom = rooms.find((r) => r.name === selectedRoomName) || rooms[0];
  const byRoom = result ? result.byRoom() : {};
  const roomSeats = selectedRoom ? byRoom[selectedRoom.name] || [] : [];

  // Group seats for data table view
  const byBench = {};
  for (const a of roomSeats) {
    if (!byBench[a.benchNo]) byBench[a.benchNo] = {};
    byBench[a.benchNo][a.column] = a;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <PlayCircle className="w-6 h-6 text-indigo-600" />
          Step 3 - Generate & Preview
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Run seating arrangement generator algorithm, check separation verification, and preview room layouts.
        </p>
      </div>

      {/* Trigger Button */}
      <div>
        <button
          onClick={handleGenerate}
          className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition flex items-center gap-2"
        >
          <PlayCircle className="w-5 h-5" />
          <span>Generate Seating Arrangement</span>
        </button>
      </div>

      {/* Warnings & Verification Banner */}
      {result && (
        <div className="space-y-3">
          {violationsList.length > 0 ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-mono text-red-900 space-y-1">
              <div className="font-bold flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                INTERNAL CHECK FAILED: {violationsList.length} adjacency violation(s) found.
              </div>
              {violationsList.slice(0, 5).map((v, i) => (
                <div key={i}>• {v}</div>
              ))}
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>✓ Verified: No two adjacent seats share the same paper/group in any bench across all rooms.</span>
            </div>
          )}

          {warningsList.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs font-mono text-amber-900 space-y-1">
              <div className="font-bold text-amber-800">Algorithm Logs & Warnings:</div>
              {warningsList.map((w, i) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Section */}
      {result && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-indigo-600" />
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Preview Room:
              </label>
              <select
                value={selectedRoomName}
                onChange={(e) => setSelectedRoomName(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-2 font-semibold"
              >
                {rooms.map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Visual Bench Grid
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                Data Table
              </button>
            </div>
          </div>

          {/* Render selected view */}
          {selectedRoom && (
            <div>
              {viewMode === "grid" ? (
                <BenchGrid room={selectedRoom} seats={roomSeats} />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                      <tr>
                        <th className="p-3 border-r border-slate-200 w-16 text-center">Bench</th>
                        {Array.from({ length: selectedRoom.seatsPerBench }, (_, c) => c + 1).map((col) => (
                          <th key={col} className="p-3 border-r border-slate-200">
                            {seatLabel(col, selectedRoom.seatsPerBench)} Seat
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.from({ length: selectedRoom.numBenches }, (_, i) => i + 1).map((benchNo) => {
                        const cols = byBench[benchNo] || {};

                        return (
                          <tr key={benchNo} className="hover:bg-slate-50/80">
                            <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-500">
                              {benchNo}
                            </td>
                            {Array.from({ length: selectedRoom.seatsPerBench }, (_, c) => c + 1).map((col) => {
                              const a = cols[col];
                              const s = a?.student;

                              return (
                                <td key={col} className="p-3 border-r border-slate-200 min-w-[180px]">
                                  {s ? (
                                    <div>
                                      <div className="font-bold text-slate-800">{s.name}</div>
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        Roll #{s.rollNo} · {formatStudentDivision(s)}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 italic">(Empty)</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
