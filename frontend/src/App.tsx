import { useState, useEffect, useCallback } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { ImageComparison } from './components/ImageComparison';
import { FindingsTable } from './components/FindingsTable';
import { FindingsInterpretation } from './components/FindingsInterpretation';
import { ResultsSummary } from './components/ResultsSummary';
import { useHealthCheck } from './hooks/useApi';
import { useAnalyze } from './hooks/useApi';
import type { AnalyzeResponse, ImageViewType } from './types/api';
import { Smile, AlertCircle, CheckCircle, RotateCw, Zap, Loader2, AlertTriangle, Info } from 'lucide-react';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ImageViewType>('combined');
  const [analysisStage, setAnalysisStage] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [stageMessage, setStageMessage] = useState('');
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const { health, checkHealth } = useHealthCheck();
  const { analyze, loading, reset } = useAnalyze();

  // Check health on mount and periodically
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

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
    setResult(null);
    setAnalysisError(null);
    reset();
  }, [reset]);

  const handleRemoveImage = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setDimensions(null);
    setUploadError(null);
    setAnalysisStage('idle');
    setResult(null);
    setAnalysisError(null);
    reset();
  }, [reset]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;

    setAnalysisStage('processing');
    setStageMessage('Uploading image...');
    setUploadError(null);
    setAnalysisError(null);

    try {
      const response = await analyze(selectedFile);
      if (response) {
        setAnalysisStage('complete');
        setStageMessage('Analysis complete');
        setActiveView('combined');
      }
    } catch (err) {
      setAnalysisStage('error');
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setStageMessage(message);
      setAnalysisError(message);
    }
  }, [selectedFile, analyze]);

  const handleRetry = useCallback(() => {
    if (selectedFile) {
      handleAnalyze();
    }
  }, [selectedFile, handleAnalyze]);

  const handleResetToInitial = useCallback(() => {
    handleRemoveImage();
  }, [handleRemoveImage]);

  const handleDownloadReport = useCallback(async () => {
    if (!result) return;
    
    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          analysis: result, 
          original_filename: selectedFile?.name || 'unknown' 
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Report generation failed');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dental-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Report download failed:', err);
      alert('Failed to generate PDF report: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, [result, selectedFile]);

  const handleImageSelect = useCallback((file: File, url: string, dims: { width: number; height: number }) => {
    setSelectedFile(file);
    setPreviewUrl(url);
    setDimensions(dims);
    setUploadError(null);
    setAnalysisStage('idle');
    setResult(null);
    setAnalysisError(null);
    reset();
  }, [reset]);

  const handleRemoveImage = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setDimensions(null);
    setUploadError(null);
    setAnalysisStage('idle');
    setResult(null);
    setAnalysisError(null);
    reset();
  }, [reset]);

  const modelsLoaded = health?.models_loaded ?? false;
  const diseaseClasses = health?.disease_classes ?? [];

  const VIEW_ORDER: ImageViewType[] = ['original', 'enhanced', 'segmentation', 'disease', 'combined'];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Smile className="w-8 h-8 text-accent-600" />
              <div>
                <h1 className="font-display text-xl font-bold text-slate-900">DentalAI</h1>
                <p className="text-sm text-slate-500">Dental X-ray Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
                <span className={`status-dot ${health?.models_loaded ? 'status-online' : 'status-offline'}`} />
                <span className="text-sm font-medium text-slate-700">
                  {health?.models_loaded ? 'Models ready' : 'Models offline'}
                </span>
                {health?.models_loaded ? (
                  <span className="w-4 h-4 text-green-500" />
                ) : (
                  <span className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl w-full p-4 sm:p-6 lg:p-8">
        <section className="space-y-6">
          {/* Header section */}
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-slate-900">Dental X-ray Analysis</h2>
            <p className="text-slate-600">
              Upload a panoramic dental X-ray for tooth segmentation and disease detection.
              Research prototype — not for clinical use.
            </p>
          </div>

          {/* Model status */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className={`card p-4 ${modelsLoaded ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${modelsLoaded ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-medium text-slate-900">Models</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{modelsLoaded ? 'Models ready' : 'Models unavailable'}</p>
            </div>
            <div className="card p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-medium text-slate-900">Disease Classes</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{diseaseClasses.length} classes: {diseaseClasses.join(', ')}</p>
            </div>
            <div className="card p-4 bg-amber-50 border-amber-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-medium text-slate-900">Tooth Segmentation</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">32 FDI tooth classes</p>
            </div>
            <div className="card p-4 bg-red-50 border-red-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="font-medium text-slate-900">Validation</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">Research only</p>
            </div>
          </div>

          {/* Upload section */}
          <div className="panel p-6">
            <ImageUpload
              onImageSelect={handleImageSelect}
              onRemove={handleRemoveImage}
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              dimensions={dimensions}
              disabled={loading || analysisStage === 'processing'}
              error={uploadError}
            />
          </div>

          {/* Analysis controls */}
          {(analysisStage === 'idle' || analysisStage === 'complete' || analysisStage === 'error') && selectedFile && (
            <div className="panel p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Image:</span>
                    <span className="font-medium text-slate-900">{selectedFile.name}</span>
                  </div>
                  {dimensions && (
                    <span className="text-sm text-slate-500">
                      {dimensions.width} × {dimensions.height} px
                    </span>
                  )}
                  <span className="text-sm text-slate-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {analysisStage === 'error' && (
                    <button onClick={handleRetry} className="btn-primary" disabled={loading}>
                      <RotateCw className="w-4 h-4" />
                      <span>Retry</span>
                    </button>
                  )}
                  {analysisStage !== 'processing' && (
                    <button 
                      onClick={handleAnalyze} 
                      className="btn-primary" 
                      disabled={loading || analysisStage === 'processing'}
                    >
                      {analysisStage === 'processing' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Analyze X-ray</span>
                          <Zap className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                  <button onClick={handleRemoveImage} className="btn-secondary" disabled={loading}>
                    <span className="hidden sm:inline">Reset</span>
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {analysisStage === 'processing' && (
                <div className="mt-4">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Loader2 className="w-8 h-8 text-accent-600 animate-spin" />
                    <Zap className="w-8 h-8 text-amber-500 animate-pulse" />
                  </div>
                  <p className="text-lg font-medium text-slate-900 mb-1">Analyzing X-ray...</p>
                  <p className="text-slate-500">{stageMessage}</p>
                  <div className="mt-4 flex justify-center gap-2 text-xs text-slate-500 flex-wrap">
                    <span className="px-2 py-1 bg-slate-100 rounded">CLAHE Enhancement</span>
                    <span className="px-2 py-1 bg-slate-100 rounded">Tooth Segmentation</span>
                    <span className="px-2 py-1 bg-slate-100 rounded">Disease Detection</span>
                    <span className="px-2 py-1 bg-slate-100 rounded">Tooth Matching</span>
                  </div>
                </div>
              )}
              {analysisStage === 'error' && (
                <div className="mt-4 panel p-4 border-red-200 bg-red-50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-red-900 mb-1">Analysis Failed</p>
                      <p className="text-red-700 mb-3">{analysisError || 'An unknown error occurred'}</p>
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
              )}
            </div>
          )}

          {/* Results section */}
          {result && analysisStage === 'complete' && (
            <div className="space-y-6" id="results">
              {/* Image results */}
              <section>
                <h3 className="font-display font-semibold text-slate-900 mb-4">Image Results</h3>
                <ImageComparison
                  images={result.images || {}}
                  activeView={activeView}
                  onViewChange={setActiveView}
                  title="Annotated X-ray"
                  availableViews={VIEW_ORDER.filter((v) => result.images?.[v])}
                />
              </section>

              {/* Analysis summary */}
              <section>
                <ResultsSummary
                  summary={result.summary || null}
                  segmentation={result.segmentation || null}
                  images={result.images || null}
                  onDownloadReport={handleDownloadReport}
                />
              </section>

              {/* Findings table */}
              <section>
                <h3 className="font-display font-semibold text-slate-900 mb-4">Detected Findings</h3>
                <FindingsTable detections={result.detections || []} />
              </section>

              {/* Interpretation */}
              <section>
                <FindingsInterpretation detections={result.detections || []} />
              </section>

              {/* Disclaimer */}
              <div className="disclaimer-banner mt-6" role="alert">
                <strong>Research use only.</strong> This system is not clinically validated. Model findings
                and tooth associations can be wrong. Do not use this application to diagnose, exclude disease,
                or decide treatment. A qualified dental professional must review the original X-ray.
              </div>
            </section>
          )}

          {/* Reset button when analysis is complete */}
          {analysisStage === 'complete' && (
            <div className="text-center">
              <button onClick={handleRemoveImage} className="btn-secondary">
                <RotateCw className="w-4 h-4" />
                <span>New Analysis</span>
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-3 mt-12">
        <p className="text-xs text-slate-500 text-center">
          DentalAI — Research prototype. Not for clinical use.
        </p>
      </footer>
    </div>
  );
}

export default App;