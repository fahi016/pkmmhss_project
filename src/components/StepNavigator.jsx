import React from "react";
import { FileSpreadsheet, Building2, PlayCircle, FileCheck, CheckCircle2 } from "lucide-react";

export function StepNavigator({ currentStep, onStepClick, completedSteps }) {
  const steps = [
    { id: 0, title: "1. Load Data", desc: "Upload file & map columns", icon: FileSpreadsheet },
    { id: 1, title: "2. Configure Rooms", desc: "Benches, seats & batches", icon: Building2 },
    { id: 2, title: "3. Generate & Preview", desc: "Run algorithm & preview", icon: PlayCircle },
    { id: 3, title: "4. Export Reports", desc: "Download 4 Excel files", icon: FileCheck },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        <div className="px-3 pt-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workflow Steps
          </h2>
        </div>

        <nav className="space-y-2">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = completedSteps[step.id];

            return (
              <button
                key={step.id}
                onClick={() => onStepClick(step.id)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-start gap-3 border ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                    : "text-slate-300 border-transparent hover:bg-slate-800 hover:text-white"
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? "bg-indigo-500/40 text-white" : "bg-slate-800 text-slate-400"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm leading-tight truncate">{step.title}</span>
                    {isCompleted && !isActive && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 truncate ${isActive ? "text-indigo-100" : "text-slate-400"}`}>
                    {step.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs text-slate-400 space-y-1">
        <div className="font-medium text-slate-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Algorithm Status
        </div>
        <p>Adjacent seating separation active.</p>
      </div>
    </aside>
  );
}
