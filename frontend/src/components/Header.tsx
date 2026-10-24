import { Menu, Wifi, WifiOff, RefreshCw, FileText, FilePlus } from 'lucide-react';
import type { HealthResponse } from '@/types/api';

interface HeaderProps {
  title: string;
  description: string;
  health: HealthResponse | null;
  onMenuClick: () => void;
  onNewAnalysis: () => void;
  onDownloadReport?: () => void;
  showReportButton?: boolean;
  showRefresh?: boolean;
  onRefresh?: () => void;
}

export function Header({
  title,
  description,
  health,
  onMenuClick,
  onNewAnalysis,
  onDownloadReport,
  showReportButton = false,
  showRefresh = false,
  onRefresh,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left: Menu + Title */}
          <div className="flex items-center gap-4 min-w-0">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              onClick={onMenuClick}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 truncate">
                {title}
              </h1>
              <p className="text-sm text-slate-500 truncate">{description}</p>
            </div>
          </div>

          {/* Right: Status + Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Model status indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
              <span
                className={`status-dot ${health?.models_loaded ? 'status-online' : 'status-offline'}`}
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-slate-700">
                {health?.models_loaded ? 'Models ready' : 'Models offline'}
              </span>
              {health?.models_loaded ? (
                <Wifi className="w-4 h-4 text-green-500" aria-hidden="true" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" aria-hidden="true" />
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {showRefresh && onRefresh && (
                <button
                  onClick={onRefresh}
                  className="btn-secondary p-2"
                  aria-label="Refresh model status"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              {showReportButton && onDownloadReport && (
                <button
                  onClick={onDownloadReport}
                  className="btn-secondary"
                  aria-label="Download report"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Report</span>
                </button>
              )}
              <button
                onClick={onNewAnalysis}
                className="btn-primary"
                aria-label="New analysis"
              >
                <FilePlus className="w-4 h-4" />
                <span className="hidden sm:inline">New Analysis</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}