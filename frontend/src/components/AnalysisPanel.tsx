import { useState, useCallback, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle, RotateCw, Zap } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { ImageComparison } from './ImageComparison';
import { FindingsTable } from './FindingsTable';
import { FindingsInterpretation } from './FindingsInterpretation';
import { ResultsSummary } from './ResultsSummary';
import { useAnalyze } from '@/hooks/useApi';
import type { AnalyzeResponse, ImageViewType } from '@/types/api';

interface AnalysisPanelProps {
  onNewAnalysis: () => void;
}

const VIEW_ORDER: ImageViewType[] = ['original', 'enhanced', 'segmentation', 'disease', 'combined'];

export function AnalysisPanel({ onNewAnalysis }: AnalysisPanelProps) {
  const { analyze, loading, error, result, reset } = useAnalyze();

  // Local state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ImageViewType>('combined');
  const [analysisStage, setAnalysisStage] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [stageMessage, setStageMessage] = useState('');

  // Cleanup preview URL on unmount or reset
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleImageSelect = useCallback((file: File, url: string, dims: { width: number; height: number }) => {
    setSelectedFile(file);
    setPreviewUrl(url);
    setDimensions(dims);
    setUploadError(null);
    setAnalysisStage('idle');
    reset();
  }, [reset]);

  const handleRemoveImage = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setDimensions(null);
    setUploadError(null);
    setAnalysisStage('idle');
    reset();
  }, [reset]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;

    setAnalysisStage('processing');
    setStageMessage('Uploading image...');
    setUploadError(null);

    try {
      const response = await analyze(selectedFile);
      if (response) {
        setAnalysisStage('complete');
        setStageMessage('Analysis complete');
        // Default to combined view
        setActiveView('combined');
      }
    } catch {
      setAnalysisStage('error');
      setStageMessage('Analysis failed');
    }
  }, [selectedFile, analyze]);

  const handleRetry = useCallback(() => {
    if (selectedFile) {
      handleAnalyze();
    }
  }, [selectedFile, handleAnalyze]);

  // Render different states
  if (!selectedFile) {
    return (
      <div className="space-y-6">
        <ImageUpload
          onImageSelect={handleImageSelect}
          onRemove={handleRemoveImage}
          selectedFile={null}
          previewUrl={null}
          dimensions={null}
          disabled={loading}
          error={null}
        />
        <div className="text-center text-slate-500">
          <p className="text-sm">
            Upload a panoramic dental X-ray to begin analysis.
            The model will run tooth segmentation and disease detection.
          </p>
        </div>
      </div>
    );
  }

  if (analysisStage === 'processing' || loading) {
    return (
      <div className="space-y-6">
        <ImageUpload
          onImageSelect={handleImageSelect}
          onRemove={handleRemoveImage}
          selectedFile={selectedFile}
          previewUrl={previewUrl}
          dimensions={dimensions}
          disabled={true}
          error={null}
        />
        <div className="panel p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Loader2 className="w-8 h-8 text-accent-600 animate-spin" />
            <Zap className="w-8 h-8 text-amber-500 animate-pulse" />
          </div>
          <p className="text-lg font-medium text-slate-900 mb-2">Analyzing X-ray...</p>
          <p className="text-slate-500">{stageMessage}</p>
          <div className="mt-4 flex justify-center gap-2 text-xs text-slate-500">
            <span className="px-2 py-1 bg-slate-100 rounded">CLAHE Enhancement</span>
            <span className="px-2 py-1 bg-slate-100 rounded">Tooth Segmentation</span>
            <span className="px-2 py-1 bg-slate-100 rounded">Disease Detection</span>
            <span className="px-2 py-1 bg-slate-100 rounded">Tooth Matching</span>
          </div>
        </div>
      </div>
    );
  }

  if (analysisStage === 'error' || error) {
    return (
      <div className="space-y-6">
        <ImageUpload
          onImageSelect={handleImageSelect}
          onRemove={handleRemoveImage}
          selectedFile={selectedFile}
          previewUrl={previewUrl}
          dimensions={dimensions}
          disabled={loading}
          error={uploadError}
        />
        <div className="panel p-6 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-red-900 mb-1">Analysis Failed</p>
              <p className="text-red-700 mb-4">{error || uploadError || 'An unknown error occurred'}</p>
              <div className="flex gap-2">
                <button onClick={handleRetry} className="btn-primary">
                  <RotateCw className="w-4 h-4" />
                  <span>Retry</span>
                </button>
                <button onClick={handleRemoveImage} className="btn-secondary">
                  New Image
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state - show results
  if (result && analysisStage === 'complete') {
    const images = (result.images || {}) as Record<ImageViewType, string>;
    const availableViews = VIEW_ORDER.filter((v) => images[v]);

    return (
      <div className="space-y-6">
        {/* Image upload (collapsed) */}
        <ImageUpload
          onImageSelect={handleImageSelect}
          onRemove={handleRemoveImage}
          selectedFile={selectedFile}
          previewUrl={previewUrl}
          dimensions={dimensions}
          disabled={loading}
          error={null}
        />

        {/* Results grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column: Image viewer */}
          <div className="lg:col-span-2 space-y-6">
            <ImageComparison
              images={images}
              activeView={activeView}
              onViewChange={setActiveView}
              title="Annotated X-ray"
              availableViews={availableViews}
            />
            <FindingsTable detections={result.detections || []} />
          </div>

          {/* Right column: Interpretation + Summary */}
          <div className="space-y-6">
            <FindingsInterpretation detections={result.detections || []} />
            <ResultsSummary
              summary={result.summary || null}
              segmentation={result.segmentation || null}
              images={images}
              onDownloadReport={() => downloadReport(result)}
            />
          </div>
        </div>

        {/* New analysis button */}
        <div className="text-center">
          <button onClick={onNewAnalysis} className="btn-secondary">
            <RotateCw className="w-4 h-4" />
            <span>New Analysis</span>
          </button>
        </div>
      </div>
    );
  }

  // Idle state with image selected but not analyzed
  return (
    <div className="space-y-6">
      <ImageUpload
        onImageSelect={handleImageSelect}
        onRemove={handleRemoveImage}
        selectedFile={selectedFile}
        previewUrl={previewUrl}
        dimensions={dimensions}
        disabled={loading}
        error={null}
      />
      <div className="panel p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="font-display font-semibold text-slate-900 mb-2">Ready to Analyze</h3>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">
          Image loaded successfully ({dimensions?.width} × {dimensions?.height} px).
          Click the button below to run tooth segmentation and disease detection.
        </p>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="btn-primary px-8 py-3 text-lg"
        >
          <Zap className="w-5 h-5" />
          <span>Analyze X-ray</span>
        </button>
      </div>
    </div>
  );
}

function downloadReport(response: AnalyzeResponse) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `dental-analysis-${timestamp}.json`;

  const report = {
    timestamp: new Date().toISOString(),
    disclaimer: 'This report is generated from model predictions for research/educational purposes only. It is not clinically validated and must not be used for diagnosis or treatment decisions.',
    image: response.image,
    segmentation: response.segmentation,
    detections: response.detections,
    summary: response.summary,
    images: response.images,
    model_info: {
      segmentation_classes: 32,
      disease_classes: response.detections?.map(d => d.disease) || [],
    },
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}