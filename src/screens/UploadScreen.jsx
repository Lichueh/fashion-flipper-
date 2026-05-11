import { useState, useRef } from "react";
import { analyzeFabric } from "../services/fabricAnalysis";
import { useLang } from "../i18n/LanguageContext";

export default function UploadScreen({ navigate }) {
  const { t } = useLang();
  const [preview, setPreview] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [manualCm, setManualCm] = useState("");
  const [hasLayers, setHasLayers] = useState(true);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    setPreview(URL.createObjectURL(file));
    analyzeFabric(file);
  };

  return (
    <div className="h-full flex flex-col bg-primary-800">
      {/* Header */}
      <div className="flex items-center px-5 pt-8 pb-4">
        <button
          onClick={() => navigate("home")}
          className="w-9 h-9 bg-primary-700 rounded-full border border-primary-600 flex items-center justify-center text-primary-100 shadow-sm mr-3"
        >
          ←
        </button>
        <h2 className="font-semibold text-primary-100">{t("upload.title")}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <p className="text-primary-100 text-sm mb-5 leading-5">
          {t("upload.intro")}
        </p>

        {/* Upload zone */}
        <div
          onClick={() => fileRef.current?.click()}
          className={`relative rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all mb-5 overflow-hidden ${
            preview
              ? "border-secondary-300 h-72"
              : "border-primary-100 bg-primary-100 h-52 active:scale-[0.98]"
          }`}
        >
          {preview ? (
            <>
              <img
                src={preview}
                alt="preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-end justify-center pb-4 bg-gradient-to-t from-black/40 to-transparent">
                <span className="bg-primary-900/60 backdrop-blur-sm text-primary-100 text-xs font-medium px-4 py-1.5 rounded-full">
                  {t("upload.reselect")}
                </span>
              </div>
              <div className="absolute top-3 right-3 w-7 h-7 bg-secondary-300 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">✓</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 text-center">
              <div className="w-16 h-16 bg-secondary-200 rounded-2xl flex items-center justify-center text-4xl mb-1">
                📷
              </div>
              <p className="text-primary-800 font-medium text-sm">
                {t("upload.tapToTake")}
              </p>
              <p className="text-primary-700 text-xs">
                {t("upload.formatHint")}
              </p>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />

        {/* Measurement card */}
        <div className="bg-primary-100 rounded-2xl p-4 mb-5">
          <p className="text-primary-900 font-semibold text-sm mb-1">
            {t("upload.garmentMeasure")}
          </p>
          <p className="text-primary-700 text-xs leading-4 mb-3">
            {t("upload.garmentMeasureHint")}
          </p>

          {/* AR option */}
          <button
            onClick={() =>
              preview &&
              navigate("arMeasure", {
                image: preview,
                imageFile: uploadedFile,
              })
            }
            disabled={!preview}
            className={`w-full flex items-center justify-between gap-2 rounded-xl px-4 py-3 mb-2 transition-all ${
              preview
                ? "bg-secondary-300 text-white active:scale-[0.98] shadow-sm"
                : "bg-primary-200 text-primary-700 cursor-not-allowed"
            }`}
          >
            <div className="text-left">
              <p className="font-bold text-sm leading-tight">
                {t("upload.arOptionTitle")}
              </p>
              <p className="text-[10px] leading-tight opacity-80">
                {t("upload.arOptionHint")}
              </p>
            </div>
            <span className="text-base font-bold">→</span>
          </button>

          {/* Ruler option */}
          <button
            onClick={() =>
              preview &&
              navigate("rulerCalibrate", {
                image: preview,
                imageFile: uploadedFile,
                hasLayers,
              })
            }
            disabled={!preview}
            className={`w-full flex items-center justify-between gap-2 rounded-xl px-4 py-3 mb-2 transition-all ${
              preview
                ? "bg-primary-800 text-primary-100 active:scale-[0.98] shadow-sm"
                : "bg-primary-200 text-primary-700 cursor-not-allowed"
            }`}
          >
            <div className="text-left">
              <p className="font-bold text-sm leading-tight">
                {t("upload.rulerOptionTitle")}
              </p>
              <p className="text-[10px] leading-tight opacity-80">
                {t("upload.rulerOptionHint")}
              </p>
            </div>
            <span className="text-base font-bold">→</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px bg-primary-300" />
            <span className="text-[10px] text-primary-700 font-medium uppercase tracking-wider">
              {t("common.orSeparator")}
            </span>
            <div className="flex-1 h-px bg-primary-300" />
          </div>

          {/* Manual option */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              placeholder={t("upload.manualPlaceholder")}
              value={manualCm}
              onChange={(e) => setManualCm(e.target.value)}
              className="flex-1 bg-white border border-primary-300 rounded-xl px-3 py-2 text-sm text-primary-900 outline-none focus:border-secondary-300"
            />
            <span className="text-primary-800 font-semibold text-sm">cm</span>
            <button
              onClick={() =>
                preview &&
                manualCm > 0 &&
                navigate("analysis", {
                  image: preview,
                  imageFile: uploadedFile,
                  lengthGarment: parseFloat(manualCm),
                  calibPxPerCm: null,
                })
              }
              disabled={!preview || !(manualCm > 0)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                preview && manualCm > 0
                  ? "bg-primary-800 text-primary-100 active:scale-[0.98]"
                  : "bg-primary-200 text-primary-700 cursor-not-allowed"
              }`}
            >
              →
            </button>
          </div>
        </div>

        {/* Layers toggle */}
        <div className="bg-primary-100 rounded-2xl p-4 mb-5">
          <p className="text-primary-900 font-semibold text-sm mb-1">
            {t("upload.layersTitle")}
          </p>
          <p className="text-primary-700 text-xs mb-3 leading-4">
            {t("upload.layersHint")}
          </p>
          <div className="flex gap-3">
            {[
              { label: t("upload.layersYes"), value: true },
              { label: t("upload.layersNo"), value: false },
            ].map(({ label, value }) => (
              <button
                key={String(value)}
                onClick={() => setHasLayers(value)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  hasLayers === value
                    ? "bg-secondary-300 text-white border-secondary-300"
                    : "bg-white text-primary-800 border-primary-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tips card */}
        <div className="bg-primary-100 rounded-2xl p-4 mb-6">
          <p className="text-primary-900 font-semibold text-sm mb-2">
            {t("upload.photographyTips")}
          </p>
          <ul className="space-y-1.5">
            {[t("upload.tip1"), t("upload.tip2"), t("upload.tip3")].map(
              (tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-2 text-primary-700 text-xs"
                >
                  <span className="mt-0.5 flex-shrink-0">•</span>
                  <span className="leading-4">{tip}</span>
                </li>
              ),
            )}
          </ul>
        </div>

        {!preview && (
          <p className="text-center text-primary-300 text-xs mt-4">
            {t("upload.selectFirst")}
          </p>
        )}
        {/* CTA */}
        <button
          onClick={() =>
            preview &&
            manualCm > 0 &&
            navigate("analysis", {
              image: preview,
              imageFile: uploadedFile,
              lengthGarment: parseFloat(manualCm),
              hasLayers,
            })
          }
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
            preview && manualCm > 0
              ? "bg-secondary-300 text-white active:scale-[0.98] shadow-md shadow-black/20"
              : "bg-primary-700 text-accent-100 cursor-not-allowed"
          }`}
        >
          {preview && manualCm > 0
            ? "🔍 Start AI Analysis"
            : preview
              ? "Enter garment measurement"
              : "Please select a photo first"}
        </button>
      </div>
    </div>
  );
}
