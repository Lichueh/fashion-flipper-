/**
 * Preview image generation service — calls /api/preview (Vite dev middleware or Vercel serverless),
 * which proxies to Gemini 2.5 Flash Image (primary) or Pollinations.ai FLUX (fallback).
 *
 * When an `imageFile` is provided, the user's original garment photo is sent
 * to Gemini as image-to-image input so every preview preserves the original
 * fabric, color, and any front graphic / print / text. Pollinations has no
 * image-to-image, so it is skipped server-side when an image is included.
 * When no `imageFile` is provided, falls back to text-only generation using
 * the analyzed fabric description.
 *
 * Per-template prompts can be overridden via `template.previewPromptOverride`;
 * otherwise a default image-to-image prompt is built from the template's
 * `visualDescription`.
 *
 * Returns null on any error so callers can fall back to static result images.
 *
 * @param {Object} fabric    Output from analyzeFabric (or mockAnalysis.fabric)
 * @param {Object} template  A template object from templates.js
 * @param {File}   [imageFile] Optional user-uploaded garment photo
 * @returns {Promise<string|null>} base64 dataURL of the generated image, or null
 */

const CACHE_PREFIX = "preview_v1_";
const _inFlight = new Map(); // deduplicates concurrent calls for same template+fabric+image
let _queue = Promise.resolve(); // ensures only 1 request goes to the API at a time
const DELAY_BETWEEN_REQUESTS_MS = 1000;
const SOURCE_IMAGE_MAX_SIDE = 768; // downscale before sending to Gemini

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

// Downscale + JPEG-encode the source image, returning {mimeType, data, hash}.
// `data` is base64 (no data URL prefix). `hash` is first 8 hex of SHA-256 over
// the encoded JPEG bytes — used so different source photos get separate cache
// entries even with identical fabric+template.
async function _imageToInlineData(imageFile) {
  const bitmap = await createImageBitmap(imageFile);
  const ratio = Math.min(
    SOURCE_IMAGE_MAX_SIDE / bitmap.width,
    SOURCE_IMAGE_MAX_SIDE / bitmap.height,
    1,
  );
  const w = Math.max(1, Math.round(bitmap.width * ratio));
  const h = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++)
    binary += String.fromCharCode(bytes[i]);
  const data = btoa(binary);

  const hashBuf = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hash = Array.from(new Uint8Array(hashBuf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { mimeType: "image/jpeg", data, hash };
}

function _buildPrompt(fabric, template, hasSourceImage) {
  if (template.previewPromptOverride) return template.previewPromptOverride;

  const visual = template.visualDescription ?? template.name;

  if (hasSourceImage) {
    // Image-to-image: trust the source image for fabric/color/graphic; only
    // describe the new silhouette + photographic style.
    return [
      `Reimagine the garment in this image as ${visual}.`,
      `Use the original fabric, color, texture, and any front graphic, print, logo, or text from the source image exactly as they appear — same hue, same artwork, same placement on the front of the new piece. Do not change the graphic.`,
      `Product photography on a pure white background, flat lay, overhead shot, soft even studio lighting, sharp fabric texture detail.`,
      `No person, no model, no mannequin, no body parts, no hands.`,
    ].join(" ");
  }

  // Text-only fallback when no source image is available.
  const composition =
    fabric.composition
      ?.map((c) => `${c.material} ${c.percentage}%`)
      .join(", ") ?? fabric.type;
  return [
    `Product photography of ${visual}, flat lay on a pure white background.`,
    `Fabric: ${fabric.color} ${fabric.type}, ${fabric.texture}, ${fabric.weight} weight, ${composition}.`,
    `No person, no model, no mannequin, no body parts, no hands.`,
    `Garment laid completely flat, overhead shot, soft even studio lighting, sharp fabric texture detail.`,
  ].join(" ");
}

// Try to save to localStorage; on quota error, evict entries from older fabrics
// (anything with CACHE_PREFIX but a different fabricHash), then retry once.
function _saveCacheWithEviction(cacheKey, dataUrl, currentFabricHash) {
  try {
    localStorage.setItem(cacheKey, dataUrl);
    return;
  } catch {}

  const currentPrefix = CACHE_PREFIX + currentFabricHash + "_";
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k?.startsWith(CACHE_PREFIX) && !k.startsWith(currentPrefix)) {
      localStorage.removeItem(k);
    }
  }

  try {
    localStorage.setItem(cacheKey, dataUrl);
    return;
  } catch {}

  // Still failing → drop one current-fabric entry (other than ours) and retry
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(currentPrefix) && k !== cacheKey) {
      localStorage.removeItem(k);
      break;
    }
  }
  try {
    localStorage.setItem(cacheKey, dataUrl);
  } catch {}
}

// Fetches the image — always runs inside the queue so only 1 runs at a time
async function _fetchPreview(
  fabric,
  template,
  cacheKey,
  fabricHash,
  inlineImage,
) {
  const prompt = _buildPrompt(fabric, template, !!inlineImage);
  const seed = parseInt(fabricHash.slice(0, 8), 16) % 2147483647;

  const body = { prompt, seed };
  if (inlineImage) {
    body.image = { mimeType: inlineImage.mimeType, data: inlineImage.data };
  }

  try {
    const response = await fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
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

    _saveCacheWithEviction(cacheKey, dataUrl, fabricHash);
    return dataUrl;
  } catch {
    return null;
  }
}

// Adds a fetch to the sequential queue so requests don't fire concurrently
function _enqueue(fabric, template, cacheKey, fabricHash, inlineImage) {
  const result = _queue.then(async () => {
    // Wait between requests to avoid rate limiting
    await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS));
    return _fetchPreview(fabric, template, cacheKey, fabricHash, inlineImage);
  });
  _queue = result.catch(() => {}); // never let one failure break the queue
  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generatePreview(fabric, template, imageFile = null) {
  if (!fabric || !template) return null;

  try {
    const fabricHash = await _hashFabric(fabric);

    // Whenever the caller has the source garment photo, send it to Gemini as
    // image-to-image input. The default prompt (and most overrides) instruct
    // the model to preserve the original fabric / color / graphic — so every
    // template now produces a preview clearly derived from the user's actual
    // garment, not a generic stock image.
    let inlineImage = null;
    if (imageFile) {
      try {
        inlineImage = await _imageToInlineData(imageFile);
      } catch (e) {
        console.warn("[preview] failed to encode source image", e);
        // Fall through with inlineImage = null → text-only generation
      }
    }

    const imgPart = inlineImage ? "_" + inlineImage.hash : "";
    const cacheKey = CACHE_PREFIX + fabricHash + imgPart + "_" + template.id;

    // 1. Return cached result immediately if available
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return cached;
    } catch {
      // localStorage unavailable — proceed without cache
    }

    // 2. If the same template+fabric+image is already being fetched, wait for it
    if (_inFlight.has(cacheKey)) {
      return await _inFlight.get(cacheKey);
    }

    // 3. Queue the request and register it as in-flight
    const promise = _enqueue(
      fabric,
      template,
      cacheKey,
      fabricHash,
      inlineImage,
    );
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
