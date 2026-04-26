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
const _inFlight = new Map();
let _queue = Promise.resolve();
const DELAY_BETWEEN_REQUESTS_MS = 1000;

// ── Debug logger ──────────────────────────────────────────────────────────────

let _reqCounter = 0; // global request counter for correlating logs
const _timings = []; // stores completed request timings for analysis

function _log(level, event, data = {}) {
  const entry = {
    t: Date.now(),
    event,
    inFlight: _inFlight.size,
    queueDepth: _reqCounter,
    ...data,
  };
  if (level === "error") console.error("[preview]", entry);
  else if (level === "warn") console.warn("[preview]", entry);
  else console.log("[preview]", entry);
}

/** Call in the browser console to see a timing summary */
window.__previewDebug = () => {
  if (_timings.length === 0) { console.log("[preview] No completed requests yet."); return; }
  const durations = _timings.map((t) => t.durationMs);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  console.table(_timings);
  console.log(`[preview] Summary — count: ${_timings.length}, avg: ${avg.toFixed(0)}ms, min: ${min}ms, max: ${max}ms`);
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function _hashFabric(fabric) {
  const json = JSON.stringify(fabric);

  if (window.isSecureContext && window.crypto?.subtle) {
    const buffer = new TextEncoder().encode(json);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .slice(0, 8)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Stable fallback: sort keys so property order doesn't matter
  _log("warn", "hash:fallback", { reason: "crypto.subtle unavailable", isSecureContext: window.isSecureContext });
  const stable = JSON.stringify(fabric, Object.keys(fabric).sort());
  let h = 0x811c9dc5;
  for (let i = 0; i < stable.length; i++) {
    h ^= stable.charCodeAt(i);
    h = (h * 0x01000193) >>> 0; // FNV-1a, stays within 32-bit unsigned
  }
  return h.toString(16).padStart(8, "0");
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

async function _fetchPreview(fabric, template, cacheKey, fabricHash) {
  const reqId = ++_reqCounter;
  const prompt = _buildPrompt(fabric, template);
  const seed = parseInt(fabricHash.slice(0, 8), 16) % 2147483647;
  const url = `/api/preview?prompt=${encodeURIComponent(prompt)}&seed=${seed}`;

  _log("log", "fetch:start", { reqId, templateId: template.id, seed, url });
  const t0 = performance.now();

  try {
    const response = await fetch(url);
    const fetchMs = Math.round(performance.now() - t0);

    _log(response.ok ? "log" : "warn", "fetch:response", {
      reqId,
      templateId: template.id,
      status: response.status,
      fetchMs,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
    });

    if (!response.ok) return null;

    const blob = await response.blob();
    const blobMs = Math.round(performance.now() - t0);
    _log("log", "fetch:blob", {
      reqId,
      templateId: template.id,
      blobSizeKB: Math.round(blob.size / 1024),
      blobMs,
    });

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const totalMs = Math.round(performance.now() - t0);
    _log("log", "fetch:done", {
      reqId,
      templateId: template.id,
      dataUrlLengthKB: Math.round(dataUrl.length / 1024),
      totalMs,
    });

    _timings.push({ reqId, templateId: template.id, durationMs: totalMs, status: response.status });

    try {
      localStorage.setItem(cacheKey, dataUrl);
      _log("log", "cache:write", { reqId, templateId: template.id, cacheKey });
    } catch (e) {
      _log("warn", "cache:write:failed", { reqId, reason: e?.message });
    }

    return dataUrl;
  } catch (e) {
    const totalMs = Math.round(performance.now() - t0);
    _log("error", "fetch:error", { reqId, templateId: template.id, error: e?.message, totalMs });
    return null;
  }
}

function _enqueue(fabric, template, cacheKey, fabricHash) {
  _log("log", "queue:enqueue", { templateId: template.id, currentInFlight: _inFlight.size });

  const result = _queue.then(async () => {
    _log("log", "queue:delay:start", { templateId: template.id, delayMs: DELAY_BETWEEN_REQUESTS_MS });
    await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS));
    _log("log", "queue:delay:done", { templateId: template.id });
    return _fetchPreview(fabric, template, cacheKey, fabricHash);
  });

  _queue = result.catch(() => {});
  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generatePreview(fabric, template) {
  if (!fabric || !template) return null;

  try {
    const fabricHash = await _hashFabric(fabric);
    const cacheKey = CACHE_PREFIX + fabricHash + "_" + template.id;

    // 1. Cache hit
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        _log("log", "cache:hit", { templateId: template.id, cacheKey });
        return cached;
      }
    } catch {
      _log("warn", "cache:read:failed", { templateId: template.id });
    }

    // 2. Deduplicate in-flight
    if (_inFlight.has(cacheKey)) {
      _log("log", "inflight:dedup", { templateId: template.id, currentInFlight: _inFlight.size });
      return await _inFlight.get(cacheKey);
    }

    // 3. Enqueue
    _log("log", "generatePreview:enqueue", { templateId: template.id, fabricHash, currentInFlight: _inFlight.size });
    const promise = _enqueue(fabric, template, cacheKey, fabricHash);
    _inFlight.set(cacheKey, promise);
    try {
      return await promise;
    } finally {
      _inFlight.delete(cacheKey);
      _log("log", "inflight:cleared", { templateId: template.id, remainingInFlight: _inFlight.size });
    }
  } catch (e) {
    _log("error", "generatePreview:error", { templateId: template.id, error: e?.message });
    return null;
  }
}