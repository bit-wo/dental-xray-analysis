import { useState, useCallback, useRef, useEffect } from 'react';

interface ViewerState {
  scale: number;
  x: number;
  y: number;
  isPanning: boolean;
  isFullscreen: boolean;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const DEFAULT_SCALE = 1;

export function useImageViewer() {
  const [state, setState] = useState<ViewerState>({
    scale: DEFAULT_SCALE,
    x: 0,
    y: 0,
    isPanning: false,
    isFullscreen: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset view to fit container
  const resetView = useCallback(() => {
    setState(prev => ({
      ...prev,
      scale: DEFAULT_SCALE,
      x: 0,
      y: 0,
    }));
  }, []);

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
      // Trigger zoomTo logic via a micro-task
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

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = e.clientX - rect.left;
      const centerY = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = state.scale * delta;
      zoomTo(newScale, centerX, centerY);
    }
  }, [state.scale, zoomTo]);

  // Pan start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    if (state.scale <= DEFAULT_SCALE && !state.isFullscreen) return;
    
    e.preventDefault();
    panStartRef.current = { x: e.clientX, y: e.clientY };
    setState(prev => ({ ...prev, isPanning: true }));
    
    // Prevent text selection while panning
    document.body.style.userSelect = 'none';
  }, [state.scale, state.isFullscreen]);

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

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    setState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  }, []);

  // Close fullscreen on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.isFullscreen) {
        setState(prev => ({ ...prev, isFullscreen: false }));
      }
    };
    
    if (state.isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.isFullscreen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.userSelect = '';
    };
  }, []);

  const imageStyle: React.CSSProperties = {
    transform: `translate(${state.x}px, ${state.y}px) scale(${state.scale})`,
    transformOrigin: '0 0',
    maxWidth: 'none',
    maxHeight: 'none',
  };

  return {
    containerRef,
    imageRef,
    state,
    imageStyle,
    zoomTo,
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
  };
}