import { useEffect, useRef, useState, useCallback } from "react";

// Two-finger pinch-zoom for AR overlays. Attaches passive: false touch
// listeners to the target element so the page doesn't scroll/zoom while
// the user is pinching the overlay layer. Single-finger gestures pass
// through unaffected so existing drag handlers keep working.
export default function usePinchScale(
  targetRef,
  { min = 0.5, max = 2.5, enabled = true } = {},
) {
  const [scale, setScale] = useState(1);
  const [isScaling, setIsScaling] = useState(false);
  const scaleRef = useRef(1);
  scaleRef.current = scale;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    let initialDist = 0;
    let initialScale = 1;
    let pendingScale = null;
    let rafId = null;

    function dist(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    // Coalesce many touchmove events into at most one React update per frame.
    // Drops sub-frame thrash that iOS Safari surfaces as flicker.
    function flushScale() {
      rafId = null;
      if (pendingScale != null) {
        setScale(pendingScale);
        pendingScale = null;
      }
    }
    function queueScale(next) {
      pendingScale = next;
      if (rafId == null) rafId = requestAnimationFrame(flushScale);
    }

    function onTouchStart(e) {
      if (!enabledRef.current) return;
      if (e.touches.length === 2) {
        e.preventDefault();
        initialDist = dist(e.touches);
        initialScale = scaleRef.current;
        setIsScaling(true);
      }
    }
    function onTouchMove(e) {
      if (!enabledRef.current) return;
      if (e.touches.length === 2 && initialDist > 0) {
        e.preventDefault();
        const ratio = dist(e.touches) / initialDist;
        const next = Math.max(min, Math.min(max, initialScale * ratio));
        queueScale(next);
      }
    }
    function onTouchEnd(e) {
      if (e.touches.length < 2) {
        setIsScaling(false);
        initialDist = 0;
        if (rafId != null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        if (pendingScale != null) {
          setScale(pendingScale);
          pendingScale = null;
        }
      }
    }

    // Desktop equivalent: macOS trackpad pinch (browser-emulated as wheel
    // with ctrlKey: true) and Ctrl/Cmd + scroll wheel for mouse users.
    function onWheel(e) {
      if (!enabledRef.current) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      // Negative deltaY = pinch out / scroll up = zoom in (Apple convention).
      const factor = Math.exp(-e.deltaY * 0.01);
      const next = Math.max(
        min,
        Math.min(max, (pendingScale ?? scaleRef.current) * factor),
      );
      queueScale(next);
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [targetRef, min, max]);

  const reset = useCallback(() => setScale(1), []);
  return { scale, isScaling, reset };
}
