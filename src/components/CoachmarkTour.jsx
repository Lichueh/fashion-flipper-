import { useState, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLang } from "../i18n/LanguageContext";

// Spotlight + tooltip tour. Rendered via React portal to <body> so the
// overlay escapes any ancestor that might create a containing block for
// `position: fixed` (transforms, filters, contain, will-change). All
// children are positioned with `position: fixed` at viewport coordinates,
// so we don't depend on `h-full` chains through `position: fixed` ancestors
// — that chain is unreliable on iOS WKWebView (Safari, Chrome iOS, WeChat).
//
// steps: [{ target, radius?, placement? }]
//   target    — CSS selector for the element to highlight
//   radius    — border-radius for the cutout (px, default 16)
//   placement — "above" | "below" | "auto" (default "auto")
export default function CoachmarkTour({ steps, onDone }) {
  const { t } = useLang();
  const [idx, setIdx] = useState(0);
  const [bound, setBound] = useState(null); // viewport-coord box: {top,left,w,h}
  const [rect, setRect] = useState(null); // target rect in viewport coords
  const [tipH, setTipH] = useState(0);
  const tipRef = useRef(null);

  const step = steps[idx];
  const isLast = idx === steps.length - 1;

  // PhoneFrame renders both the desktop and mobile branches in the DOM, with
  // one hidden via Tailwind classes — its descendants have zero-sized rects.
  // Pick the first matching element with non-zero dimensions so we always
  // hit the visible copy of the target.
  function findVisible(selector) {
    const candidates = document.querySelectorAll(selector);
    for (const el of candidates) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
    return null;
  }

  // The tour's bounding box in viewport coords.
  //   Desktop (≥ sm): the PhoneFrame's content container marked data-tour-frame.
  //   Mobile (< sm): the full visible viewport.
  function getBound() {
    const isMobile = window.matchMedia("(max-width: 639px)").matches;
    if (isMobile) {
      return {
        top: 0,
        left: 0,
        w: window.innerWidth,
        h: window.innerHeight,
      };
    }
    const el = findVisible("[data-tour-frame]");
    if (el) {
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, w: r.width, h: r.height };
    }
    // Fallback: full viewport.
    return {
      top: 0,
      left: 0,
      w: window.innerWidth,
      h: window.innerHeight,
    };
  }

  useLayoutEffect(() => {
    function measure() {
      setBound(getBound());
      const target = findVisible(step.target);
      if (!target) {
        setRect(null);
        return;
      }
      const tr = target.getBoundingClientRect();
      setRect({ top: tr.top, left: tr.left, w: tr.width, h: tr.height });
    }
    measure();
    const raf = requestAnimationFrame(measure);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    const ros = [];
    if (typeof ResizeObserver !== "undefined") {
      const target = findVisible(step.target);
      if (target) {
        const ro = new ResizeObserver(measure);
        ro.observe(target);
        ros.push(ro);
      }
    }

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      cancelAnimationFrame(raf);
      ros.forEach((r) => r.disconnect());
    };
  }, [step.target]);

  useLayoutEffect(() => {
    if (tipRef.current) {
      setTipH(tipRef.current.getBoundingClientRect().height);
    }
  }, [idx, bound?.w, rect?.top, rect?.left]);

  if (!bound) return null;

  // All positions in VIEWPORT coords from here on.
  const PAD = 8;
  const spot = rect && {
    top: rect.top - PAD,
    left: rect.left - PAD,
    w: rect.w + PAD * 2,
    h: rect.h + PAD * 2,
  };

  // Auto-placement: above if target's center is in the bottom half of the
  // bounding box.
  let placeBelow = true;
  if (rect) {
    const centerY = rect.top + rect.h / 2;
    const boundCenterY = bound.top + bound.h / 2;
    placeBelow = step.placement
      ? step.placement === "below"
      : centerY < boundCenterY;
  }

  const GAP = 14;
  const MARGIN = 16;
  const SAFE_BOTTOM = 12;
  const SAFE_TOP = 12;

  // Tooltip top in viewport coords.
  let tipTop = null;
  if (rect) {
    if (placeBelow) {
      tipTop = rect.top + rect.h + GAP;
    } else {
      tipTop = rect.top - GAP - (tipH || 140);
    }
    if (tipH > 0) {
      const minTop = bound.top + SAFE_TOP;
      const maxTop = bound.top + bound.h - tipH - SAFE_BOTTOM;
      if (maxTop > minTop) {
        tipTop = Math.max(minTop, Math.min(tipTop, maxTop));
      }
    }
  }
  const tipLeft = bound.left + MARGIN;
  const tipWidth = Math.max(0, bound.w - MARGIN * 2);

  let arrowLeft = null;
  if (rect && tipWidth > 0) {
    const targetCenterX = rect.left + rect.w / 2;
    arrowLeft = Math.max(18, Math.min(tipWidth - 18, targetCenterX - tipLeft));
  }
  const arrowOnTop = placeBelow;

  const content = (
    // Wrapper covers the bound rect, with overflow-hidden so the spot's
    // box-shadow dim doesn't leak past the phone frame on desktop.
    <div
      className="fixed z-[100] overflow-hidden"
      style={{
        top: bound.top,
        left: bound.left,
        width: bound.w,
        height: bound.h,
        pointerEvents: "auto",
      }}
    >
      {/* Backdrop */}
      {spot ? (
        <div
          className="absolute"
          style={{
            top: spot.top - bound.top,
            left: spot.left - bound.left,
            width: spot.w,
            height: spot.h,
            borderRadius: step.radius ?? 16,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            transition:
              "top 220ms ease, left 220ms ease, width 220ms ease, height 220ms ease, border-radius 220ms ease",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/55" />
      )}

      {/* Pulsing ring */}
      {spot && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: spot.top - bound.top - 2,
            left: spot.left - bound.left - 2,
            width: spot.w + 4,
            height: spot.h + 4,
            borderRadius: (step.radius ?? 16) + 2,
            border: "2px solid rgba(255,255,255,0.85)",
            transition:
              "top 220ms ease, left 220ms ease, width 220ms ease, height 220ms ease, border-radius 220ms ease",
          }}
        />
      )}

      {/* Skip */}
      <button
        type="button"
        onClick={onDone}
        className="absolute left-3 bg-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm active:scale-95 transition-transform"
        style={{
          top: "calc(env(safe-area-inset-top, 0px) + 12px)",
        }}
      >
        {t("walkthrough.skip")}
      </button>

      {/* Tooltip */}
      {rect && (
        <div
          ref={tipRef}
          className="absolute bg-white rounded-2xl shadow-2xl p-4 fade-in"
          style={{
            top: (tipTop ?? bound.top + bound.h * 0.4) - bound.top,
            left: tipLeft - bound.left,
            width: tipWidth,
          }}
          key={idx}
        >
          {arrowLeft != null && (
            <span
              aria-hidden="true"
              className="absolute block w-3 h-3 bg-white rotate-45"
              style={{
                left: arrowLeft - 6,
                [arrowOnTop ? "top" : "bottom"]: -6,
                boxShadow: arrowOnTop
                  ? "-2px -2px 3px -2px rgba(0,0,0,0.15)"
                  : "2px 2px 3px -2px rgba(0,0,0,0.15)",
              }}
            />
          )}

          <p className="text-secondary-900 font-bold text-base mb-1">
            {t(`walkthrough.step${idx + 1}.title`)}
          </p>
          <p className="text-secondary-700 text-sm leading-5 mb-3">
            {t(`walkthrough.step${idx + 1}.body`)}
          </p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx ? "w-5 bg-secondary-300" : "w-1.5 bg-stone-300"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => setIdx(idx - 1)}
                  className="text-stone-500 text-sm font-medium px-3 py-1.5 active:scale-95 transition-transform"
                >
                  {t("walkthrough.back")}
                </button>
              )}
              <button
                type="button"
                onClick={() => (isLast ? onDone() : setIdx(idx + 1))}
                className="bg-secondary-300 text-secondary-900 text-sm font-bold px-4 py-1.5 rounded-full shadow-sm active:scale-95 transition-transform"
              >
                {isLast ? t("walkthrough.done") : t("walkthrough.next")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
