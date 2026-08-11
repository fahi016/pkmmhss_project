import React, { useState } from "react";
import { AlertCircle, FileSpreadsheet, PlayCircle, Upload } from "lucide-react";
import { readWorkbookFromFile } from "../../utils/excelParser";
import { processPlusTwoResultAnalysis } from "../../utils/plusTwoResultAnalysisLogic";

export function PlusTwoResultUpload({ onAnalysisComplete }) {
  const [resultFile, setResultFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleProcess = async () => {
    if (!resultFile) {
      setErrorMsg("Please choose the CSV result file ('RESULT ANALYSIS 25.csv').");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const resultWorkbook = await readWorkbookFromFile(resultFile);
      const analysisData = processPlusTwoResultAnalysis(resultWorkbook);
      setIsLoading(false);
      onAnalysisComplete(analysisData);
    } catch (error) {
      setIsLoading(false);
      setErrorMsg(`Error processing file: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-amber-600" />
          Upload +2 Result Data
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Upload the Plus Two CSV file (`RESULT ANALYSIS 25.csv`) to generate the
          dashboard and PDF report.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Result CSV File (Required)
          </label>
          <label className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50/40 rounded-2xl p-6 transition text-center flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 text-amber-600" />
            <span className="text-sm font-semibold text-slate-800">
              {resultFile ? resultFile.name : "Click or drop RESULT ANALYSIS 25.csv"}
            </span>
            <span className="text-xs text-slate-400">
              Expected order: RegNo, Group, Name, 6 subjects with Total, Grace, Written,
              Grade, and final EHS/NHS column
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setResultFile(event.target.files[0] || null)}
              className="hidden"
            />
          </label>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleProcess}
          disabled={isLoading}
          className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <span>Processing Result Analysis...</span>
          ) : (
            <>
              <PlayCircle className="w-5 h-5" />
              <span>Run Result Analysis & View Dashboard</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
