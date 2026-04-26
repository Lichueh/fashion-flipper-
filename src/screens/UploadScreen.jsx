import { useState, useRef } from "react";
import { analyzeFabric } from "../services/fabricAnalysis";
import { isPhoneDevice } from "../utils/deviceDetect";

export default function UploadScreen({ navigate }) {
  const [preview, setPreview] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [longestSide, setLongestSide] = useState("");
  const [usableArea, setUsableArea] = useState("");
  const fileRef = useRef();
  const onPhone = isPhoneDevice();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    setPreview(URL.createObjectURL(file));
    // Pre-warm the fabric analysis cache so AnalysisScreen gets an instant hit
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
        <h2 className="font-semibold text-primary-100">
          Upload Your Old Clothes
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <p className="text-primary-100 text-sm mb-5 leading-5">
          Photograph or upload clothing you want to upcycle — AI will analyze
          fabric properties and suggest ideas
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
                  Click to Reselect
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
                Tap to Take Photo / Select Photo
              </p>
              <p className="text-primary-700 text-xs">
                Supports JPG, PNG — recommended to shoot in natural light on
                high-contrast background
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

        {/* Measurement input */}
        <div className="bg-primary-100 rounded-2xl p-4 mb-5">
          {onPhone ? (
            <>
              <p className="text-primary-900 font-semibold text-sm mb-1">
                📐 Usable Fabric Area{" "}
                <span className="font-normal text-primary-500">(optional)</span>
              </p>
              <p className="text-primary-700 text-xs mb-3 leading-4">
                Lay flat and estimate the usable area in cm². Skip this if
                unsure — patterns will still be matched by fabric type.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 3500"
                  value={usableArea}
                  onChange={(e) => setUsableArea(e.target.value)}
                  className="flex-1 bg-white border border-primary-300 rounded-xl px-4 py-2.5 text-sm text-primary-900 outline-none focus:border-secondary-300"
                />
                <span className="text-primary-800 font-semibold text-sm">
                  cm²
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="text-primary-900 font-semibold text-sm mb-1">
                📏 Garment Measurement
              </p>
              <p className="text-primary-700 text-xs mb-3 leading-4">
                Lay it flat and measure the full length from top to bottom (e.g.
                collar to hem for a shirt, waist to ankle for trousers).
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 70"
                  value={longestSide}
                  onChange={(e) => setLongestSide(e.target.value)}
                  className="flex-1 bg-white border border-primary-300 rounded-xl px-4 py-2.5 text-sm text-primary-900 outline-none focus:border-secondary-300"
                />
                <span className="text-primary-800 font-semibold text-sm">
                  cm
                </span>
              </div>
            </>
          )}
        </div>

        {/* Tips card — primary-100 inset card, same as HomeScreen hero */}
        <div className="bg-primary-100 rounded-2xl p-4 mb-6">
          <p className="text-primary-900 font-semibold text-sm mb-2">
            📸 Photography Tips
          </p>
          <ul className="space-y-1.5">
            {[
              "Shoot in natural light with high contrast background",
              "Lay the garment flat to fully expose the fabric",
              "Try to get the garment to fill the frame, but avoid cropping out edges",
            ].map((tip) => (
              <li
                key={tip}
                className="flex items-start gap-2 text-primary-700 text-xs"
              >
                <span className="mt-0.5 flex-shrink-0">•</span>
                <span className="leading-4">{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <button
          onClick={() =>
            preview &&
            navigate("analysis", {
              image: preview,
              imageFile: uploadedFile,
              ...(onPhone
                ? { usableAreaCm2: parseFloat(usableArea) || 0 }
                : { longestSideCm: parseFloat(longestSide) }),
            })
          }
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
            preview
              ? "bg-secondary-300 text-white active:scale-[0.98] shadow-md shadow-black/20"
              : "bg-primary-700 text-accent-100 cursor-not-allowed"
          }`}
        >
          {preview ? "🔍 Start AI Analysis" : "Please select a photo first"}
        </button>
      </div>
    </div>
  );
}
