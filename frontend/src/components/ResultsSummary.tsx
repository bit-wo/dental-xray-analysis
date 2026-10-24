import { Download, AlertTriangle, CheckCircle, XCircle, Zap } from 'lucide-react';
import type { Summary, ToothSegmentation } from '@/types/api';
import { formatConfidence } from '@/utils/format';

interface ResultsSummaryProps {
  summary: Summary | null;
  segmentation: ToothSegmentation | null;
  images: Record<string, string> | null;
  onDownloadReport: () => void;
}

export function ResultsSummary({
  summary,
  segmentation,
  images,
  onDownloadReport,
}: ResultsSummaryProps) {
  if (!summary) return null;

  const teethCount = segmentation?.teeth_count ?? summary.total_teeth_segmented;
  const detectionCount = summary.total_detections;
  const matchedCount = summary.matched_detections;
  const categories = summary.detection_categories;

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display font-semibold text-slate-900">Analysis Summary</h3>
        <button
          onClick={onDownloadReport}
          className="btn-secondary"
          disabled={!images}
        >
          <Download className="w-4 h-4" />
          <span>Download Report</span>
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={<Zap className="w-5 h-5 text-accent-600" />}
          label="Teeth Segmented"
          value={teethCount}
          hint="Predicted tooth masks"
        />
        <MetricCard
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          label="Disease Detections"
          value={detectionCount}
          hint="Potential findings"
        />
        <MetricCard
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          label="Tooth Matches"
          value={matchedCount}
          hint="Geometric associations"
        />
        <MetricCard
          icon={<XCircle className="w-5 h-5 text-red-600" />}
          label="Unmatched"
          value={detectionCount - matchedCount}
          hint="No confident tooth link"
        />
      </div>

      {/* Detection categories */}
      {categories.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-slate-700 mb-3">Detection Categories</h4>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat}
                className="badge badge-blue"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Per-tooth confidence summary */}
      {segmentation?.teeth.length && (
        <div className="mb-6">
          <h4 className="font-medium text-slate-700 mb-3">Segmented Teeth</h4>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">FDI</th>
                  <th scope="col">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {segmentation.teeth
                  .sort((a, b) => (a.fdi || 0) - (b.fdi || 0))
                  .map((tooth) => (
                    <tr key={tooth.class_id}>
                      <td className="font-mono font-medium text-slate-900">
                        {tooth.fdi ? `FDI ${tooth.fdi}` : 'Unknown'}
                      </td>
                      <td>
                        <span className={`badge ${getConfidenceBadgeClass(tooth.confidence)}`}>
                          {formatConfidence(tooth.confidence)}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report preview / download info */}
      <div className="border-t border-slate-200 pt-4">
        <h4 className="font-medium text-slate-700 mb-2">Report Contents</h4>
        <ul className="text-sm text-slate-600 space-y-1">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Original and enhanced images
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Annotated images (segmentation, disease, combined)
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Detection table with confidences and geometry
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Plain-language interpretations
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Model metadata and disclaimer
          </li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Reports are generated client-side from actual model outputs.
          They do not constitute clinical validation.
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-slate-100 rounded-lg">{icon}</div>
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="font-display font-bold text-2xl text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{hint}</div>
    </div>
  );
}

function getConfidenceBadgeClass(confidence: number): string {
  if (confidence >= 0.7) return 'badge-green';
  if (confidence >= 0.4) return 'badge-amber';
  return 'badge-red';
}