import { useState } from "react";
import { useLang } from "../i18n/LanguageContext";

// ── Lookup tables ─────────────────────────────────────────────────────────────
// en values match analyze.js system prompt vocabulary exactly so that
// getFabricProfile() / checkFeasibility() can process them correctly downstream.

const FABRIC_TYPES = [
  { en: "Cotton", nb: "Bomull", zh: "棉" },
  { en: "Linen", nb: "Lin", zh: "亞麻" },
  { en: "Wool", nb: "Ull", zh: "羊毛" },
  { en: "Polyester", nb: "Polyester", zh: "聚酯纖維" },
  { en: "Silk", nb: "Silke", zh: "絲綢" },
  { en: "Denim", nb: "Denim", zh: "牛仔布" },
  { en: "Knit", nb: "Strikk", zh: "針織" },
  { en: "Fleece", nb: "Fleece", zh: "刷毛布" },
];

const WEIGHT_OPTIONS = [
  { en: "Lightweight", nb: "Lett", zh: "輕薄" },
  { en: "Medium weight", nb: "Middels vekt", zh: "中等厚度" },
  { en: "Heavy", nb: "Tung", zh: "厚重" },
];

// en values match the texture vocabulary in analyze.js system prompt so that
// the isKnit / isWoven / weightClass regex in getFabricProfile() fires correctly.
const TEXTURE_OPTIONS = [
  { en: "Plain weave", nb: "Lerretsbinding", zh: "平織" },
  { en: "Twill", nb: "Kypertbinding", zh: "斜紋" },
  { en: "Jersey knit", nb: "Jerseystrikkestoff", zh: "棉毛布" },
  { en: "Ribbed knit", nb: "Ribbestrikk", zh: "羅紋針織" },
  { en: "Denim twill", nb: "Denim kypert", zh: "牛仔斜紋" },
  { en: "Fleece", nb: "Fleece", zh: "刷毛" },
  { en: "Satin", nb: "Satin", zh: "緞面" },
  { en: "Canvas", nb: "Lerret", zh: "帆布" },
  { en: "Corduroy", nb: "Kordfløyel", zh: "燈芯絨" },
];

const MATERIAL_OPTIONS = FABRIC_TYPES;

const UNKNOWN = { en: "Unknown", nb: "Ukjent", zh: "未知" };

// ── Component ─────────────────────────────────────────────────────────────────
export default function ManualFabricForm({ setManualFabric, onCancel }) {
  const { t, tl } = useLang();

  // typeChoice: one of FABRIC_TYPES (object) | "custom" | null
  const [typeChoice, setTypeChoice] = useState(null);
  const [customType, setCustomType] = useState("");
  const [weight, setWeight] = useState(null);
  const [texture, setTexture] = useState(null);
  const [composition, setComposition] = useState([
    { material: null, percentage: "" },
  ]);

  const resolvedType =
    typeChoice === "custom"
      ? customType.trim()
        ? {
            en: customType.trim(),
            nb: customType.trim(),
            zh: customType.trim(),
          }
        : null
      : typeChoice;

  const isValid = resolvedType !== null;

  // ── Composition helpers ───────────────────────────────────────────
  function addMaterial() {
    setComposition((prev) => [...prev, { material: null, percentage: "" }]);
  }

  function removeMaterial(i) {
    setComposition((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateMaterial(i, enValue) {
    const found = MATERIAL_OPTIONS.find((o) => o.en === enValue) ?? null;
    setComposition((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, material: found } : c)),
    );
  }

  function updatePercentage(i, val) {
    setComposition((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, percentage: val } : c)),
    );
  }

  // ── Submit ────────────────────────────────────────────────────────
  function handleSubmit() {
    const validParts = composition.filter(
      (c) =>
        c.material !== null && c.percentage !== "" && Number(c.percentage) > 0,
    );

    // Fall back to a single entry using the fabric type when no composition rows are filled.
    const builtComposition =
      validParts.length > 0
        ? validParts.map((c) => ({
            material: c.material,
            percentage: Number(c.percentage),
          }))
        : [{ material: resolvedType, percentage: 100 }];

    setManualFabric({
      type: resolvedType,
      color: UNKNOWN,
      composition: builtComposition,
      weight: weight ?? UNKNOWN,
      texture: texture ?? UNKNOWN,
      condition: UNKNOWN,
      tags: [],
    });
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-primary-900">
      {/* Header */}
      <div className="flex items-center px-5 pt-10 pb-4 flex-shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="w-9 h-9 bg-primary-700 rounded-full border border-primary-600 flex items-center justify-center text-primary-100 shadow-sm mr-3 flex-shrink-0"
        >
          ←
        </button>
        <div>
          <h2 className="font-semibold text-primary-100 text-base">
            {t("analysis.manualFabricTitle")}
          </h2>
          <p className="text-[11px] text-primary-100 mt-0.5">
            {t("analysis.fabricFormSubtitle")}
          </p>
        </div>
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
        {/* ── Fabric type (required) ── */}
        <section className="bg-primary-800 border border-primary-600 rounded-2xl px-4 py-4">
          <label className="block text-[11px] font-semibold text-primary-100 uppercase tracking-wider mb-3">
            {t("analysis.fabricFormTypeLabel")}
          </label>
          <div className="flex flex-wrap gap-2">
            {FABRIC_TYPES.map((ft) => (
              <button
                key={ft.en}
                type="button"
                onClick={() =>
                  setTypeChoice((prev) => (prev?.en === ft.en ? null : ft))
                }
                className={`py-1.5 px-3 rounded-full text-sm font-medium transition-colors ${
                  typeChoice?.en === ft.en
                    ? "bg-secondary-300 text-white"
                    : "bg-primary-700 text-primary-300 border border-primary-600"
                }`}
              >
                {tl(ft)}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                setTypeChoice((prev) => (prev === "custom" ? null : "custom"))
              }
              className={`py-1.5 px-3 rounded-full text-sm font-medium transition-colors ${
                typeChoice === "custom"
                  ? "bg-secondary-300 text-white"
                  : "bg-primary-700 text-primary-300 border border-primary-600"
              }`}
            >
              {t("analysis.fabricFormOtherType")}
            </button>
          </div>
          {typeChoice === "custom" && (
            <input
              type="text"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder={t("analysis.fabricFormCustomTypePlaceholder")}
              className="mt-3 w-full bg-primary-700 border border-primary-600 rounded-xl px-3 py-2.5 text-primary-100 placeholder-primary-500 text-sm outline-none focus:border-secondary-300"
              autoFocus
            />
          )}
        </section>

        {/* ── Weight (optional) ── */}
        <section className="bg-primary-800 border border-primary-600 rounded-2xl px-4 py-4">
          <label className="block text-[11px] font-semibold text-primary-100 uppercase tracking-wider mb-3">
            {t("analysis.weight")}
            <span className="ml-1.5 normal-case font-normal text-primary-600">
              {t("analysis.fabricFormOptional")}
            </span>
          </label>
          <div className="flex gap-2">
            {WEIGHT_OPTIONS.map((w) => (
              <button
                key={w.en}
                type="button"
                onClick={() =>
                  setWeight((prev) => (prev?.en === w.en ? null : w))
                }
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  weight?.en === w.en
                    ? "bg-secondary-300 text-white"
                    : "bg-primary-700 text-primary-300 border border-primary-600"
                }`}
              >
                {tl(w)}
              </button>
            ))}
          </div>
        </section>

        {/* ── Weave / texture (optional) ── */}
        <section className="bg-primary-800 border border-primary-600 rounded-2xl px-4 py-4">
          <label className="block text-[11px] font-semibold text-primary-100 uppercase tracking-wider mb-3">
            {t("analysis.weave")}
            <span className="ml-1.5 normal-case font-normal text-primary-600">
              {t("analysis.fabricFormOptional")}
            </span>
          </label>
          <select
            value={texture?.en ?? ""}
            onChange={(e) => {
              const found = TEXTURE_OPTIONS.find(
                (o) => o.en === e.target.value,
              );
              setTexture(found ?? null);
            }}
            className="w-full bg-primary-700 border border-primary-600 rounded-xl px-3 py-2.5 text-primary-100 text-sm outline-none focus:border-secondary-300"
          >
            <option value="">
              {t("analysis.fabricFormTexturePlaceholder")}
            </option>
            {TEXTURE_OPTIONS.map((o) => (
              <option key={o.en} value={o.en}>
                {tl(o)}
              </option>
            ))}
          </select>
        </section>

        {/* ── Composition (optional) ── */}
        <section className="bg-primary-800 border border-primary-600 rounded-2xl px-4 py-4">
          <label className="block text-[11px] font-semibold text-primary-100 uppercase tracking-wider mb-3">
            {t("analysis.composition")}
            <span className="ml-1.5 normal-case font-normal text-primary-600">
              {t("analysis.fabricFormOptional")}
            </span>
          </label>
          <div className="space-y-2">
            {composition.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={entry.material?.en ?? ""}
                  onChange={(e) => updateMaterial(i, e.target.value)}
                  className="flex-1 bg-primary-700 border border-primary-600 rounded-xl px-3 py-2.5 text-primary-100 text-sm outline-none focus:border-secondary-300"
                >
                  <option value="">
                    {t("analysis.fabricFormMaterialPlaceholder")}
                  </option>
                  {MATERIAL_OPTIONS.map((o) => (
                    <option key={o.en} value={o.en}>
                      {tl(o)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={entry.percentage}
                  onChange={(e) => updatePercentage(i, e.target.value)}
                  placeholder="%"
                  className="w-16 bg-primary-700 border border-primary-600 rounded-xl px-2 py-2.5 text-primary-100 text-sm text-center outline-none focus:border-secondary-300"
                />
                {composition.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMaterial(i)}
                    className="w-7 h-9 flex items-center justify-center text-primary-500 text-xl leading-none flex-shrink-0 active:text-primary-300"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addMaterial}
            className="mt-3 text-secondary-300 text-sm font-medium active:opacity-70"
          >
            {t("analysis.fabricFormAddMaterial")}
          </button>
        </section>
      </div>

      {/* Footer — always visible at the bottom */}
      <div className="px-5 pb-8 pt-3 flex-shrink-0 space-y-3 border-t border-primary-800">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid}
          className="w-full bg-secondary-300 text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform shadow-md shadow-black/20 disabled:opacity-40 disabled:active:scale-100"
        >
          {t("analysis.manualFabricConfirm")}
        </button>
        <button
          type="button"
          onClick={() => setManualFabric(null)}
          className="w-full bg-transparent text-primary-100 py-3 rounded-2xl font-medium active:scale-[0.98] transition-transform text-sm"
        >
          {t("analysis.manualFabricSkip")}
        </button>
      </div>
    </div>
  );
}
