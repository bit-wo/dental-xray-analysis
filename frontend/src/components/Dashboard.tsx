import { Zap, AlertTriangle, Info, FilePlus, Clock, Smile } from 'lucide-react';
import type { HealthResponse } from '@/types/api';

interface DashboardProps {
  health: HealthResponse | null;
  onNewAnalysis: () => void;
}

export function Dashboard({ health, onNewAnalysis }: DashboardProps) {
  const modelsLoaded = health?.models_loaded ?? false;
  const diseaseClasses = health?.disease_classes ?? [];

  return (
    <div className="space-y-6">
      {/* Hero section */}
      <div className="panel p-6 sm:p-8 bg-gradient-to-br from-accent-50 to-white border-accent-100">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-accent-100 rounded-xl">
            <Smile className="w-8 h-8 text-accent-600" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              Dental X-ray Analysis
            </h1>
            <p className="text-slate-600 text-lg max-w-2xl">
              Research prototype combining YOLO-based tooth segmentation, FDI tooth numbering,
              dental disease detection, and geometry-based matching.
            </p>
          </div>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          icon={<Zap className="w-5 h-5" />}
          title="Tooth Segmentation"
          status={modelsLoaded ? 'Ready' : 'Unavailable'}
          color={modelsLoaded ? 'green' : 'red'}
          description="32 FDI tooth classes"
        />
        <StatusCard
          icon={<Zap className="w-5 h-5" />}
          title="Disease Detection"
          status={modelsLoaded ? `${diseaseClasses.length} classes` : 'Unavailable'}
          color={modelsLoaded ? 'green' : 'red'}
          description={diseaseClasses.join(', ') || 'Loading...'}
        />
        <StatusCard
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Matching"
          status="Geometric"
          color="amber"
          description="IoU + coverage based"
        />
        <StatusCard
          icon={<Info className="w-5 h-5" />}
          title="Validation"
          status="Research only"
          color="red"
          description="Not clinically validated"
        />
      </div>

      {/* Quick actions */}
      <div className="panel p-6">
        <h2 className="font-display font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={onNewAnalysis}
            className="card-hover p-6 flex items-center gap-4 text-left"
          >
            <div className="p-3 bg-accent-100 rounded-xl">
              <FilePlus className="w-6 h-6 text-accent-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">New Analysis</h3>
              <p className="text-sm text-slate-500">Upload and analyze a panoramic X-ray</p>
            </div>
          </button>
          <div className="card p-6 flex items-center gap-4">
            <div className="p-3 bg-slate-100 rounded-xl">
              <Clock className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Analysis History</h3>
              <p className="text-sm text-slate-500">Not implemented in this version</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline overview */}
      <div className="panel p-6">
        <h2 className="font-display font-semibold text-slate-900 mb-4">Analysis Pipeline</h2>
        <div className="space-y-4">
          {PIPELINE_STEPS.map((step, index) => (
            <PipelineStep key={step.id} step={step} index={index} />
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="disclaimer-banner" role="alert">
        <strong>Research use only.</strong> This system is not clinically validated. Model findings
        and tooth associations can be wrong. Do not use this application to diagnose, exclude disease,
        or decide treatment. A qualified dental professional must review the original X-ray.
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  title,
  status,
  color,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  status: string;
  color: 'green' | 'red' | 'amber' | 'blue';
  description: string;
}) {
  const colors = {
    green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', dot: 'bg-green-500', text: 'text-green-700' },
    red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', dot: 'bg-red-500', text: 'text-red-700' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', dot: 'bg-amber-500', text: 'text-amber-700' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', dot: 'bg-blue-500', text: 'text-blue-700' },
  };
  const c = colors[color];

  return (
    <div className={`card p-4 ${c.bg} ${c.border}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${c.icon}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-900">{title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${c.dot}`} />
            <span className={`text-sm font-medium ${c.text}`}>{status}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

const PIPELINE_STEPS = [
  {
    id: 'enhance',
    title: 'CLAHE Enhancement',
    description: 'Contrast Limited Adaptive Histogram Equalization enhances local contrast for better model performance.',
  },
  {
    id: 'segment',
    title: 'Tooth Segmentation',
    description: 'YOLOv8-seg predicts 32 tooth masks mapped to permanent FDI numbers (11–48).',
  },
  {
    id: 'detect',
    title: 'Disease Detection',
    description: 'YOLOv8 detects caries, deep caries, periapical lesions, and impacted teeth.',
  },
  {
    id: 'match',
    title: 'Geometric Matching',
    description: 'IoU and mask coverage associate disease boxes to candidate tooth masks.',
  },
];

function PipelineStep({ step, index }: { step: typeof PIPELINE_STEPS[0]; index: number }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center font-display font-semibold text-accent-700">
          {index + 1}
        </div>
        {index < PIPELINE_STEPS.length - 1 && (
          <div className="w-0.5 h-full bg-slate-200 mt-1" />
        )}
      </div>
      <div className="flex-1 pt-1">
        <h4 className="font-medium text-slate-900">{step.title}</h4>
        <p className="text-sm text-slate-500">{step.description}</p>
      </div>
    </div>
  );
}