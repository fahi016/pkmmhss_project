import React, { useState, useEffect } from "react";
import { Building2, Plus, Trash2, Sparkles, AlertCircle, Save } from "lucide-react";
import { RoomConfig } from "../utils/seatingLogic";
import { parseDivisionList } from "../utils/constants";

export function Step2Rooms({
  onRoomsSaved,
  onBatchesSaved,
  studentCount,
  sessionType,
  currentRooms,
  currentBatches,
}) {
  const [roomRows, setRoomRows] = useState(
    currentRooms && currentRooms.length > 0
      ? currentRooms.map((r) => ({
          name: r.name,
          benches: String(r.numBenches),
          seats: String(r.seatsPerBench),
        }))
      : [{ name: "Room 1", benches: "15", seats: "3" }]
  );

  const [totalRoomsInput, setTotalRoomsInput] = useState(String(roomRows.length));

  // Division batches state
  const [useBatches, setUseBatches] = useState(
    currentBatches && currentBatches.length > 0
  );
  const [batchRows, setBatchRows] = useState(
    currentBatches && currentBatches.length > 0
      ? currentBatches.map((b) => b.join(", "))
      : ["S1, S2, S3, S5, S8", "S4, S6, S7"]
  );

  const [errorMsg, setErrorMsg] = useState("");

  const handleAddRoom = () => {
    const nextIdx = roomRows.length + 1;
    const newRows = [...roomRows, { name: `Room ${nextIdx}`, benches: "15", seats: "3" }];
    setRoomRows(newRows);
    setTotalRoomsInput(String(newRows.length));
  };

  const handleRemoveRoom = (idx) => {
    if (roomRows.length <= 1) {
      alert("At least one room is required.");
      return;
    }
    const newRows = roomRows.filter((_, i) => i !== idx);
    setRoomRows(newRows);
    setTotalRoomsInput(String(newRows.length));
  };

  const handleSetRoomCount = () => {
    const target = parseInt(totalRoomsInput, 10);
    if (isNaN(target) || target < 1) return;

    if (target > roomRows.length) {
      const diff = target - roomRows.length;
      const added = Array.from({ length: diff }, (_, i) => ({
        name: `Room ${roomRows.length + i + 1}`,
        benches: "15",
        seats: "3",
      }));
      setRoomRows([...roomRows, ...added]);
    } else if (target < roomRows.length) {
      setRoomRows(roomRows.slice(0, target));
    }
  };

  const handleLoadDefaultRooms = () => {
    const specs = [];
    for (let i = 1; i <= 10; i++) specs.push({ name: `Room ${i}`, benches: "15", seats: "3" });
    specs.push({ name: "Room 11", benches: "21", seats: "2" });
    specs.push({ name: "Room 12", benches: "21", seats: "2" });
    for (let i = 13; i <= 16; i++) specs.push({ name: `Room ${i}`, benches: "15", seats: "3" });

    setRoomRows(specs);
    setTotalRoomsInput("16");
  };

  // Calculate total capacity
  const totalCapacity = roomRows.reduce((sum, r) => {
    const b = parseInt(r.benches, 10) || 0;
    const s = parseInt(r.seats, 10) || 0;
    return sum + b * s;
  }, 0);

  // Batch management
  const handleAddBatch = () => {
    setBatchRows([...batchRows, ""]);
  };

  const handleRemoveBatch = (idx) => {
    if (batchRows.length <= 1) {
      alert("At least one batch is required when batch mode is active.");
      return;
    }
    setBatchRows(batchRows.filter((_, i) => i !== idx));
  };

  const handleLoadDefaultBatches = () => {
    setBatchRows(["S1, S2, S3, S5, S8", "S4, S6, S7"]);
  };

  const handleSave = () => {
    setErrorMsg("");

    try {
      const parsedRooms = roomRows.map((r, idx) => {
        const name = r.name.trim();
        const numBenches = parseInt(r.benches, 10);
        const seatsPerBench = parseInt(r.seats, 10);

        if (!name) throw new Error(`Room #${idx + 1} name cannot be empty.`);
        if (isNaN(numBenches) || numBenches <= 0)
          throw new Error(`Room '${name}' must have positive bench count.`);
        if (isNaN(seatsPerBench) || seatsPerBench <= 0)
          throw new Error(`Room '${name}' must have positive seat count.`);

        return new RoomConfig({ name, numBenches, seatsPerBench });
      });

      let parsedBatches = null;
      if (useBatches && sessionType === "Second Language") {
        parsedBatches = batchRows.map((b) => parseDivisionList(b)).filter((b) => b.length > 0);
        if (parsedBatches.length === 0) {
          throw new Error("Division batch mode is active but no divisions were entered.");
        }

        const seen = new Set();
        for (const batch of parsedBatches) {
          for (const d of batch) {
            if (seen.has(d)) throw new Error(`Division '${d}' appears in more than one batch.`);
            seen.add(d);
          }
        }
      }

      onRoomsSaved(parsedRooms);
      onBatchesSaved(parsedBatches);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Building2 className="w-6 h-6 text-indigo-600" />
          Step 2 - Configure Rooms
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Set number of rooms, benches, and seats per bench. Optionally configure division room batches.
        </p>
      </div>

      {/* Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600 uppercase">Total Rooms:</label>
          <input
            type="number"
            min="1"
            value={totalRoomsInput}
            onChange={(e) => setTotalRoomsInput(e.target.value)}
            className="w-16 bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-2 text-center font-medium"
          />
          <button
            onClick={handleSetRoomCount}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
          >
            Set
          </button>
          <button
            onClick={handleAddRoom}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </button>
        </div>

        <button
          onClick={handleLoadDefaultRooms}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition"
        >
          <Sparkles className="w-4 h-4" />
          Load Default 16-Room Setup
        </button>
      </div>

      {/* Room Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5 w-12 text-center">#</th>
                <th className="p-3.5">Room Name</th>
                <th className="p-3.5 w-32">Benches</th>
                <th className="p-3.5 w-32">Seats / Bench</th>
                <th className="p-3.5 w-36">Total Capacity</th>
                <th className="p-3.5 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {roomRows.map((row, idx) => {
                const b = parseInt(row.benches, 10) || 0;
                const s = parseInt(row.seats, 10) || 0;
                const cap = b * s;

                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="p-3.5">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => {
                          const updated = [...roomRows];
                          updated[idx].name = e.target.value;
                          setRoomRows(updated);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-800 focus:bg-white"
                      />
                    </td>
                    <td className="p-3.5">
                      <input
                        type="number"
                        min="1"
                        value={row.benches}
                        onChange={(e) => {
                          const updated = [...roomRows];
                          updated[idx].benches = e.target.value;
                          setRoomRows(updated);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-800 text-center"
                      />
                    </td>
                    <td className="p-3.5">
                      <input
                        type="number"
                        min="1"
                        value={row.seats}
                        onChange={(e) => {
                          const updated = [...roomRows];
                          updated[idx].seats = e.target.value;
                          setRoomRows(updated);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-800 text-center"
                      />
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">
                      = {cap} seats
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleRemoveRoom(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Remove Room"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Capacity Summary Footer */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between font-medium text-xs">
          <span>Total Room Capacity: <strong>{totalCapacity}</strong> seats</span>
          <span>Students Loaded: <strong>{studentCount}</strong></span>
          <span className={totalCapacity >= studentCount ? "text-emerald-400" : "text-amber-400"}>
            {totalCapacity >= studentCount
              ? "✓ Sufficient capacity available"
              : `⚠️ Deficit of ${studentCount - totalCapacity} seats`}
          </span>
        </div>
      </div>

      {/* Second Language Division Batches Section */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider cursor-pointer">
            <input
              type="checkbox"
              disabled={sessionType !== "Second Language"}
              checked={useBatches && sessionType === "Second Language"}
              onChange={(e) => setUseBatches(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            Split by Division Batches (Second Language mode only)
          </label>

          {sessionType === "Second Language" && useBatches && (
            <button
              onClick={handleLoadDefaultBatches}
              className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg hover:bg-purple-200 transition"
            >
              Default: S1-S3,S5,S8 | S4,S6,S7
            </button>
          )}
        </div>

        {sessionType === "Second Language" && useBatches && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-slate-500">
              Each batch uses its own block of rooms in list order (Batch 1 → first rooms, Batch 2 → next rooms).
            </p>

            {batchRows.map((batchStr, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-600 min-w-[70px]">Batch {idx + 1}:</span>
                <input
                  type="text"
                  value={batchStr}
                  onChange={(e) => {
                    const updated = [...batchRows];
                    updated[idx] = e.target.value;
                    setBatchRows(updated);
                  }}
                  placeholder="e.g. S1, S2, S3, S5, S8"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-800"
                />
                <button
                  onClick={() => handleRemoveBatch(idx)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <button
              onClick={handleAddBatch}
              className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300"
            >
              + Add Batch
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs font-mono rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
      >
        <Save className="w-4 h-4" />
        <span>Save Rooms & Continue →</span>
      </button>
    </div>
  );
}
