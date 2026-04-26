/**
 * Fabric analysis service — calls GitHub Models API directly (local dev only).
 * NOTE: revert to /api/analyze proxy before merging to main.
 *
 * Returns null on any error so callers can fall back to mock data gracefully.
 *
 * @param {File} imageFile
 * @returns {Promise<{
 *   type: string,
 *   color: string,
 *   composition: Array<{ material: string, percentage: number }>,
 *   weight: string,
 *   texture: string,
 *   condition: string,
 *   tags: string[],
 * } | null>}
 */

const CACHE_PREFIX = "fabric_analysis_v1_";
const _inFlight = new Map();

/**
 * Generates a short hex hash of the first 64 KB of the file.
 * Fast enough for UI use; good enough to distinguish different uploads.
 */
async function _fileHash(file) {
  const buffer = await file.arrayBuffer();

  if (window.isSecureContext && window.crypto?.subtle) {
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  console.warn("[fileHash] crypto.subtle unavailable; using fallback key");
  return `fallback_${file.name}_${file.size}_${file.lastModified}`;
}

function _fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Crops a square from the center of the image and scales it to `size` px.
 * Keeps the crop on the clothing piece (typically centered in phone photos)
 * and dramatically reduces the payload sent to the API.
 */
function _cropCenter(file, size = 300) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const srcSize = Math.min(img.width, img.height);
      ctx.drawImage(
        img,
        (img.width - srcSize) / 2,
        (img.height - srcSize) / 2,
        srcSize,
        srcSize,
        0,
        0,
        size,
        size,
      );
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
    };
    img.src = url;
  });
}

async function _doAnalyze(imageFile, cacheKey) {
  const cropped = await _cropCenter(imageFile);
  const base64 = await _fileToBase64(cropped);

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg" }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[fabricAnalysis] API error body:", body);
    return null;
  }

  const parsed = await response.json();

  if (!parsed.type || !parsed.color || !Array.isArray(parsed.composition)) {
    console.warn("[fabricAnalysis] validation failed:", parsed);
    return null;
  }

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(parsed));
  } catch (e) {
    console.warn("[fabricAnalysis] sessionStorage write failed:", e.message);
  }

  return parsed;
}

export async function analyzeFabric(imageFile) {
  try {
    const hash = await _fileHash(imageFile);
    const cacheKey = CACHE_PREFIX + hash;

    // 1. Return cached result if available
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 2. If already in flight for this image, wait for that promise instead
    if (_inFlight.has(hash)) {
      console.log("[fabricAnalysis] deduplicating in-flight request");
      return await _inFlight.get(hash);
    }

    // 3. Start the request and register it
    const promise = _doAnalyze(imageFile, cacheKey);
    _inFlight.set(hash, promise);
    try {
      return await promise;
    } finally {
      _inFlight.delete(hash);
    }
  } catch (err) {
    console.error("[fabricAnalysis] unexpected error:", err);
    return null;
  }
}
