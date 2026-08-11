import React from "react";
import { Award, LayoutGrid, GraduationCap, Home, School } from "lucide-react";

export function Navbar({ activeTool, onSelectTool, studentCount, roomCount }) {
  return (
    <header className="glass-nav border-b border-slate-800 bg-slate-950/90 text-white backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Header */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTool("home")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <School className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-snug tracking-tight text-white flex items-center gap-2">
              PKMM HSS Portal
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                2026
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              School Exam & Academic Analytics Suite
            </p>
          </div>
        </div>

        {/* Center Tool Switcher Tabs */}
        <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
          <button
            onClick={() => onSelectTool("home")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTool === "home" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            Home
          </button>
          <button
            onClick={() => onSelectTool("seating")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTool === "seating" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Seating Generator
          </button>
          <button
            onClick={() => onSelectTool("result")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTool === "result" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            +1 Result Analysis
          </button>
          <button
            onClick={() => onSelectTool("plusTwoResult")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTool === "plusTwoResult" ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            +2 Result Analysis
          </button>
        </div>

        {/* Quick Stats */}
        {activeTool === "seating" && (
          <div className="flex items-center gap-3 text-xs font-medium">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <span>Students: <strong className="text-white">{studentCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <span>Rooms: <strong className="text-white">{roomCount}</strong></span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
