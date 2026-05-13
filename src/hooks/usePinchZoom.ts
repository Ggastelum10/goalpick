import { useRef, useState, useEffect, useCallback } from 'react';

interface UsePinchZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  doubleTapZoom?: number;
}

export function usePinchZoom(options: UsePinchZoomOptions = {}) {
  const { minZoom = 0.2, maxZoom = 3, zoomStep = 0.2, doubleTapZoom = 2 } = options;

  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs for native event listeners (avoid stale closures)
  const zoomRef = useRef(zoom);
  const translateRef = useRef(translate);
  const lastTapRef = useRef(0);
  const panRef = useRef({ startX: 0, startY: 0, startTx: 0, startTy: 0, isPanning: false });

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { translateRef.current = translate; }, [translate]);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(maxZoom, +(prev + zoomStep).toFixed(2)));
  }, [maxZoom, zoomStep]);

  const zoomOut = useCallback(() => {
    setZoom(prev => {
      const next = Math.max(minZoom, +(prev - zoomStep).toFixed(2));
      if (next === 1) {
        setTranslate({ x: 0, y: 0 });
      }
      return next;
    });
  }, [minZoom, zoomStep]);

  // Double-tap detection + pan when zoomed
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Allow normal scrolling + disable browser double-tap zoom
    el.style.touchAction = 'manipulation';

    const PAN_THRESHOLD = 8; // px — must move this far before panning starts

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1 && zoomRef.current > 1) {
        // Record start position but DON'T preventDefault — allow taps through
        panRef.current.startX = e.touches[0].clientX;
        panRef.current.startY = e.touches[0].clientY;
        panRef.current.startTx = translateRef.current.x;
        panRef.current.startTy = translateRef.current.y;
        panRef.current.isPanning = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && zoomRef.current > 1) {
        const dx = e.touches[0].clientX - panRef.current.startX;
        const dy = e.touches[0].clientY - panRef.current.startY;
        
        // Only start panning after threshold — this lets taps/interactions work
        if (!panRef.current.isPanning) {
          if (Math.abs(dx) > PAN_THRESHOLD || Math.abs(dy) > PAN_THRESHOLD) {
            panRef.current.isPanning = true;
          } else {
            return; // Below threshold, let native behavior work
          }
        }
        
        e.preventDefault();
        setTranslate({
          x: panRef.current.startTx + dx,
          y: panRef.current.startTy + dy,
        });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const wasPanning = panRef.current.isPanning;
      panRef.current.isPanning = false;

      // Double-tap detection (only if not panning)
      if (!wasPanning && e.changedTouches.length === 1) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          e.preventDefault();
          if (zoomRef.current > 1) {
            setZoom(1);
            setTranslate({ x: 0, y: 0 });
          } else {
            setZoom(doubleTapZoom);
          }
          lastTapRef.current = 0;
        } else {
          lastTapRef.current = now;
        }
      }
      if (zoomRef.current === 1) {
        setTranslate({ x: 0, y: 0 });
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [doubleTapZoom]);

  const containerStyle: React.CSSProperties = {
    overflow: zoom !== 1 ? 'hidden' : undefined,
  };

  const contentStyle: React.CSSProperties = {
    transform: `scale(${zoom}) translate(${translate.x / zoom}px, ${translate.y / zoom}px)`,
    transformOrigin: 'top center',
    transition: 'transform 0.2s ease-out',
  };

  return {
    zoom,
    containerRef,
    containerStyle,
    contentStyle,
    resetZoom,
    zoomIn,
    zoomOut,
    isZoomed: zoom !== 1,
  };
}
