import { useState } from "react";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../context/AuthContext";
import useFabrics from "../hooks/useFabrics";
import { useLang } from "../i18n/LanguageContext";

// ── Source badge colours ──────────────────────────────────────────────────────
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

// ── Icons ─────────────────────────────────────────────────────────────────────
function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

// ── FabricCard ────────────────────────────────────────────────────────────────
function FabricCard({ fabric, onDelete, t }) {
  const dims =
    fabric.length_cm && fabric.width_cm
      ? `${fabric.length_cm} × ${fabric.width_cm} cm`
      : fabric.length_cm
        ? `${fabric.length_cm} cm`
        : fabric.width_cm
          ? `${fabric.width_cm} cm wide`
          : null;

  return (
    <div className="bg-primary-100 rounded-2xl border border-primary-200 p-4 flex gap-3 items-start active:scale-[0.98] transition-transform">
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap mb-1">
          <span className="font-semibold text-primary-900 text-sm leading-snug">
            {fabric.name}
          </span>
          {fabric.source_type && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                SOURCE_COLORS[fabric.source_type] ??
                "bg-neutral-100 text-neutral-700"
              }`}
            >
              {sourceLabel(fabric.source_type, t)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-primary-500">
          {fabric.color && <span>{fabric.color}</span>}
          {fabric.fiber_content && <span>{fabric.fiber_content}</span>}
          {dims && <span>{dims}</span>}
        </div>
        {fabric.notes && (
          <p className="text-xs text-primary-500 mt-1.5 line-clamp-2">
            {fabric.notes}
          </p>
        )}
      </div>
      <button
        onClick={() => onDelete(fabric.id)}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-error-200 hover:bg-error-50 active:bg-error-100 transition-colors"
        aria-label={t("closet.delete")}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

// ── AddFabricModal ────────────────────────────────────────────────────────────
const INPUT_CLS =
  "w-full bg-primary-50 border border-primary-200 rounded-xl px-3 py-2 text-sm text-primary-900 placeholder-primary-300 focus:outline-none focus:border-primary-500";
const LABEL_CLS =
  "block text-[11px] font-semibold text-primary-600 uppercase tracking-wider mb-1";

function AddFabricModal({ t, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    source_type: "thrifted",
    color: "",
    fiber_content: "",
    length_cm: "",
    width_cm: "",
    notes: "",
    image_url: "",
  });

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit({
      name: form.name.trim(),
      source_type: form.source_type || null,
      color: form.color.trim() || null,
      fiber_content: form.fiber_content.trim() || null,
      length_cm: form.length_cm !== "" ? Number(form.length_cm) : null,
      width_cm: form.width_cm !== "" ? Number(form.width_cm) : null,
      notes: form.notes.trim() || null,
      image_url: form.image_url.trim() || null,
    });
  }

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end justify-center z-50">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Bottom sheet */}
      <form
        onSubmit={handleSubmit}
        className="relative w-full bg-white rounded-t-3xl px-5 pt-4 pb-8 max-h-[88%] overflow-y-auto scrollbar-hide"
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-primary-900">
            {t("closet.formTitle")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-neutral-500 active:text-neutral-700"
          >
            {t("closet.cancel")}
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className={LABEL_CLS}>
              {t("closet.labelName")} <span className="text-error-200">*</span>
            </label>
            <input
              className={INPUT_CLS}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Blue denim remnant"
              required
              autoFocus
            />
          </div>

          {/* Source type */}
          <div>
            <label className={LABEL_CLS}>{t("closet.labelSourceType")}</label>
            <select
              className={INPUT_CLS}
              value={form.source_type}
              onChange={(e) => set("source_type", e.target.value)}
            >
              <option value="thrifted">{t("closet.sourceThrifted")}</option>
              <option value="destash">{t("closet.sourceDestash")}</option>
              <option value="new">{t("closet.sourceNew")}</option>
              <option value="owned">{t("closet.sourceOwned")}</option>
            </select>
          </div>

          {/* Color + Fibre content */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>{t("closet.labelColor")}</label>
              <input
                className={INPUT_CLS}
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
                placeholder="e.g. Navy"
              />
            </div>
            <div>
              <label className={LABEL_CLS}>
                {t("closet.labelFiberContent")}
              </label>
              <input
                className={INPUT_CLS}
                value={form.fiber_content}
                onChange={(e) => set("fiber_content", e.target.value)}
                placeholder="e.g. 100% cotton"
              />
            </div>
          </div>

          {/* Length + Width */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>{t("closet.labelLengthCm")}</label>
              <input
                className={INPUT_CLS}
                type="number"
                min="0"
                step="0.1"
                value={form.length_cm}
                onChange={(e) => set("length_cm", e.target.value)}
                placeholder="150"
              />
            </div>
            <div>
              <label className={LABEL_CLS}>{t("closet.labelWidthCm")}</label>
              <input
                className={INPUT_CLS}
                type="number"
                min="0"
                step="0.1"
                value={form.width_cm}
                onChange={(e) => set("width_cm", e.target.value)}
                placeholder="110"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={LABEL_CLS}>{t("closet.labelNotes")}</label>
            <textarea
              className={`${INPUT_CLS} resize-none`}
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="e.g. Pre-washed, slight stretch"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className={LABEL_CLS}>{t("closet.labelImageUrl")}</label>
            <input
              className={INPUT_CLS}
              type="url"
              value={form.image_url}
              onChange={(e) => set("image_url", e.target.value)}
              placeholder="https://…"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!form.name.trim()}
            className="w-full py-3 bg-primary-700 text-primary-100 font-semibold text-sm rounded-xl active:bg-primary-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("closet.save")}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ClosetScreen({ navigate, activeProfile }) {
  const { user } = useAuth();
  const { t } = useLang();
  const { fabrics, loading, error, initialized, addFabric, deleteFabric } =
    useFabrics(user?.id);
  return (
    <div className="relative h-full flex flex-col bg-primary-800">
      {/* Header */}
      <div className="px-5 pt-8 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-primary-100">
            {t("closet.title")}
          </h2>
          <button
            onClick={() => navigate("upload")}
            className="w-9 h-9 bg-primary-700 rounded-full border border-primary-600 flex items-center justify-center text-primary-100 shadow-sm active:bg-primary-600 transition-colors"
            aria-label={t("closet.addFabric")}
          >
            <PlusIcon />
          </button>
        </div>
        <p className="text-[11px] font-semibold text-primary-300 uppercase tracking-widest">
          {t("closet.fabrics")}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 scrollbar-hide">
        {loading && !initialized ? (
          /* Loading */
          <div className="flex items-center justify-center h-40">
            <p className="text-primary-300 text-sm">{t("closet.loading")}</p>
          </div>
        ) : error ? (
          /* Error */
          <div className="mx-auto mt-8 max-w-xs bg-error-50 border border-error-100 rounded-2xl p-5 text-center">
            <span className="text-4xl mb-3 block">⚠️</span>
            <p className="text-error-500 text-sm font-medium">
              {t("closet.errorLoad")}
            </p>
          </div>
        ) : fabrics.length === 0 ? (
          /* Empty */
          <div className="flex flex-col items-center justify-center h-52 text-center px-6">
            <span className="text-5xl mb-3">🧵</span>
            <p className="text-primary-300 text-sm font-medium">
              {t("closet.emptyTitle")}
            </p>
            <p className="text-primary-500 text-xs mt-1">
              {t("closet.emptyHint")}
            </p>
            <button
              onClick={() => navigate("upload")}
              className="mt-5 px-5 py-2 bg-primary-700 text-primary-100 text-sm font-semibold rounded-xl active:bg-primary-600 transition-colors"
            >
              {t("closet.addFabric")}
            </button>
          </div>
        ) : (
          /* Fabric list */
          <div className="flex flex-col gap-3 pt-1 pb-4">
            {fabrics.map((fabric) => (
              <FabricCard
                key={fabric.id}
                fabric={fabric}
                onDelete={deleteFabric}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav
        current="closet"
        navigate={navigate}
        activeProfile={activeProfile}
      />
    </div>
  );
}
