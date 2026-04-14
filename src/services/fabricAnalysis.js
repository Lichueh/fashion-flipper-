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

/**
 * Generates a short hex hash of the first 64 KB of the file.
 * Fast enough for UI use; good enough to distinguish different uploads.
 */
async function _fileHash(file) {
  const slice = file.slice(0, 65536);
  const buffer = await slice.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .slice(0, 8) // 8 bytes → 16 hex chars, collision-resistant enough
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

export async function analyzeFabric(imageFile) {
  try {
    // Check sessionStorage cache before calling the API (keyed on original file)
    const hash = await _fileHash(imageFile);
    const cacheKey = CACHE_PREFIX + hash;
    const cached = localStorage.getItem(cacheKey);
    // const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);

    // Crop to center square before encoding — reduces payload ~95% with no quality loss for fabric detection
    const cropped = await _cropCenter(imageFile);
    const base64 = await _fileToBase64(cropped);
    const mimeType = "image/jpeg";

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64, mimeType }),
    });

    if (!response.ok) return null;

    const parsed = await response.json();

    // Validate minimum required fields before trusting the response
    if (!parsed.type || !parsed.color || !Array.isArray(parsed.composition)) {
      return null;
    }

    // Store in sessionStorage — persists for the browser tab session only
    try {
      localStorage.setItem(cacheKey, JSON.stringify(parsed));
      // sessionStorage.setItem(cacheKey, JSON.stringify(parsed));
    } catch {
      // sessionStorage full or unavailable — proceed without caching
    }

    return parsed;
  } catch {
    return null;
  }
}
