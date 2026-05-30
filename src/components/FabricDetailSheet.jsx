const SOURCE_COLORS = {
  thrifted: "bg-secondary-100 text-secondary-700",
  destash: "bg-warning-100 text-warning-900",
  new: "bg-accent-100 text-accent-600",
  owned: "bg-primary-200 text-primary-700",
};

function sourceLabel(sourceType, t) {
  const map = {
    thrifted: t("closet.sourceThrifted"),
    destash: t("closet.sourceDestash"),
    new: t("closet.sourceNew"),
    owned: t("closet.sourceOwned"),
  };
  return map[sourceType] ?? sourceType ?? "—";
}

export default function FabricDetailSheet({ fabric, onClose, t }) {
  if (!fabric) return null;

  const dims =
    fabric.length_cm && fabric.width_cm
      ? `${fabric.length_cm} × ${fabric.width_cm} cm`
      : fabric.length_cm
        ? `${fabric.length_cm} cm`
        : fabric.width_cm
          ? `${fabric.width_cm} cm wide`
          : null;

  const details = [
    { label: t("closet.labelColor"),       value: fabric.color },
    { label: t("closet.labelFiberContent"), value: fabric.fiber_content },
    { label: t("closet.labelDimensions"),  value: dims },
    { label: t("closet.labelNotes"),       value: fabric.notes },
  ].filter((d) => d.value);

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end justify-center z-50">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full bg-white rounded-t-3xl px-5 pt-4 pb-10 max-h-[88%] overflow-y-auto scrollbar-hide">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-4" />

        {/* Image */}
        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-primary-200 mb-4 border border-primary-200">
          {fabric.image_url ? (
            <img
              src={fabric.image_url}
              alt={fabric.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">
              🧵
            </div>
          )}
        </div>

        {/* Name + source badge */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <h3 className="text-lg font-bold text-primary-900">{fabric.name}</h3>
          {fabric.source_type && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                SOURCE_COLORS[fabric.source_type] ?? "bg-neutral-100 text-neutral-700"
              }`}
            >
              {sourceLabel(fabric.source_type, t)}
            </span>
          )}
        </div>

        {/* Details list — mirrors AnalysisScreen's fabric details card */}
        {details.length > 0 && (
          <div className="bg-primary-100 rounded-3xl p-4 border border-primary-200 space-y-2.5">
            <p className="text-xs font-medium text-primary-700 uppercase tracking-wider mb-3">
              {t("closet.detailsTitle")}
            </p>
            {details.map((d) => (
              <div key={d.label} className="flex justify-between items-center">
                <span className="text-primary-700 text-sm">{d.label}</span>
                <span className="text-primary-800 text-sm font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-5 w-full py-3 bg-primary-700 text-primary-100 font-semibold text-sm rounded-xl active:bg-primary-800 transition-colors"
        >
          {t("closet.close")}
        </button>
      </div>
    </div>
  );
}