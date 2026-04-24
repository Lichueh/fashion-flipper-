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
const _inFlight = new Map(); // deduplicates concurrent calls for same template+fabric
let _queue = Promise.resolve(); // ensures only 1 request goes to the API at a time
const DELAY_BETWEEN_REQUESTS_MS = 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function _hashFabric(fabric) {
  const json = JSON.stringify(fabric);
  const buffer = new TextEncoder().encode(json);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function _buildPrompt(fabric, template) {
  const composition =
    fabric.composition
      ?.map((c) => `${c.material} ${c.percentage}%`)
      .join(", ") ?? fabric.type;

  return [
    `Product photography of ${template.visualDescription ?? template.name}, flat lay on a pure white background.`,
    `Fabric: ${fabric.color} ${fabric.type}, ${fabric.texture}, ${fabric.weight} weight, ${composition}.`,
    `No person, no model, no mannequin, no body parts, no hands.`,
    `Garment laid completely flat, overhead shot, soft even studio lighting, sharp fabric texture detail.`,
  ].join(" ");
}

// Fetches the image — always runs inside the queue so only 1 runs at a time
async function _fetchPreview(fabric, template, cacheKey, fabricHash) {
  const prompt = _buildPrompt(fabric, template);
  const seed = parseInt(fabricHash.slice(0, 8), 16) % 2147483647;
  const url = `/api/preview?prompt=${encodeURIComponent(prompt)}&seed=${seed}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[preview] ${response.status} for ${template.id}`);
      return null;
    }

    const blob = await response.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    try {
      localStorage.setItem(cacheKey, dataUrl);
    } catch {}
    return dataUrl;
  } catch {
    return null;
  }
}

// Adds a fetch to the sequential queue so requests don't fire concurrently
function _enqueue(fabric, template, cacheKey, fabricHash) {
  const result = _queue.then(async () => {
    // Wait between requests to avoid rate limiting
    await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS));
    return _fetchPreview(fabric, template, cacheKey, fabricHash);
  });
  _queue = result.catch(() => {}); // never let one failure break the queue
  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generatePreview(fabric, template) {
  if (!fabric || !template) return null;

  try {
    const fabricHash = await _hashFabric(fabric);
    const cacheKey = CACHE_PREFIX + fabricHash + "_" + template.id;

    // 1. Return cached result immediately if available
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return cached;
    } catch {
      // localStorage unavailable — proceed without cache
    }

    // 2. If the same template+fabric is already being fetched, wait for it
    if (_inFlight.has(cacheKey)) {
      return await _inFlight.get(cacheKey);
    }

    // 3. Queue the request and register it as in-flight
    const promise = _enqueue(fabric, template, cacheKey, fabricHash);
    _inFlight.set(cacheKey, promise);
    try {
      return await promise;
    } finally {
      _inFlight.delete(cacheKey);
    }
  } catch {
    return null;
  }
}
