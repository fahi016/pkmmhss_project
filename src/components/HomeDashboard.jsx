import React from "react";
import { LayoutGrid, GraduationCap, ArrowRight, ShieldCheck, Award } from "lucide-react";

export function HomeDashboard({ onSelectTool }) {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-10">
      {/* Hero Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>PKMM HSS Edarikode Portal</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl leading-tight">
          School Management & Academic Analytics
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Select a tool below to generate exam seating arrangements or compute
          dedicated Plus One and Plus Two result analysis reports.
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pt-4">
        {/* Card 1: Exam Seating Generator */}
        <div
          onClick={() => onSelectTool("seating")}
          className="group relative bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/25 group-hover:scale-110 transition-transform duration-300">
              <LayoutGrid className="w-7 h-7 text-white" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Module 01
              </span>
              <h2 className="text-2xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                Exam Seating Generator
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Automatically allocate exam seats across rooms with physical bench-column division separation. Supports Regular Subjects, Second Language batches, English single-group, and Custom schedules.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Zero physically adjacent division collisions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Exports 4 styled Excel reports (`Seating`, `Notices`, `Attendance`, `Paper Count`)</span>
              </div>
            </div>
          </div>

          <div className="pt-8 flex items-center text-sm font-semibold text-indigo-400 group-hover:text-indigo-300 gap-2">
            <span>Launch Seating Generator</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: +1 Result Analysis */}
        <div
          onClick={() => onSelectTool("result")}
          className="group relative bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-600/25 group-hover:scale-110 transition-transform duration-300">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Module 02
              </span>
              <h2 className="text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                +1 Result Analysis 2026
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Upload result marks spreadsheet to generate complete pass/fail analytics, Full A+ & 5 A+ achiever lists, stream ranklists, class division rankings, failed subject list, and PDF/Excel reports.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>30% TE minimum pass criteria & 9-band grade engine</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Exports ReportLab-style PDF report & Excel analytics workbook</span>
              </div>
            </div>
          </div>

          <div className="pt-8 flex items-center text-sm font-semibold text-emerald-400 group-hover:text-emerald-300 gap-2">
            <span>Launch Result Analysis</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: +2 Result Analysis */}
        <div
          onClick={() => onSelectTool("plusTwoResult")}
          className="group relative bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-600/25 group-hover:scale-110 transition-transform duration-300">
              <Award className="w-7 h-7 text-white" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Module 03
              </span>
              <h2 className="text-2xl font-bold text-white group-hover:text-amber-300 transition-colors">
                +2 Result Analysis 2026
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Upload the Plus Two result CSV to generate school summary figures,
                failed student list, Top 10 group achievers, Full A+ lists, 5 A+
                lists, and the preserved PDF report.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Uses the original EHS/NHS and grade-letter based result rules</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Exports the Plus Two PDF summary from the preserved Python workflow</span>
              </div>
            </div>
          </div>

          <div className="pt-8 flex items-center text-sm font-semibold text-amber-400 group-hover:text-amber-300 gap-2">
            <span>Launch Result Analysis</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
