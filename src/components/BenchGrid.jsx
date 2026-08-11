import React from "react";
import { User, CheckCircle, ShieldAlert } from "lucide-react";
import { formatStudentDivision, seatLabel } from "../utils/constants";

const DIVISION_COLORS = {
  S1: "bg-emerald-100 text-emerald-800 border-emerald-300",
  S2: "bg-emerald-100 text-emerald-800 border-emerald-300",
  S3: "bg-emerald-100 text-emerald-800 border-emerald-300",
  S4: "bg-emerald-100 text-emerald-800 border-emerald-300",
  S5: "bg-cyan-100 text-cyan-800 border-cyan-300",
  S6: "bg-amber-100 text-amber-800 border-amber-300",
  S7: "bg-purple-100 text-purple-800 border-purple-300",
  A: "bg-rose-100 text-rose-800 border-rose-300",
  H: "bg-orange-100 text-orange-800 border-orange-300",
  M: "bg-blue-100 text-blue-800 border-blue-300",
  U: "bg-teal-100 text-teal-800 border-teal-300",
};

export function BenchGrid({ room, seats }) {
  if (!room) return null;

  // Group seats by bench_no
  const byBench = {};
  for (const a of seats) {
    if (!byBench[a.benchNo]) byBench[a.benchNo] = {};
    byBench[a.benchNo][a.column] = a;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-xl">
        <div>
          <h3 className="font-bold text-base">{room.name}</h3>
          <p className="text-xs text-slate-400">
            {room.numBenches} benches × {room.seatsPerBench} seats ({room.capacity} total capacity)
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-lg text-emerald-300 border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Bucket 0 (Odd Seats)
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-lg text-indigo-300 border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Bucket 1 (Even Seats)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: room.numBenches }, (_, i) => i + 1).map((benchNo) => {
          const cols = byBench[benchNo] || {};

          return (
            <div
              key={benchNo}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Bench #{benchNo}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Row {benchNo}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {Array.from({ length: room.seatsPerBench }, (_, c) => c + 1).map((col) => {
                  const assignment = cols[col];
                  const student = assignment?.student;
                  const isBucket0 = (col - 1) % 2 === 0;

                  const divTag = student?.division || "";
                  const colorClass =
                    DIVISION_COLORS[divTag] ||
                    "bg-slate-100 text-slate-700 border-slate-300";

                  return (
                    <div
                      key={col}
                      className={`p-2.5 rounded-xl border flex flex-col justify-between min-h-[90px] transition ${
                        isBucket0 ? "bg-slate-50/80 border-slate-200" : "bg-indigo-50/40 border-indigo-100"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-semibold uppercase tracking-wider">
                          {seatLabel(col, room.seatsPerBench)}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full ${isBucket0 ? "bg-emerald-400" : "bg-indigo-400"}`} />
                      </div>

                      {student ? (
                        <div className="space-y-1 my-1">
                          <div className="font-semibold text-xs text-slate-800 leading-tight truncate" title={student.name}>
                            {student.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Roll #{student.rollNo}
                          </div>
                          <div className="pt-0.5">
                            <span className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${colorClass} truncate max-w-full`}>
                              {formatStudentDivision(student)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-2 text-slate-300">
                          <span className="text-[10px] italic">Empty Spacer</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
