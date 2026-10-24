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
    wrapperRef,
    state,
    imageStyle,
    zoomIn,
    zoomOut,
    resetView,
    toggleFullscreen,
    isFullscreen,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useImageViewer(src);

  // Handle image load - defined before viewerContent to avoid "used before declaration"
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
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(document.activeElement) && !isFullscreen) return;

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
          if (isFullscreen) {
            toggleFullscreen();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [wrapperRef, isFullscreen, zoomIn, zoomOut, resetView, toggleFullscreen]);

  const viewerContent = (
    <div
      ref={containerRef}
      className={`viewer-container rounded-lg overflow-hidden ${isFullscreen ? 'w-full flex-1 min-h-0' : className}`}
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

  // Always render the viewer content, but conditionally show controls
  // The wrapperRef is used for fullscreen, so it wraps everything
  const zoomPercent = Math.round(state.scale * 100);

  return (
    <div ref={wrapperRef} className={isFullscreen ? 'w-full h-full flex flex-col' : 'w-full'}>
      {viewerContent}
      {!isFullscreen && showControls && (
        <div className="flex justify-end mt-3">
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
      {isFullscreen && showControls && (
        <>
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-50 bg-white/95 backdrop-blur rounded-lg shadow-lg p-2">
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
            <button
              onClick={toggleFullscreen}
              className="btn-secondary px-3 py-2 gap-2"
              aria-label="Exit fullscreen"
              title="Exit fullscreen (Esc)"
            >
              <Minimize className="w-5 h-5" />
              <span className="hidden sm:inline">Exit Fullscreen</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}