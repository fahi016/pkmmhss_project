import React, { useState } from "react";
import { PlusTwoResultDashboard } from "./PlusTwoResultDashboard";
import { PlusTwoResultUpload } from "./PlusTwoResultUpload";

export function PlusTwoResultAnalysisView() {
  const [analysisData, setAnalysisData] = useState(null);

  return (
    <div className="w-full">
      {!analysisData ? (
        <PlusTwoResultUpload onAnalysisComplete={(data) => setAnalysisData(data)} />
      ) : (
        <PlusTwoResultDashboard
          analysisData={analysisData}
          onReset={() => setAnalysisData(null)}
        />
      )}
    </div>
  );
}
