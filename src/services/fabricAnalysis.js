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

export async function analyzeFabric(imageFile) {
  try {
    // Check sessionStorage cache before calling the API
    const hash = await _fileHash(imageFile);
    const cacheKey = CACHE_PREFIX + hash;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);

    const base64 = await _fileToBase64(imageFile);
    const mimeType = imageFile.type || "image/jpeg";

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
      sessionStorage.setItem(cacheKey, JSON.stringify(parsed));
    } catch {
      // sessionStorage full or unavailable — proceed without caching
    }

    return parsed;
  } catch {
    return null;
  }
}
