import React, { useState } from "react";
import { Navbar } from "./components/Navbar";
import { HomeDashboard } from "./components/HomeDashboard";
import { StepNavigator } from "./components/StepNavigator";
import { Step1LoadData } from "./components/Step1LoadData";
import { Step2Rooms } from "./components/Step2Rooms";
import { Step3Generate } from "./components/Step3Generate";
import { Step4Export } from "./components/Step4Export";
import { ResultAnalysisView } from "./components/ResultAnalysis/ResultAnalysisView";
import { PlusTwoResultAnalysisView } from "./components/PlusTwoResultAnalysis/PlusTwoResultAnalysisView";

export default function App() {
  const [activeTool, setActiveTool] = useState("home"); // 'home' | 'seating' | 'result' | 'plusTwoResult'
  const [currentSeatingStep, setCurrentSeatingStep] = useState(0);

  // Seating Generator State
  const [students, setStudents] = useState([]);
  const [sessionType, setSessionType] = useState("Regular Subjects");
  const [sessionLabel, setSessionLabel] = useState("Regular");
  const [customDate, setCustomDate] = useState("");
  const [rooms, setRooms] = useState([]);
  const [divisionBatches, setDivisionBatches] = useState(null);
  const [seatingResult, setSeatingResult] = useState(null);

  const completedSeatingSteps = {
    0: students.length > 0,
    1: rooms.length > 0,
    2: seatingResult !== null,
    3: seatingResult !== null,
  };

  const handleStudentsLoaded = (loadedStudents) => {
    setStudents(loadedStudents);
    setSeatingResult(null);
    setCurrentSeatingStep(1);
  };

  const handleRoomsSaved = (configuredRooms) => {
    setRooms(configuredRooms);
    setSeatingResult(null);
    setCurrentSeatingStep(2);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased">
      <Navbar
        activeTool={activeTool}
        onSelectTool={(tool) => setActiveTool(tool)}
        studentCount={students.length}
        roomCount={rooms.length}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto flex my-6 px-4 gap-6">
        {/* HOME DASHBOARD */}
        {activeTool === "home" && (
          <div className="w-full">
            <HomeDashboard onSelectTool={(tool) => setActiveTool(tool)} />
          </div>
        )}

        {/* FEATURE 1: SEATING ARRANGEMENT GENERATOR */}
        {activeTool === "seating" && (
          <>
            <StepNavigator
              currentStep={currentSeatingStep}
              onStepClick={(stepId) => setCurrentSeatingStep(stepId)}
              completedSteps={completedSeatingSteps}
            />

            <main className="flex-1 bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 overflow-y-auto">
              {currentSeatingStep === 0 && (
                <Step1LoadData
                  onStudentsLoaded={handleStudentsLoaded}
                  onSessionTypeChanged={(st) => setSessionType(st)}
                  onSessionLabelChanged={(sl) => setSessionLabel(sl)}
                  onCustomDateChanged={(cd) => setCustomDate(cd)}
                  currentStudents={students}
                />
              )}

              {currentSeatingStep === 1 && (
                <Step2Rooms
                  onRoomsSaved={handleRoomsSaved}
                  onBatchesSaved={(b) => setDivisionBatches(b)}
                  studentCount={students.length}
                  sessionType={sessionType}
                  currentRooms={rooms}
                  currentBatches={divisionBatches}
                />
              )}

              {currentSeatingStep === 2 && (
                <Step3Generate
                  students={students}
                  rooms={rooms}
                  divisionBatches={divisionBatches}
                  onResultGenerated={(res) => setSeatingResult(res)}
                  currentResult={seatingResult}
                />
              )}

              {currentSeatingStep === 3 && (
                <Step4Export
                  result={seatingResult}
                  rooms={rooms}
                  sessionType={sessionType}
                  sessionLabel={sessionLabel}
                  customDate={customDate}
                />
              )}
            </main>
          </>
        )}

        {/* FEATURE 2: +1 RESULT ANALYSIS 2026 */}
        {activeTool === "result" && (
          <main className="w-full bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 overflow-y-auto">
            <ResultAnalysisView />
          </main>
        )}

        {/* FEATURE 3: +2 RESULT ANALYSIS 2026 */}
        {activeTool === "plusTwoResult" && (
          <main className="w-full bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 overflow-y-auto">
            <PlusTwoResultAnalysisView />
          </main>
        )}
      </div>

      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-900">
        PKMMHSS Edarikode Academic Portal 
      </footer>
    </div>
  );
}
