import { useState, useRef } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useLang } from "../i18n/LanguageContext";

/**
 * Ruler-based scale calibration screen.
 *
 * Workflow: user lays a physical ruler in the same plane as the garment when
 * taking the photo, then comes here, taps two points along the ruler, and
 * enters the real-world distance between them. We derive cm-per-natural-pixel
 * (scaleCmPerImagePx) and forward it to the analysis pipeline.
 *
 * Photo viewer supports pinch-to-zoom and pan (react-zoom-pan-pinch). Marker
 * positions are stored in normalized [0,1] image coordinates so they stay
 * aligned with the underlying image at any zoom level. Coordinate math uses
 * imgRef.getBoundingClientRect() — that rect reflects the *currently
 * transformed* image bounds, so dividing the tap position by it always yields
 * the correct natural-image fraction regardless of how zoomed the user is.
 */
export default function RulerCalibrationScreen({
  navigate,
  uploadedImage,
  uploadedFile,
  hasLayers,
}) {
  const { t } = useLang();
  const imgRef = useRef(null);
  const [points, setPoints] = useState([]); // [{x:0..1, y:0..1}, ...]
  const [knownCm, setKnownCm] = useState("10");

  // Custom tap detection — react-zoom-pan-pinch swallows onClick because it
  // intercepts touch events for pan/pinch. We listen to pointer events
  // ourselves and only treat the gesture as a "tap" when finger movement
  // stayed below a few pixels and the press lasted under ~350ms.
  const tapState = useRef({ x: 0, y: 0, t: 0, moved: false, active: false });

  const placeMarkerFromEvent = (clientX, clientY) => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    setPoints((prev) =>
      prev.length >= 2 ? [{ x, y }] : [...prev, { x, y }],
    );
  };

  const onPointerDown = (e) => {
    if (!e.isPrimary) return;
    tapState.current = {
      x: e.clientX,
      y: e.clientY,
      t: Date.now(),
      moved: false,
      active: true,
    };
  };

  const onPointerMove = (e) => {
    const s = tapState.current;
    if (!s.active || !e.isPrimary) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.sqrt(dx * dx + dy * dy) > 6) s.moved = true;
  };

  const onPointerUp = (e) => {
    const s = tapState.current;
    if (!s.active || !e.isPrimary) return;
    s.active = false;
    if (s.moved) return; // it was a pan — not a tap
    if (Date.now() - s.t > 350) return; // long-press, ignore
    placeMarkerFromEvent(e.clientX, e.clientY);
  };

  const onPointerCancel = () => {
    tapState.current.active = false;
  };

  const reset = () => setPoints([]);

  const cmValue = parseFloat(knownCm);
  const isReady = points.length === 2 && cmValue > 0;

  const confirm = () => {
    const img = imgRef.current;
    if (!isReady || !img) return;
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    if (!W || !H) return;
    const [p1, p2] = points;
    const dxPx = (p2.x - p1.x) * W;
    const dyPx = (p2.y - p1.y) * H;
    const distPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
    if (distPx < 1) return;

    const scaleCmPerImagePx = cmValue / distPx;

    navigate("analysis", {
      image: uploadedImage,
      imageFile: uploadedFile,
      lengthGarment: null,
      scaleCmPerImagePx,
      imageWidth: W,
      hasLayers,
    });
  };

  // Connecting line in normalized space (lives inside the same transform as
  // the image, so it scales with the photo automatically).
  const lineStyle =
    points.length === 2
      ? (() => {
          const [p1, p2] = points;
          const cx = ((p1.x + p2.x) / 2) * 100;
          const cy = ((p1.y + p2.y) / 2) * 100;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angleRad = Math.atan2(dy, dx);
          return {
            position: "absolute",
            left: `${cx}%`,
            top: `${cy}%`,
            width: `${len * 100}%`,
            height: "2px",
            transform: `translate(-50%, -50%) rotate(${angleRad}rad)`,
            transformOrigin: "center",
            background: "#fbbf24",
            pointerEvents: "none",
          };
        })()
      : null;

  return (
    <div className="h-full flex flex-col bg-primary-900">
      {/* Header */}
      <div className="flex items-center px-5 pt-8 pb-3">
        <button
          onClick={() => navigate("upload")}
          className="w-9 h-9 bg-primary-700 rounded-full border border-primary-600 flex items-center justify-center text-primary-100 shadow-sm mr-3"
        >
          ←
        </button>
        <h2 className="font-semibold text-primary-100 flex-1">
          {t("ruler.title")}
        </h2>
        {points.length > 0 && (
          <button
            onClick={reset}
            className="text-primary-300 text-xs underline"
          >
            {t("common.reset")}
          </button>
        )}
      </div>

      {/* Hint */}
      <div className="px-5 pb-3">
        <p className="text-primary-200 text-xs leading-4">
          {points.length === 0
            ? t("ruler.hintTapFirst")
            : points.length === 1
              ? t("ruler.hintTapSecond")
              : t("ruler.hintEnterCm")}
        </p>
        <p className="text-primary-300 text-[10px] leading-4 mt-1">
          {t("ruler.zoomHint")}
        </p>
      </div>

      {/* Photo viewer with pinch-zoom + pan */}
      <div className="flex-1 px-3 overflow-hidden flex items-stretch">
        {uploadedImage ? (
          <div className="relative w-full bg-black/30 rounded-2xl overflow-hidden">
            <TransformWrapper
              minScale={1}
              maxScale={8}
              initialScale={1}
              centerOnInit
              doubleClick={{ disabled: true }}
              panning={{ velocityDisabled: true, excluded: ["__ignore__"] }}
              wheel={{ step: 0.2 }}
            >
              {({ resetTransform, zoomIn, zoomOut }) => (
                <>
                  <TransformComponent
                    wrapperClass="!w-full !h-full"
                    contentClass="!w-full !h-full !flex !items-center !justify-center"
                  >
                    <div
                      className="relative inline-block"
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerCancel={onPointerCancel}
                    >
                      <img
                        ref={imgRef}
                        src={uploadedImage}
                        alt="garment"
                        draggable={false}
                        className="block max-w-[88vw] max-h-[55vh] object-contain select-none cursor-crosshair touch-none"
                      />

                      {lineStyle && <div style={lineStyle} />}

                      {points.map((p, i) => (
                        <div
                          key={i}
                          style={{
                            position: "absolute",
                            left: `${p.x * 100}%`,
                            top: `${p.y * 100}%`,
                            transform: "translate(-50%, -50%)",
                            pointerEvents: "none",
                          }}
                          className="flex items-center justify-center"
                        >
                          {/* Outer ring for visibility */}
                          <div className="w-7 h-7 rounded-full border-2 border-amber-400 bg-amber-400/15 shadow-lg" />
                          {/* Number badge */}
                          <span className="absolute -top-4 -right-4 w-4 h-4 rounded-full bg-amber-400 text-[9px] font-bold text-primary-900 flex items-center justify-center">
                            {i + 1}
                          </span>
                          {/* Precise center crosshair — this is the actual measured point */}
                          <div className="absolute w-[2px] h-3 bg-amber-300" />
                          <div className="absolute h-[2px] w-3 bg-amber-300" />
                          <div className="absolute w-[3px] h-[3px] rounded-full bg-amber-300" />
                        </div>
                      ))}
                    </div>
                  </TransformComponent>

                  {/* Zoom controls — outside TransformComponent so they don't scale */}
                  <div className="absolute right-2 bottom-2 flex flex-col gap-1.5">
                    <button
                      onClick={() => zoomIn(0.5)}
                      className="w-9 h-9 rounded-full bg-primary-900/85 backdrop-blur-sm text-primary-100 text-lg font-bold shadow-md active:scale-95"
                      aria-label="Zoom in"
                    >
                      +
                    </button>
                    <button
                      onClick={() => zoomOut(0.5)}
                      className="w-9 h-9 rounded-full bg-primary-900/85 backdrop-blur-sm text-primary-100 text-lg font-bold shadow-md active:scale-95"
                      aria-label="Zoom out"
                    >
                      −
                    </button>
                    <button
                      onClick={() => resetTransform()}
                      className="w-9 h-9 rounded-full bg-primary-900/85 backdrop-blur-sm text-primary-100 text-sm shadow-md active:scale-95"
                      aria-label="Reset zoom"
                    >
                      ↺
                    </button>
                  </div>
                </>
              )}
            </TransformWrapper>
          </div>
        ) : (
          <div className="m-auto w-64 h-64 bg-primary-800 rounded-2xl flex items-center justify-center text-primary-300 text-sm">
            {t("ruler.noImage")}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-primary-100 rounded-t-3xl mt-3 px-5 pt-5 pb-7">
        <p className="text-primary-900 font-semibold text-sm mb-2">
          {t("ruler.knownDistanceLabel")}
        </p>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            value={knownCm}
            onChange={(e) => setKnownCm(e.target.value)}
            className="flex-1 bg-white border border-primary-300 rounded-xl px-3 py-2 text-sm text-primary-900 outline-none focus:border-secondary-300"
          />
          <span className="text-primary-800 font-semibold text-sm">cm</span>
        </div>

        <button
          onClick={confirm}
          disabled={!isReady}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
            isReady
              ? "bg-secondary-300 text-white active:scale-[0.98] shadow-md"
              : "bg-primary-300 text-primary-700 cursor-not-allowed"
          }`}
        >
          {points.length < 2
            ? t("ruler.placePointsCta")
            : !cmValue
              ? t("ruler.enterCmCta")
              : t("ruler.confirmCta")}
        </button>
      </div>
    </div>
  );
}
