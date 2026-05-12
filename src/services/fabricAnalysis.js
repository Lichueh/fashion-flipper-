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

// v4: collapsed Stage-1 + Stage-2 into a single vision call so the model
// returns { en, nb, zh } directly — half the API calls, half the rate-limit
// risk. v3 entries are valid shape but were written when Stage-2 sometimes
// silently fell back to English-only; bumping forces a clean re-analyse.
const CACHE_PREFIX = "fabric_analysis_v4_";
const _inFlight = new Map();

async function _sha256hex(buffer) {
  if (crypto?.subtle?.digest) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .slice(0, 8)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // HTTP fallback (crypto.subtle requires HTTPS)
  let hash = 0;
  const view = new Uint8Array(buffer);
  for (let i = 0; i < view.length; i++) {
    hash = (Math.imul(31, hash) + view[i]) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
/**
 * Generates a short hex hash of the first 64 KB of the file.
 * Fast enough for UI use; good enough to distinguish different uploads.
 */
async function _fileHash(file) {
  const slice = file.slice(0, 65536);
  const buffer = await slice.arrayBuffer();
  return _sha256hex(buffer);
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
 * Downscales the image so its longest side is ≤ maxPx, preserving aspect ratio.
 * Replaces the older centre-crop approach: the model needs to see the whole
 * garment (silhouette helps disambiguate dress vs shirt, and a calibration
 * ruler placed beside the garment must NOT be cropped out — it would steal
 * the centre and rob the model of any fabric pixels to look at).
 *
 * 1024 px pairs well with GPT-4o vision's high-detail mode (the model tiles
 * up to ~1568×768 internally, so 1024 lets it see real weave detail without
 * wasted bandwidth).
 */
function _downscale(file, maxPx = 1024) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w <= maxPx && h <= maxPx) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      const scale = maxPx / Math.max(w, h);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
    };
    img.src = url;
  });
}

async function _doAnalyze(imageFile, cacheKey) {
  const downscaled = await _downscale(imageFile);
  const base64 = await _fileToBase64(downscaled);

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

/**
 * @param {File} imageFile
 * @param {Object} [options]
 * @param {boolean} [options.force] - Skip session cache and re-call the API.
 */
export async function analyzeFabric(imageFile, options = {}) {
  try {
    const hash = await _fileHash(imageFile);
    const cacheKey = CACHE_PREFIX + hash;

    // 1. Return cached result if available (unless caller explicitly forces re-run)
    if (!options.force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } else {
      sessionStorage.removeItem(cacheKey);
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


