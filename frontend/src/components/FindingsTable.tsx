import type { Detection } from '@/types/api';
import { getStatusBadgeClass, formatConfidence, formatNumber, getConfidenceBadgeClass } from '@/utils/format';

interface FindingsTableProps {
  detections: Detection[];
}

const STATUS_LABELS: Record<string, string> = {
  'Candidate match; review required': 'Candidate match',
  'Uncertain tooth match; review': 'Uncertain match',
  'No confident tooth match; review': 'No match',
  'Low-confidence disease prediction; review': 'Low confidence',
};

export function FindingsTable({ detections }: FindingsTableProps) {
  if (detections.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="empty-state-title">No findings detected</p>
        <p className="empty-state-text">
          The model did not return any detections above its configured threshold.
          This does not establish that the X-ray is free of disease.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table" role="table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Finding</th>
            <th scope="col">Candidate Tooth</th>
            <th scope="col">Disease Confidence</th>
            <th scope="col">Tooth Confidence</th>
            <th scope="col">Mask Coverage</th>
            <th scope="col">IoU</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {detections.map((detection) => (
            <tr key={detection.detection}>
              <td className="font-mono font-medium text-slate-900">{detection.detection}</td>
              <td className="font-medium text-slate-700">{detection.disease}</td>
              <td>
                {detection.candidate_fdi !== null ? (
                  <span className="font-mono font-medium text-slate-900">
                    FDI {detection.candidate_fdi}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Not assigned</span>
                )}
              </td>
              <td>
                <span className={getConfidenceBadgeClass(detection.disease_confidence)}>
                  {formatConfidence(detection.disease_confidence)}
                </span>
              </td>
              <td>
                {detection.tooth_confidence !== null ? (
                  <span className={getConfidenceBadgeClass(detection.tooth_confidence)}>
                    {formatConfidence(detection.tooth_confidence)}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">N/A</span>
                )}
              </td>
              <td className="font-mono text-slate-700">
                {formatNumber(Math.round((detection.mask_coverage || 0) * 100))}%
              </td>
              <td className="font-mono text-slate-700">
                {formatNumber(Math.round((detection.iou || 0) * 100))}%
              </td>
              <td>
                <span className={getStatusBadgeClass(detection.status)}>
                  {STATUS_LABELS[detection.status] || detection.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}