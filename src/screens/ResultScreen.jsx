import { useState, useEffect } from "react";
import { templates } from "../data/templates";
import { generatePreview } from "../services/previewGeneration";

const gradients = {
  bag: "from-amber-100 via-yellow-50 to-amber-50",
  hat: "from-primary-100 via-primary-50 to-secondary-50",
};

export default function ResultScreen({
  navigate,
  template: templateId,
  uploadedImage,
  uploadedFile,
  fabric,
}) {
  const template = templates[templateId] || templates.bag;
  const [showBefore, setShowBefore] = useState(false);
  const [shared, setShared] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!fabric) return;
    generatePreview(fabric, template, uploadedFile).then((dataUrl) => {
      if (dataUrl) setPreviewUrl(dataUrl);
    });
  }, [fabric, templateId, uploadedFile]);

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
        <h2 className="font-semibold text-primary-100">Upcycling Results</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
        {/* Celebration */}
        <div className="text-center py-2">
          <p className="text-4xl mb-2">🎉</p>
          <h3 className="text-xl font-bold text-primary-100">
            Upcycling Complete!
          </h3>
          <p className="text-primary-100 text-sm mt-1">
            Here is the AI-generated upcycling preview
          </p>
        </div>

        {/* Before / After card — primary-100 inset card */}
        <div className="bg-primary-100 rounded-3xl overflow-hidden border border-primary-200">
          {/* Toggle */}
          <div className="flex border-b border-primary-200">
            <button
              onClick={() => setShowBefore(false)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                !showBefore
                  ? "text-primary-900 border-b-2 border-primary-700"
                  : "text-primary-500"
              }`}
            >
              ✨ After (AI Preview)
            </button>
            <button
              onClick={() => setShowBefore(true)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                showBefore
                  ? "text-secondary-700 border-b-2 border-secondary-400"
                  : "text-primary-500"
              }`}
            >
              Original Clothing
            </button>
          </div>

          {/* Image */}
          <div
            className={`relative overflow-hidden ${templateId === "bag" ? "aspect-[2/3]" : "h-64"}`}
          >
            {showBefore ? (
              uploadedImage ? (
                <img
                  src={uploadedImage}
                  alt="before"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary-200 flex items-center justify-center text-6xl">
                  👗
                </div>
              )
            ) : (
              <div className="relative w-full h-full">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Upcycled result"
                    className="w-full h-full object-cover"
                  />
                ) : template.resultImage ? (
                  <img
                    src={template.resultImage}
                    alt="Upcycled result"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-br ${gradients[templateId] || gradients.bag} flex flex-col items-center justify-center`}
                  >
                    {!previewUrl && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                        <p className="text-primary-500 text-xs">
                          Generating preview…
                        </p>
                      </div>
                    )}
                    <span className="text-9xl drop-shadow-sm">
                      {template.emoji}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <span className="bg-black/20 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium">
                    AI-Generated Preview
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Card footer */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-primary-900 text-sm">
                {template.name}
              </p>
              <p className="text-[11px] text-primary-600 mt-0.5">
                Transformed from your old clothing
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-primary-500">
                Carbon Emissions Reduced
              </p>
              <p className="text-primary-700 font-bold text-sm">-82%</p>
            </div>
          </div>
        </div>

        {/* Environmental impact — slightly deeper inset within the dark bg */}
        <div className="bg-primary-700 rounded-3xl p-5">
          <p className="text-primary-100 text-xs font-semibold mb-3 flex items-center gap-1.5">
            🌍 Your Environmental Impact
          </p>
          <div className="flex justify-around">
            {[
              { value: "1 item", label: "Clothing Upcycled" },
              { value: "0.3kg", label: "Waste Reduced" },
              { value: "2.4L", label: "Water Saved" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-lg font-bold text-primary-100">
                  {stat.value}
                </p>
                <p className="text-primary-200 text-[10px] mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShared(true)}
            className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.97] ${
              shared
                ? "bg-primary-600 text-primary-100 border-2 border-primary-600"
                : "bg-secondary-300 text-white shadow-md shadow-black/20"
            }`}
          >
            {shared ? "✓ Shared to Community" : "Share to Community 🌿"}
          </button>
          <button
            onClick={() => navigate("community")}
            className="flex-1 py-4 rounded-2xl font-bold text-sm bg-primary-600 border border-primary-600 text-primary-100 active:scale-[0.97] transition-transform"
          >
            Browse Community
          </button>
        </div>

        {/* Restart */}
        <button
          onClick={() => navigate("home")}
          className="w-full py-3 text-primary-100 text-sm font-medium active:text-primary-200 transition-colors"
        >
          Back to Home →
        </button>
      </div>
    </div>
  );
}
