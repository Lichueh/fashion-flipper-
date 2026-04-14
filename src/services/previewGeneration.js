/**
 * Preview image generation service — calls /api/preview (Vite dev middleware or Vercel serverless),
 * which proxies to Pollinations.ai FLUX with a secret key server-side.
 *
 * Returns null on any error so callers can fall back to static result images.
 *
 * @param {Object} fabric   Output from analyzeFabric (or mockAnalysis.fabric)
 * @param {Object} template A template object from templates.js
 * @returns {Promise<string|null>} base64 dataURL of the generated image, or null
 */

const CACHE_PREFIX = "preview_v1_";

/**
 * Hashes the fabric object to a 16-char hex string.
 * Same technique as fabricAnalysis._fileHash but operates on a plain object.
 */
async function _hashFabric(fabric) {
  const json = JSON.stringify(fabric);
  const buffer = new TextEncoder().encode(json);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .slice(0, 8) // 8 bytes → 16 hex chars
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Builds a Pollinations-friendly text prompt from fabric data and a template.
 */
function _buildPrompt(fabric, template) {
  const composition =
    fabric.composition
      ?.map((c) => `${c.material} ${c.percentage}%`)
      .join(", ") ?? fabric.type;

  return [
    `A ${template.style ?? ''} ${template.name} in ${fabric.color} ${fabric.type}, ${fabric.texture} 
    weave, ${fabric.weight} weight. Made from ${composition}. Laid flat on a 
    clean white surface, soft diffused studio lighting, sharp fabric texture 
    detail, minimal fashion editorial style.`,
  ].join(" ");
}

export async function generatePreview(fabric, template) {
  if (!fabric || !template) return null;

  try {
    const fabricHash = await _hashFabric(fabric);
    const cacheKey = CACHE_PREFIX + fabricHash + "_" + template.id;

    // Return cached dataURL immediately if available
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return cached;
    } catch {
      // localStorage unavailable — proceed without cache
    }

    const prompt = _buildPrompt(fabric, template);

    // Deterministic seed so same fabric always generates same image
    const seed = parseInt(fabricHash.slice(0, 8), 16) % 2147483647;

    const url = `/api/preview?prompt=${encodeURIComponent(prompt)}&seed=${seed}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();

    // Convert blob to base64 dataURL for storage and rendering
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Cache in localStorage — persist across refreshes since generation is slow
    try {
      localStorage.setItem(cacheKey, dataUrl);
    } catch {
      // localStorage full or blocked — proceed without caching
    }

    return dataUrl;
  } catch {
    return null;
  }
}
