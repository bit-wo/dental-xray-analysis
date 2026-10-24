import type { Detection } from '@/types/api';
import { formatConfidence, getConfidenceColor, getConfidenceBadgeClass } from '@/utils/format';
import { AlertTriangle, Info, Stethoscope } from 'lucide-react';

interface FindingsInterpretationProps {
  detections: Detection[];
}

const DISEASE_INFO: Record<string, string> = {
  Caries: 'Caries (tooth decay) appears as radiolucent areas in enamel or dentin. Early lesions may be subtle.',
  'Deep Caries': 'Deep caries extends close to the pulp chamber. Higher risk of pulp involvement.',
  'Periapical Lesion': 'Periapical lesions appear as radiolucent areas at the root apex, often indicating chronic inflammation.',
  Impacted: 'Impacted teeth fail to erupt properly. May cause resorption of adjacent teeth or cyst formation.',
};

export function FindingsInterpretation({ detections }: FindingsInterpretationProps) {
  if (detections.length === 0) {
    return (
      <div className="panel p-6">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="text-slate-600">
            <p className="font-medium text-slate-900 mb-1">No model findings returned</p>
            <p>
              The model returned no detections above its configured threshold.
              This does not establish that the X-ray is free of disease.
              Manual professional review is required.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel p-6">
      <h3 className="font-display font-semibold text-slate-900 mb-4">Findings Interpretation</h3>
      <div className="space-y-4">
        {detections.map((detection) => {
          const diseaseInfo = DISEASE_INFO[detection.disease] || 'No additional information available.';
          const hasTooth = detection.candidate_fdi !== null;
          const diseaseConfColor = getConfidenceColor(detection.disease_confidence);

          return (
            <div
              key={detection.detection}
              className="border border-slate-200 rounded-lg p-4 bg-slate-50"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    diseaseConfColor === 'red'
                      ? 'bg-red-100 text-red-600'
                      : diseaseConfColor === 'amber'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-green-100 text-green-600'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-slate-900">
                      Finding {detection.detection}: {detection.disease}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        diseaseConfColor === 'red'
                          ? 'bg-red-100 text-red-700'
                          : diseaseConfColor === 'amber'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {formatConfidence(detection.disease_confidence)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 mb-3">{diseaseInfo}</p>

                  <div className="grid sm:grid-cols-2 gap-2 text-sm mb-3">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-slate-400" />
                      <span>
                        <strong>Candidate tooth: </strong>
                        {hasTooth ? (
                          <span className="font-mono font-medium text-slate-900">
                            FDI {detection.candidate_fdi}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Not assigned</span>
                        )}
                      </span>
                    </div>
                    {hasTooth && detection.tooth_confidence !== null && (
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-slate-400" />
                        <span>
                          <strong>Tooth confidence: </strong>
                          <span className={getConfidenceBadgeClass(detection.tooth_confidence)}>
                            {formatConfidence(detection.tooth_confidence)}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600 p-3 bg-white rounded border border-slate-200">
                    <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>
                      {hasTooth
                        ? `The model detected a potential ${detection.disease.toLowerCase()} finding and geometrically associated it with candidate FDI tooth ${detection.candidate_fdi}.`
                        : `The model detected a potential ${detection.disease.toLowerCase()} finding, but it did not assign a sufficiently supported candidate tooth.`}
                      Manual review by a qualified dental professional is required.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Global disclaimer */}
        <div className="disclaimer-banner mt-4 flex items-start gap-3">
          <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <strong>Important:</strong> All findings are model predictions, not clinical diagnoses.
            Confidence scores are model outputs, not probabilities of clinical truth.
            Tooth associations are geometric estimates based on spatial overlap.
            A qualified dental professional must review the original radiograph for any clinical decision-making.
          </div>
        </div>
      </div>
    </div>
  );
}