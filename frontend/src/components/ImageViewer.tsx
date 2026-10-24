import { useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Minimize,
} from 'lucide-react';
import { useImageViewer } from '@/hooks/useImageViewer';

interface ImageViewerProps {
  src: string;
  alt: string;
  showControls?: boolean;
  showZoomPercent?: boolean;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function ImageViewer({
  src,
  alt,
  showControls = true,
  showZoomPercent = true,
  className = '',
  onLoad,
  onError,
}: ImageViewerProps) {
  const {
    containerRef,
    imageRef,
    state,
    imageStyle,
    zoomIn,
    zoomOut,
    resetView,
    toggleFullscreen,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useImageViewer();

  const zoomPercent = Math.round(state.scale * 100);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    onLoad?.();
    // Auto-fit on first load
    if (state.scale === 1 && state.x === 0 && state.y === 0) {
      resetView();
    }
  }, [onLoad, resetView, state.scale, state.x, state.y]);

  const handleImageError = useCallback(() => {
    onError?.();
  }, [onError]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(document.activeElement) && !state.isFullscreen) return;

      switch (e.key) {
        case '=':
        case '+':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          e.preventDefault();
          resetView();
          break;
        case 'f':
          if (e.ctrlKey || e.metaKey) return;
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (state.isFullscreen) {
            toggleFullscreen();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, state.isFullscreen, zoomIn, zoomOut, resetView, toggleFullscreen]);

  const viewerContent = (
    <div
      ref={containerRef}
      className={`viewer-container rounded-lg overflow-hidden ${className}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: state.isPanning ? 'grabbing' : state.scale > 1 ? 'grab' : 'default' }}
      tabIndex={0}
      aria-label="X-ray image viewer"
      role="img"
      aria-roledescription="zoomable image"
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        style={imageStyle}
        className={`viewer-image ${state.isPanning ? 'grabbing' : ''}`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        draggable={false}
      />
    </div>
  );

  if (state.isFullscreen) {
    return (
      <>
        <div className="fullscreen-overlay" onClick={toggleFullscreen} aria-hidden="true">
          <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
            {viewerContent}
          </div>
          <button
            className="fullscreen-close btn-secondary p-2 rounded-full shadow-lg"
            onClick={toggleFullscreen}
            aria-label="Exit fullscreen"
          >
            <Minimize className="w-5 h-5" />
          </button>
          {showControls && (
            <div className="fullscreen-controls bg-white/90 backdrop-blur rounded-lg shadow-lg p-2 flex items-center gap-1">
              <button onClick={zoomOut} className="btn-secondary p-2" aria-label="Zoom out" title="Zoom out (-)">
                <ZoomOut className="w-5 h-5" />
              </button>
              <button onClick={resetView} className="btn-secondary px-3 py-2" aria-label="Reset zoom" title="Reset zoom (0)">
                <RotateCcw className="w-5 h-5" />
              </button>
              <button onClick={zoomIn} className="btn-secondary p-2" aria-label="Zoom in" title="Zoom in (+)">
                <ZoomIn className="w-5 h-5" />
              </button>
              {showZoomPercent && (
                <span className="px-3 text-sm font-mono text-slate-700 min-w-[4.5rem] text-center">
                  {zoomPercent}%
                </span>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="w-full">
      {viewerContent}
      {showControls && (
        <div className="flex items-center justify-between mt-3 gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              className="btn-secondary p-2"
              aria-label="Zoom out"
              title="Zoom out (-)"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={resetView}
              className="btn-secondary px-3 py-2"
              aria-label="Reset zoom"
              title="Reset zoom (0)"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={zoomIn}
              className="btn-secondary p-2"
              aria-label="Zoom in"
              title="Zoom in (+)"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            {showZoomPercent && (
              <span className="px-3 text-sm font-mono text-slate-700 min-w-[4.5rem] text-center border border-slate-200 rounded-lg bg-white">
                {zoomPercent}%
              </span>
            )}
          </div>
          <button
            onClick={toggleFullscreen}
            className="btn-secondary px-3 py-2 gap-2"
            aria-label="Enter fullscreen"
            title="Fullscreen (F)"
          >
            <Maximize className="w-5 h-5" />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500 text-center">
        {state.scale > 1 ? 'Drag to pan · ' : ''}Scroll to zoom · Double-click to reset · F for fullscreen
      </p>
    </div>
  );
}