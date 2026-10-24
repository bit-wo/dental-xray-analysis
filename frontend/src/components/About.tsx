import React from 'react';
import { Shield, AlertTriangle, Info, Database, Brain, GitBranch, FileText, Zap, Smile } from 'lucide-react';
import { HealthResponse } from '@/types/api';

interface AboutProps {
  health: HealthResponse | null;
}

export function About({ health }: AboutProps) {
  const diseaseClasses = health?.disease_classes ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="panel p-6 sm:p-8 bg-gradient-to-br from-accent-50 to-white border-accent-100">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-accent-100 rounded-xl">
            <Smile className="w-8 h-8 text-accent-600" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              About DentalAI
            </h1>
            <p className="text-slate-600 text-lg">
              Research prototype for dental X-ray analysis using deep learning.
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer - prominently displayed */}
      <div className="disclaimer-banner border-red-200 bg-red-50" role="alert">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-red-900">Important Disclaimer</strong>
            <p className="mt-1 text-red-800">
              This application is for <strong>research and educational purposes only</strong>.
              It is <strong>not clinically validated</strong> and must not be used for diagnosis,
              treatment planning, or any clinical decision-making. All model predictions
              (segmentation, disease detection, tooth numbering) can be incorrect.
              A qualified dental professional must review the original radiograph.
            </p>
          </div>
        </div>
      </div>

      {/* Model Information */}
      <section className="panel p-6">
        <h2 className="font-display font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Brain className="w-6 h-6 text-accent-600" />
          Model Information
        </h2>
        <div className="grid lg:grid-cols-2 gap-6">
          <ModelCard
            title="Tooth Segmentation"
            icon={<Zap className="w-5 h-5" />}
            color="accent"
            items={[
              { label: 'Architecture', value: 'YOLOv8-seg (Ultralytics)' },
              { label: 'Classes', value: '32 (permanent FDI 11–48)' },
              { label: 'Mapping', value: 'Class 0–7 → FDI 11–18, Class 8–15 → FDI 21–28, Class 16–23 → FDI 31–38, Class 24–31 → FDI 41–48' },
              { label: 'Confidence threshold', value: '0.25' },
              { label: 'Source', value: 'Custom-trained for this project' },
              { label: 'Dataset', value: 'Not verified (DENTEX possible but unconfirmed)' },
            ]}
          />
          <ModelCard
            title="Disease Detection"
            icon={<Shield className="w-5 h-5" />}
            color="red"
            items={[
              { label: 'Architecture', value: 'YOLOv8 (Ultralytics)' },
              { label: 'Classes', value: diseaseClasses.length ? `${diseaseClasses.length} (${diseaseClasses.join(', ')})` : 'Loading...' },
              { label: 'Confidence threshold', value: '0.25' },
              { label: 'IoU threshold', value: '0.3' },
              { label: 'Source', value: 'Hugging Face: chemahc94/caries-detection-weights' },
              { label: 'Note', value: 'Pre-trained weights, not fine-tuned on local data' },
            ]}
          />
        </div>
      </section>

      {/* How it works */}
      <section className="panel p-6">
        <h2 className="font-display font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Info className="w-6 h-6 text-accent-600" />
          How It Works
        </h2>
        <div className="space-y-4">
          <DetailRow
            title="Image Enhancement"
            description="CLAHE (Contrast Limited Adaptive Histogram Equalization) is applied to the uploaded image. The enhanced image is used for all model inference. The original is preserved for comparison."
          />
          <DetailRow
            title="Tooth Segmentation"
            description="The segmentation model predicts instance masks for each tooth. Each mask is assigned a class (0–31) which maps to a permanent FDI tooth number (11–48). Masks are overlaid in teal with yellow FDI labels at centroids."
          />
          <DetailRow
            title="Disease Detection"
            description="The detection model predicts bounding boxes for four disease categories. Red boxes with labels are drawn on the image."
          />
          <DetailRow
            title="Tooth–Disease Matching"
            description="Each disease box is geometrically matched to tooth masks using Intersection over Union (IoU) and mask coverage (intersection / tooth area). The best match is selected if coverage ≥ 20%."
          />
          <DetailRow
            title="Matching Status"
            description="Statuses: <strong>Candidate match</strong> (coverage ≥ 50%), <strong>Uncertain match</strong> (20–50%), <strong>No match</strong> (<20% or no overlap), <strong>Low confidence</strong> (disease score < 0.30). All require professional review."
          />
        </div>
      </section>

      {/* Limitations */}
      <section className="panel p-6">
        <h2 className="font-display font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          Known Limitations
        </h2>
        <ul className="space-y-3 text-slate-600">
          <LimitationItem>
            <strong>Predictions may be incorrect.</strong> Both models can produce false positives and false negatives.
          </LimitationItem>
          <LimitationItem>
            <strong>Confidence ≠ Probability.</strong> Model confidence scores are not calibrated probabilities of clinical truth.
          </LimitationItem>
          <LimitationItem>
            <strong>Tooth associations are geometric.</strong> FDI numbers are assigned by mask centroid; matching uses spatial overlap only. No anatomical reasoning is performed.
          </LimitationItem>
          <LimitationItem>
            <strong>Thresholds are experimental.</strong> Matching thresholds (20%, 50%, 0.30 disease confidence) have not been clinically validated.
          </LimitationItem>
          <LimitationItem>
            <strong>Dataset provenance uncertain.</strong> The tooth segmentation model's training dataset has not been verified.
          </LimitationItem>
          <LimitationItem>
            <strong>Panoramic only.</strong> Models are trained on panoramic radiographs. Performance on other views (bitewing, periapical) is unknown.
          </LimitationItem>
        </ul>
      </section>

      {/* Technical details */}
      <section className="panel p-6">
        <h2 className="font-display font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Database className="w-6 h-6 text-accent-600" />
          Technical Details
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <DetailItem label="Framework" value="Ultralytics YOLOv8" />
          <DetailItem label="Backend" value="Flask REST API" />
          <DetailItem label="Frontend" value="React 18 + TypeScript + Vite" />
          <DetailItem label="Styling" value="Tailwind CSS" />
          <DetailItem label="Icons" value="Lucide React" />
          <DetailItem label="Image Processing" value="OpenCV + Pillow" />
        </div>
      </section>

      {/* References */}
      <section className="panel p-6">
        <h2 className="font-display font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-accent-600" />
          References & Resources
        </h2>
        <div className="space-y-3">
          <ReferenceLink
            title="DENTEX Challenge"
            url="https://dentex.grand-challenge.org/"
            description="Official DENTEX challenge for dental X-ray analysis"
          />
          <ReferenceLink
            title="DENTEX Dataset Repository"
            url="https://github.com/ibrahimethemhamamci/DENTEX"
            description="GitHub repository for DENTEX dataset"
          />
          <ReferenceLink
            title="DENTEX Research Paper"
            url="https://arxiv.org/abs/2305.19112"
            description="arXiv:2305.19112 - DENTEX: Dental X-ray dataset"
          />
          <ReferenceLink
            title="Disease Model (Hugging Face)"
            url="https://huggingface.co/chemahc94/caries-detection-weights"
            description="Pre-trained caries detection weights by chemahc94"
          />
          <ReferenceLink
            title="Ultralytics YOLOv8"
            url="https://github.com/ultralytics/ultralytics"
            description="YOLOv8 implementation used for both models"
          />
        </div>
      </section>

      {/* Version info */}
      <div className="text-center text-sm text-slate-500 border-t border-slate-200 pt-4">
        <p>DentalAI v1.0.0 — Research Prototype</p>
        <p className="mt-1">Built with React, Flask, and Ultralytics YOLOv8</p>
      </div>
    </div>
  );
}

function ModelCard({
  title,
  icon,
  color,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  color: 'accent' | 'red' | 'blue' | 'amber';
  items: Array<{ label: string; value: string }>;
}) {
  const colors = {
    accent: { bg: 'bg-accent-50', border: 'border-accent-200', icon: 'text-accent-600' },
    red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600' },
  };
  const c = colors[color];

  return (
    <div className={`card p-5 ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${c.icon}`}>{icon}</div>
        <h3 className="font-display font-semibold text-slate-900">{title}</h3>
      </div>
      <dl className="space-y-3 text-sm">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col sm:flex-row gap-2">
            <dt className="text-slate-500 font-medium min-w-[140px]">{item.label}</dt>
            <dd className="text-slate-900 font-mono text-xs break-all">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DetailRow({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-4 p-4 bg-slate-50 rounded-lg">
      <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center flex-shrink-0">
        <Info className="w-4 h-4 text-accent-600" />
      </div>
      <div>
        <h4 className="font-medium text-slate-900">{title}</h4>
        <p className="text-sm text-slate-600 mt-1">{description}</p>
      </div>
    </div>
  );
}

function LimitationItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <span className="text-sm">{children}</span>
    </li>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-slate-50 rounded-lg">
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-mono text-slate-900 mt-1">{value}</dd>
    </div>
  );
}

function ReferenceLink({ title, url, description }: { title: string; url: string; description: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
    >
      <FileText className="w-5 h-5 text-slate-400" />
      <div>
        <span className="font-medium text-slate-900">{title}</span>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </a>
  );
}