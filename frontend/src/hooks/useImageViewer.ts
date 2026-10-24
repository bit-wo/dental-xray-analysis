import { useState, useCallback, useRef, useEffect } from 'react';

interface ViewerState {
  scale: number;
  x: number;
  y: number;
  isPanning: boolean;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const DEFAULT_SCALE = 1;

export function useImageViewer(src?: string) {
  const [state, setState] = useState<ViewerState>({
    scale: DEFAULT_SCALE,
    x: 0,
    y: 0,
    isPanning: false,
  });
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fitScale, setFitScale] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // Calculate fit scale to fit image in container
  const calculateFitScale = useCallback(() => {
    if (!containerRef.current || !imageRef.current) return 1;
    
    const container = containerRef.current;
    const image = imageRef.current;
    
    if (!image.naturalWidth || !image.naturalHeight) return 1;
    
    const containerRect = container.getBoundingClientRect();
    const scaleX = containerRect.width / image.naturalWidth;
    const scaleY = containerRect.height / image.naturalHeight;
    
    return Math.min(scaleX, scaleY, 1); // Don't upscale beyond 1x
  }, []);

  // Reset view to fit container
  const resetView = useCallback(() => {
    const fit = calculateFitScale();
    setFitScale(fit);
    setState(prev => ({
      ...prev,
      scale: fit,
      x: 0,
      y: 0,
    }));
  }, []);

  // Reset view when src changes
  useEffect(() => {
    resetView();
  }, [src, resetView]);

  // Update fit scale when container size changes (also on entering/exiting fullscreen)
  useEffect(() => {
    const fit = calculateFitScale();
    setFitScale(fit);
    setState(prev => ({
      ...prev,
      scale: fit,
      x: 0,
      y: 0,
    }));
  }, [src, isFullscreen, resetView]);

  // Zoom to specific scale, centered on a point
  const zoomTo = useCallback((scale: number, centerX?: number, centerY?: number) => {
    const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
    
    setState(prev => {
      if (!containerRef.current || !imageRef.current) return prev;
      
      const container = containerRef.current;
      const image = imageRef.current;
      
      const containerRect = container.getBoundingClientRect();
      
      // If no center point provided, use container center
      const cx = centerX ?? containerRect.width / 2;
      const cy = centerY ?? containerRect.height / 2;
      
      // Calculate new position to zoom toward center point
      const scaleRatio = clampedScale / prev.scale;
      const newX = cx - (cx - prev.x) * scaleRatio;
      const newY = cy - (cy - prev.y) * scaleRatio;
      
      // Constrain translation so image doesn't leave empty space when smaller than container
      const scaledWidth = image.naturalWidth * clampedScale;
      const scaledHeight = image.naturalHeight * clampedScale;
      
      let constrainedX = newX;
      let constrainedY = newY;
      
      if (scaledWidth <= containerRect.width) {
        constrainedX = (containerRect.width - scaledWidth) / 2;
      } else {
        constrainedX = Math.max(containerRect.width - scaledWidth, Math.min(0, newX));
      }
      
      if (scaledHeight <= containerRect.height) {
        constrainedY = (containerRect.height - scaledHeight) / 2;
      } else {
        constrainedY = Math.max(containerRect.height - scaledHeight, Math.min(0, newY));
      }
      
      return {
        ...prev,
        scale: clampedScale,
        x: constrainedX,
        y: constrainedY,
      };
    });
  }, []);

  // Zoom in/out by factor
  const zoomIn = useCallback(() => {
    setState(prev => {
      const newScale = Math.min(MAX_SCALE, prev.scale * 1.2);
      setTimeout(() => zoomTo(newScale), 0);
      return prev;
    });
  }, [zoomTo]);

  const zoomOut = useCallback(() => {
    setState(prev => {
      const newScale = Math.max(MIN_SCALE, prev.scale / 1.2);
      setTimeout(() => zoomTo(newScale), 0);
      return prev;
    });
  }, [zoomTo]);

  // Handle wheel zoom - in fullscreen, zoom without modifier; in normal mode, require Ctrl/Cmd
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isFullscreen && !(e.ctrlKey || e.metaKey)) return;
    
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = e.clientX - rect.left;
    const centerY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = state.scale * delta;
    zoomTo(newScale, centerX, centerY);
  }, [state.scale, zoomTo, isFullscreen]);

  // Pan start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    if (state.scale <= fitScale) return;
    
    e.preventDefault();
    panStartRef.current = { x: e.clientX, y: e.clientY };
    setState(prev => ({ ...prev, isPanning: true }));
    
    // Prevent text selection while panning
    document.body.style.userSelect = 'none';
  }, [state.scale, fitScale]);

  // Pan move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!state.isPanning) return;
    
    e.preventDefault();
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    
    setState(prev => {
      if (!containerRef.current || !imageRef.current) return prev;
      
      const container = containerRef.current;
      const image = imageRef.current;
      const containerRect = container.getBoundingClientRect();
      
      const scaledWidth = image.naturalWidth * prev.scale;
      const scaledHeight = image.naturalHeight * prev.scale;
      
      let newX = prev.x + dx;
      let newY = prev.y + dy;
      
      // Constrain panning
      if (scaledWidth <= containerRect.width) {
        newX = (containerRect.width - scaledWidth) / 2;
      } else {
        newX = Math.max(containerRect.width - scaledWidth, Math.min(0, newX));
      }
      
      if (scaledHeight <= containerRect.height) {
        newY = (containerRect.height - scaledHeight) / 2;
      } else {
        newY = Math.max(containerRect.height - scaledHeight, Math.min(0, newY));
      }
      
      panStartRef.current = { x: e.clientX, y: e.clientY };
      return { ...prev, x: newX, y: newY };
    });
  }, [state.isPanning]);

  // Pan end
  const handleMouseUp = useCallback(() => {
    setState(prev => ({ ...prev, isPanning: false }));
    document.body.style.userSelect = '';
  }, []);

  // Handle mouse leave during pan
  const handleMouseLeave = useCallback(() => {
    setState(prev => ({ ...prev, isPanning: false }));
    document.body.style.userSelect = '';
  }, []);

  // Touch support for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      panStartRef.current = { x: touch.clientX, y: touch.clientY };
      setState(prev => ({ ...prev, isPanning: true }));
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!state.isPanning || e.touches.length !== 1) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - panStartRef.current.x;
    const dy = touch.clientY - panStartRef.current.y;
    
    setState(prev => {
      if (!containerRef.current || !imageRef.current) return prev;
      
      const container = containerRef.current;
      const image = imageRef.current;
      const containerRect = container.getBoundingClientRect();
      
      const scaledWidth = image.naturalWidth * prev.scale;
      const scaledHeight = image.naturalHeight * prev.scale;
      
      let newX = prev.x + dx;
      let newY = prev.y + dy;
      
      if (scaledWidth <= containerRect.width) {
        newX = (containerRect.width - scaledWidth) / 2;
      } else {
        newX = Math.max(containerRect.width - scaledWidth, Math.min(0, newX));
      }
      
      if (scaledHeight <= containerRect.height) {
        newY = (containerRect.height - scaledHeight) / 2;
      } else {
        newY = Math.max(containerRect.height - scaledHeight, Math.min(0, newY));
      }
      
      panStartRef.current = { x: touch.clientX, y: touch.clientY };
      return { ...prev, x: newX, y: newY };
    });
  }, [state.isPanning]);

  const handleTouchEnd = useCallback(() => {
    setState(prev => ({ ...prev, isPanning: false }));
  }, []);

  // Fullscreen handling using native browser API on wrapper element
  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    
    if (!isFullscreen) {
      // Enter fullscreen
      const element = wrapperRef.current;
      element.requestFullscreen().catch(() => {
        // Fullscreen request failed
      });
    } else {
      // Exit fullscreen
      document.exitFullscreen().catch(() => {
        // Exit fullscreen failed
      });
    }
  }, [isFullscreen]);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      if (!isNowFullscreen) {
        // Reset zoom and pan when exiting fullscreen
        resetView();
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [resetView]);

  // Close fullscreen on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
    
    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      document.body.style.userSelect = '';
    };
  }, []);

  // Determine if we're zoomed beyond fit
  const isZoomed = state.scale > fitScale;

  // Image style: use object-fit: contain when not zoomed, transform when zoomed
  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: isZoomed ? 'none' : 'contain',
    transform: isZoomed ? `translate(${state.x}px, ${state.y}px) scale(${state.scale / fitScale})` : 'none',
    transformOrigin: '0 0',
  };

  return {
    containerRef,
    imageRef,
    wrapperRef,
    state,
    imageStyle,
    zoomTo,
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
  };
}