import React, { useState } from "react";
import { ResultUpload } from "./ResultUpload";
import { ResultDashboard } from "./ResultDashboard";

export function ResultAnalysisView() {
  const [analysisData, setAnalysisData] = useState(null);

  return (
    <div className="w-full">
      {!analysisData ? (
        <ResultUpload onAnalysisComplete={(data) => setAnalysisData(data)} />
      ) : (
        <ResultDashboard
          analysisData={analysisData}
          onReset={() => setAnalysisData(null)}
        />
      )}
    </div>
  );
}
