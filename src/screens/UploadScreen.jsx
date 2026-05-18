import { useState, useRef } from "react";
import { prescheduleAnalysis } from "../hooks/useAnalysisPipeline";
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
    prescheduleAnalysis(file);
    setUploadedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const canStart = preview && manualCm > 0;

  return (
    <div className="h-full flex flex-col bg-primary-800">
      {/* Header */}
      <div className="flex items-center px-5 pt-7 pb-3 shrink-0">
        <button
          onClick={() => navigate("home")}
          className="w-10 h-10 bg-primary-700 rounded-full border border-primary-600 flex items-center justify-center text-primary-100 shadow-sm mr-3"
          aria-label="Back"
        >
          ←
        </button>
        <h2 className="font-semibold text-primary-100 text-base">
          {t("upload.title")}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {/* Upload zone */}
        <div
          onClick={() => fileRef.current?.click()}
          className={`relative rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all mb-4 overflow-hidden ${
            preview
              ? "border-secondary-300 h-52"
              : "border-primary-100 bg-primary-100 h-44 active:scale-[0.98]"
          }`}
        >
          {preview ? (
            <>
              <img
                src={preview}
                alt="preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-end justify-center pb-3 bg-gradient-to-t from-black/40 to-transparent">
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
              <div className="w-14 h-14 bg-secondary-200 rounded-2xl flex items-center justify-center text-3xl">
                📷
              </div>
              <p className="text-primary-800 font-medium text-sm">
                {t("upload.intro")}
              </p>
              <p className="text-primary-700 text-xs leading-4 max-w-[240px]">
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

        {/* Layers */}
        <div className="bg-primary-100 rounded-2xl p-4 mb-4 w-full">
          <div className="mb-3">
            <p className="text-primary-900 font-semibold text-sm mb-1">
              {t("upload.layersTitle")}
            </p>
            <p className="text-primary-800 text-[11px] leading-4">
              {t("upload.layersHint")}
            </p>
          </div>

          <div className="flex gap-2 w-full">
            {[
              { label: t("upload.layersYes"), value: true },
              { label: t("upload.layersNo"), value: false },
            ].map(({ label, value }) => (
              <button
                key={String(value)}
                onClick={() => setHasLayers(value)}
                className={`flex-1 min-h-[30px] px-3 rounded-xl text-xs font-semibold border transition-all ${
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

        {/* Measurement */}
        <div className="bg-primary-100 rounded-2xl p-4 mb-4">
          <p className="text-primary-900 font-semibold text-sm mb-1">
            {t("upload.garmentMeasure")}
          </p>
          <p className="text-primary-800 text-xs leading-4 mb-3">
            {t("upload.garmentMeasureHint")}
          </p>

          {/* Manual input first */}
          <div className="mb-3">
            <label className="block text-primary-900 text-xs font-medium mb-2">
              {t("upload.manualOptionTitle") || "Input garment height"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                placeholder={t("upload.manualPlaceholder")}
                value={manualCm}
                onChange={(e) => setManualCm(e.target.value)}
                className="flex-1 min-h-[44px] bg-white border border-primary-300 rounded-xl px-3 text-sm text-primary-900 outline-none focus:border-secondary-300"
              />
              <span className="text-primary-800 font-semibold text-sm">cm</span>
            </div>
          </div>

          {/* AR + ruler side by side */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                preview &&
                navigate("arMeasure", {
                  image: preview,
                  imageFile: uploadedFile,
                })
              }
              disabled={!preview}
              className={`min-h-[52px] rounded-xl px-3 py-3 text-left transition-all ${
                preview
                  ? "bg-secondary-300 text-white active:scale-[0.98] shadow-sm"
                  : "bg-primary-200 text-primary-700 cursor-not-allowed"
              }`}
            >
              <p className="font-bold text-xs leading-tight">
                {t("upload.arOptionTitle")}
              </p>
              <p className="text-[10px] leading-tight opacity-80 mt-1">
                {t("upload.arOptionHint")}
              </p>
            </button>

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
              className={`min-h-[52px] rounded-xl px-3 py-3 text-left transition-all ${
                preview
                  ? "bg-primary-800 text-primary-100 active:scale-[0.98] shadow-sm"
                  : "bg-primary-200 text-primary-700 cursor-not-allowed"
              }`}
            >
              <p className="font-bold text-xs leading-tight">
                {t("upload.rulerOptionTitle")}
              </p>
              <p className="text-[10px] leading-tight opacity-80 mt-1">
                {t("upload.rulerOptionHint")}
              </p>
            </button>
          </div>
        </div>

        {!preview && (
          <p className="text-center text-primary-300 text-xs mb-3">
            {t("upload.selectFirst")}
          </p>
        )}

        {/* CTA */}
        <button
          onClick={() =>
            canStart &&
            navigate("analysis", {
              image: preview,
              imageFile: uploadedFile,
              lengthGarment: parseFloat(manualCm),
              hasLayers,
            })
          }
          disabled={!canStart}
          className={`w-full min-h-[52px] py-3 rounded-2xl font-bold text-base transition-all ${
            canStart
              ? "bg-secondary-300 text-white active:scale-[0.98] shadow-md shadow-black/20"
              : "bg-primary-700 text-accent-100 cursor-not-allowed"
          }`}
        >
          {canStart
            ? t("upload.startAnalysis")
            : preview
              ? t("upload.enterHeightFirst")
              : t("upload.selectPhotoFirst")}
        </button>
      </div>
    </div>
  );
}
