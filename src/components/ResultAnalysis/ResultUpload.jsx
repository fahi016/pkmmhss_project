import React, { useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, PlayCircle } from "lucide-react";
import { readWorkbookFromFile } from "../../utils/excelParser";
import { processResultAnalysis } from "../../utils/resultAnalysisLogic";

export function ResultUpload({ onAnalysisComplete }) {
  const [resultFile, setResultFile] = useState(null);
  const [divisionFile, setDivisionFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleProcess = async () => {
    if (!resultFile) {
      setErrorMsg("Please choose the result Excel file ('plus_one_result.xlsx' or 'result.xlsx').");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const resultWb = await readWorkbookFromFile(resultFile);
      let divisionWb = null;
      if (divisionFile) {
        divisionWb = await readWorkbookFromFile(divisionFile);
      }

      const analysisData = processResultAnalysis(resultWb, divisionWb);
      setIsLoading(false);
      onAnalysisComplete(analysisData);
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(`Error processing files: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
          Upload +1 Result Data
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Upload your result spreadsheet (`plus_one_result.xlsx` or `result.xlsx`) and optional division mapping file (`division.xlsx`).
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Main Result File Dropzone */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            1. Main Result Excel File (Required)
          </label>
          <label className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40 rounded-2xl p-6 transition text-center flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-800">
              {resultFile ? resultFile.name : "Click or drop plus_one_result.xlsx / result.xlsx file"}
            </span>
            <span className="text-xs text-slate-400">
              Contains: school, regno, group, name, s1..s6 subjects, CE, TE, Total
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setResultFile(e.target.files[0])}
              className="hidden"
            />
          </label>
        </div>

        {/* Optional Division Mapping Dropzone */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            2. Division Mapping File (Optional)
          </label>
          <label className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/40 rounded-2xl p-5 transition text-center flex flex-col items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-indigo-500" />
            <span className="text-xs font-semibold text-slate-700">
              {divisionFile ? divisionFile.name : "Click or drop division.xlsx (REG_NO, NAME, DIVISION)"}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setDivisionFile(e.target.files[0])}
              className="hidden"
            />
          </label>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs font-mono rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleProcess}
          disabled={isLoading}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
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
