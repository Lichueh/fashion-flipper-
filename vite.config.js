import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const GITHUB_API_URL = "https://models.inference.ai.azure.com/chat/completions";

const SYSTEM_PROMPT = `You are a fabric analysis assistant for an upcycling app. Analyse the garment's fabric carefully — look at weave/knit pattern, sheen, drape, surface texture, color saturation, and visible wear. Ignore any ruler, hand, or background object in the photo. Then return ONLY a valid JSON object — no markdown, no explanation:
{
  "type": { "en": "...", "nb": "...", "zh": "..." },
  "color": { "en": "...", "nb": "...", "zh": "..." },
  "composition": [{ "material": { "en": "...", "nb": "...", "zh": "..." }, "percentage": number }],
  "weight": { "en": "...", "nb": "...", "zh": "..." },
  "texture": { "en": "...", "nb": "...", "zh": "..." },
  "condition": { "en": "...", "nb": "...", "zh": "..." },
  "tags": [{ "en": "...", "nb": "...", "zh": "..." }]
}

For every text value: provide English (en), Norwegian Bokmål (nb), and Traditional Chinese (zh) — same meaning, natural textile vocabulary in each language. Examples:
- "Cotton Fabric" → { "en": "Cotton Fabric", "nb": "Bomullsstoff", "zh": "棉質布料" }
- "Deep Blue" → { "en": "Deep Blue", "nb": "Dyp blå", "zh": "深藍" }
- "Plain weave" → { "en": "Plain weave", "nb": "Lerretsbinding", "zh": "平織" }
- "Medium weight" → { "en": "Medium weight", "nb": "Middels vekt", "zh": "中等厚度" }
- "Good (slight fading)" → { "en": "Good (slight fading)", "nb": "God (litt falming)", "zh": "良好（輕微褪色）" }
- "Natural Fiber" → { "en": "Natural Fiber", "nb": "Naturfiber", "zh": "天然纖維" }
- "Unknown" → { "en": "Unknown", "nb": "Ukjent", "zh": "未知" }

Rules:
- type: e.g. Cotton Fabric, Denim, Linen, Polyester Blend, Wool Knit, Silk Blend.
- weight (en): one of "Lightweight" / "Medium weight" / "Heavy" / "Unknown" (then translated).
- texture (en): pick the best match from "Plain weave", "Twill", "Jersey knit", "Ribbed knit", "Denim twill", "Fleece", "Satin", "Canvas", "Corduroy", "Other (...)" / "Unknown" (then translated).
- For tags (en), pick 2–4 from: Natural Fiber, Synthetic, Blended, Machine Washable, Hand Wash Only, Dye-friendly, Stretch, Woven, Knit. Each tag becomes its own { en, nb, zh } object.
- Composition percentages must sum to 100.
- If a field genuinely cannot be determined from the photo (e.g. fabric not in frame, severe blur), return { "en": "Unknown", "nb": "Ukjent", "zh": "未知" }. Do NOT invent details to fill gaps — saying Unknown is preferred over wrong.
- Be concrete: "Twill" not "woven", "Jersey knit" not "soft fabric".`;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ""); // loads ALL env vars, no VITE_ filter

  return {
    plugins: [
      react(),
      {
        name: "api-dev-proxy",
        configureServer(server) {
          server.middlewares.use("/api/analyze", async (req, res) => {
            if (req.method !== "POST") {
              res.statusCode = 405;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }
            const token = env.GITHUB_TOKEN;
            if (!token) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({ error: "GITHUB_TOKEN not set in .env" }),
              );
              return;
            }
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", async () => {
              try {
                const { imageBase64, mimeType } = JSON.parse(body);
                const upstream = await fetch(GITHUB_API_URL, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                      { role: "system", content: SYSTEM_PROMPT },
                      {
                        role: "user",
                        content: [
                          {
                            type: "image_url",
                            image_url: {
                              url: `data:${mimeType ?? "image/jpeg"};base64,${imageBase64}`,
                              // High detail = model tiles the image up to ~1568×768
                              // and reads real weave/knit detail. Low detail squashed
                              // every photo down to ~85×85 and made texture detection
                              // basically guessing. Worth the extra tokens.
                              detail: "high",
                            },
                          },
                          {
                            type: "text",
                            text: "Analyse this garment's fabric and return the JSON object.",
                          },
                        ],
                      },
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.2,
                    max_tokens: 1500,
                  }),
                });
                if (!upstream.ok) {
                  const rawBody = await upstream.text();
                  console.error(
                    "[analyze] upstream error",
                    upstream.status,
                    rawBody,
                  );
                  res.statusCode = upstream.status;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      error: `Upstream API error: ${upstream.status} ${upstream.statusText}`,
                      detail: rawBody,
                    }),
                  );
                  return;
                }
                const data = await upstream.json();
                const content = data.choices?.[0]?.message?.content;
                res.setHeader("Content-Type", "application/json");
                if (content) {
                  // Help diagnose "fabric analysis is wrong" by surfacing what
                  // gpt-4o actually returned for each call.
                  console.log(
                    "[analyze] gpt-4o →",
                    content.replace(/\s+/g, " "),
                  );
                }
                if (!content) {
                  console.error(
                    "[analyze] empty content from model",
                    JSON.stringify(data, null, 2),
                  );
                  res.statusCode = 502;
                  res.end(
                    JSON.stringify({
                      error: "Empty response from model",
                      finishReason: data.choices?.[0]?.finish_reason,
                      raw: data,
                    }),
                  );
                  return;
                }
                // Single-stage prompt already returns { en, nb, zh } shape.
                res.statusCode = 200;
                res.end(content);
              } catch (e) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: e.message }));
              }
            });
          });
        },
      },
      {
        name: "preview-dev-proxy",
        configureServer(server) {
          const GEMINI_MODEL = "gemini-2.5-flash-image";
          const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

          async function tryGemini(prompt, seed, image) {
            const key = env.GEMINI_API_KEY;
            if (!key) {
              console.log("[preview] gemini: no GEMINI_API_KEY, skipping");
              return null;
            }
            const t0 = Date.now();
            const parts = image
              ? [
                  {
                    inlineData: {
                      mimeType: image.mimeType ?? "image/jpeg",
                      data: image.data,
                    },
                  },
                  { text: prompt },
                ]
              : [{ text: prompt }];
            const body = {
              contents: [{ parts }],
              generationConfig: {
                responseModalities: ["IMAGE"],
                seed: Number(seed) || 1,
              },
            };
            const upstream = await fetch(`${GEMINI_URL}?key=${key}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            if (!upstream.ok) {
              const errBody = await upstream.text();
              console.error(
                `[preview] gemini ${upstream.status} in ${Date.now() - t0}ms:`,
                errBody.slice(0, 500),
              );
              return null;
            }
            const json = await upstream.json();
            const part = json?.candidates?.[0]?.content?.parts?.find(
              (p) => p.inlineData?.data,
            );
            if (!part) {
              const finishReason = json?.candidates?.[0]?.finishReason;
              console.error(
                `[preview] gemini ok but no inlineData in ${Date.now() - t0}ms (${finishReason ?? "unknown"}) — falling back to Pollinations`,
              );
              return null;
            }
            console.log(
              `[preview] gemini ok in ${Date.now() - t0}ms${image ? " (img2img)" : ""}`,
            );
            return {
              buffer: Buffer.from(part.inlineData.data, "base64"),
              contentType: part.inlineData.mimeType ?? "image/png",
            };
          }

          async function tryPollinations(prompt, seed, image) {
            // Pollinations FLUX has no image-to-image — skip when the caller
            // wants the source image preserved.
            if (image) return null;
            const key = env.POLLINATIONS_KEY;
            if (!key) {
              console.log("[preview] pollinations: no key, skipping");
              return null;
            }
            const t0 = Date.now();
            const upstream = await fetch(
              `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
                `?width=512&height=512&model=flux&nologo=true&seed=${seed}&key=${key}`,
            );
            if (!upstream.ok) {
              console.error(
                `[preview] pollinations ${upstream.status} in ${Date.now() - t0}ms`,
              );
              return null;
            }
            console.log(`[preview] pollinations ok in ${Date.now() - t0}ms`);
            return {
              buffer: Buffer.from(await upstream.arrayBuffer()),
              contentType: upstream.headers.get("content-type") ?? "image/jpeg",
            };
          }

          server.middlewares.use("/api/preview", async (req, res) => {
            if (req.method !== "POST") {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }
            if (!env.GEMINI_API_KEY && !env.POLLINATIONS_KEY) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error:
                    "Neither GEMINI_API_KEY nor POLLINATIONS_KEY set in .env",
                }),
              );
              return;
            }
            let body = "";
            req.on("data", (c) => (body += c));
            req.on("end", async () => {
              try {
                let parsed;
                try {
                  parsed = JSON.parse(body || "{}");
                } catch {
                  res.statusCode = 400;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: "Invalid JSON body" }));
                  return;
                }
                const prompt = parsed.prompt ?? "";
                const seed = String(parsed.seed ?? "1");
                const image = parsed.image ?? null;
                const fallbackPrompt = parsed.fallbackPrompt ?? prompt;

                if (!prompt) {
                  res.statusCode = 400;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: "prompt is required" }));
                  return;
                }

                // Gemini failure (network error, NO_IMAGE refusal, content
                // filter) → fall through to Pollinations text-only. Pollinations
                // FLUX has no image-to-image, so we pass `null` for image and
                // use `fallbackPrompt` (a self-contained prompt without
                // "in this image" references).
                const result =
                  (await tryGemini(prompt, seed, image).catch(() => null)) ??
                  (await tryPollinations(fallbackPrompt, seed, null).catch(
                    () => null,
                  ));

                if (!result) {
                  res.statusCode = 502;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({ error: "All upstream providers failed" }),
                  );
                  return;
                }
                res.statusCode = 200;
                res.setHeader("Content-Type", result.contentType);
                res.end(result.buffer);
              } catch (e) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: e.message }));
              }
            });
          });
        },
      },
      {
        name: "segment-dev-proxy",
        configureServer(server) {
          server.middlewares.use("/api/segment", async (req, res) => {
            console.log("[segment] incoming", req.method);
            if (req.method !== "POST") {
              res.statusCode = 405;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({ error: true, message: "Method not allowed" }),
              );
              return;
            }

            const falApiKey = env.FAL_API_KEY;
            if (!falApiKey) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error: true,
                  message: "FAL_API_KEY not set in .env",
                }),
              );
              return;
            }

            // Dynamically import the handler from api/segment.js.
            // Using createRequire / dynamic import avoids bundling it into the
            // Vite client bundle. The file uses top-level fal.config() which
            // runs immediately on import — FAL_API_KEY must already be in env.
            try {
              // Collect raw multipart body
              const chunks = [];
              req.on("data", (c) => chunks.push(c));
              await new Promise((resolve, reject) => {
                req.on("end", resolve);
                req.on("error", reject);
              });
              const rawBody = Buffer.concat(chunks);

              // Parse FormData using the Web Fetch API (Node 18+)
              const webReq = new Request("http://localhost", {
                method: "POST",
                headers: { "content-type": req.headers["content-type"] },
                body: rawBody,
              });
              const formData = await webReq.formData();
              const imageFile = formData.get("image");

              if (!imageFile) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error: true,
                    message: "Missing 'image' field in FormData",
                  }),
                );
                return;
              }

              console.log(
                "[segment] image received, size:",
                imageFile.size,
                "type:",
                imageFile.type,
              );

              const arrayBuffer = await imageFile.arrayBuffer();
              const base64 = Buffer.from(arrayBuffer).toString("base64");
              const mimeType = imageFile.type || "image/jpeg";
              const imageUrl = `data:${mimeType};base64,${base64}`;

              // Call BiRefNet via fal.ai
              const TIMEOUT_MS = 15000;

              async function callFal(modelId) {
                console.log(`[segment] calling ${modelId}...`);
                const t0 = Date.now();

                // Only timeout the fal.ai API call itself, not the image download
                const falRes = await Promise.race([
                  fetch(`https://fal.run/${modelId}`, {
                    method: "POST",
                    headers: {
                      Authorization: `Key ${falApiKey}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ image_url: imageUrl }),
                  }),
                  new Promise((_, reject) =>
                    setTimeout(
                      () => reject(new Error(`${modelId} API timeout`)),
                      20000,
                    ),
                  ),
                ]);

                if (!falRes.ok) {
                  const errText = await falRes.text();
                  throw new Error(
                    `fal.ai ${modelId} ${falRes.status}: ${errText.slice(0, 200)}`,
                  );
                }
                const data = await falRes.json();
                console.log(
                  `[segment] ${modelId} responded in ${Date.now() - t0}ms`,
                );
                const outputUrl = data?.image?.url ?? data?.output?.image?.url;
                if (!outputUrl)
                  throw new Error(`No output image URL from ${modelId}`);

                // No timeout on image download — let it complete
                console.log(
                  "[segment] fetching output image:",
                  outputUrl.slice(0, 80),
                );
                const imgRes = await fetch(outputUrl);
                if (!imgRes.ok)
                  throw new Error(
                    `Failed to fetch output image: ${imgRes.status}`,
                  );
                const pngBytes = new Uint8Array(await imgRes.arrayBuffer());
                console.log(
                  "[segment] output image size:",
                  pngBytes.byteLength,
                  "bytes",
                );
                return pngBytes;
              }

              // And simplify the call — no withTimeout wrapper needed anymore:
              let pngBytes = await callFal("fal-ai/birefnet").catch((err) => {
                console.warn(
                  "[segment] BiRefNet failed —",
                  err.message,
                  "— trying rembg",
                );
                return null;
              });
              if (!pngBytes) {
                pngBytes = await callFal("fal-ai/imageutils/rembg").catch(
                  (err) => {
                    console.error("[segment] rembg also failed —", err.message);
                    return null;
                  },
                );
              }

              if (!pngBytes) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error: true,
                    message: "Both segmentation models failed",
                  }),
                );
                return;
              }

              // Inline PNG alpha extraction (same logic as api/segment.js)
              const result = await extractAlphaMask(pngBytes);
              console.log(
                "[segment] mask extracted, totalPixelArea:",
                result.totalPixelArea,
                "dims:",
                result.maskWidth,
                "x",
                result.maskHeight,
              );

              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
            } catch (e) {
              console.error("[segment] unexpected error:", e.message);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: true, message: e.message }));
            }
          });
        },
      },
    ],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    server: {
      host: true,
      allowedHosts: [".trycloudflare.com", ".ngrok.io", ".ngrok-free.app"],
    },
  };
});

// ── PNG alpha extraction (shared between vite dev proxy and api/segment.js) ──
// Exported so vite.config can reference it in the inline proxy closure above.
// Not imported by any browser bundle.
async function extractAlphaMask(pngBytes) {
  const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (pngBytes[i] !== PNG_SIG[i]) throw new Error("Not a valid PNG");
  }
  const view = new DataView(
    pngBytes.buffer,
    pngBytes.byteOffset,
    pngBytes.byteLength,
  );
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  const bitDepth = pngBytes[24];
  const colorType = pngBytes[25];
  const interlace = pngBytes[28];
  if (bitDepth !== 8) throw new Error(`Unsupported PNG bit depth: ${bitDepth}`);
  if (colorType !== 6)
    throw new Error(`Expected RGBA PNG (colorType 6), got ${colorType}`);
  if (interlace !== 0) throw new Error("Interlaced PNG not supported");

  const idatChunks = [];
  let offset = 8;
  while (offset + 12 <= pngBytes.byteLength) {
    const chunkLen = view.getUint32(offset);
    const chunkType = String.fromCharCode(
      pngBytes[offset + 4],
      pngBytes[offset + 5],
      pngBytes[offset + 6],
      pngBytes[offset + 7],
    );
    if (chunkType === "IDAT")
      idatChunks.push(pngBytes.slice(offset + 8, offset + 8 + chunkLen));
    if (chunkType === "IEND") break;
    offset += 12 + chunkLen;
  }
  if (idatChunks.length === 0) throw new Error("No IDAT chunks found in PNG");

  const total = idatChunks.reduce((s, a) => s + a.byteLength, 0);
  const compressed = new Uint8Array(total);
  let off = 0;
  for (const a of idatChunks) {
    compressed.set(a, off);
    off += a.byteLength;
  }

  const ds = new DecompressionStream("deflate");
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  writer.write(compressed);
  writer.close();
  const rawChunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) rawChunks.push(value);
  }
  const rawTotal = rawChunks.reduce((s, a) => s + a.byteLength, 0);
  const raw = new Uint8Array(rawTotal);
  let rawOff = 0;
  for (const a of rawChunks) {
    raw.set(a, rawOff);
    rawOff += a.byteLength;
  }

  const bpp = 4;
  const scanlineLen = width * bpp;
  const recon = new Uint8Array(height * scanlineLen);
  function paeth(a, b, c) {
    const p = a + b - c,
      pa = Math.abs(p - a),
      pb = Math.abs(p - b),
      pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  }

  for (let row = 0; row < height; row++) {
    const rawBase = row * (1 + scanlineLen);
    const filter = raw[rawBase];
    const reconBase = row * scanlineLen;
    const prevBase = reconBase - scanlineLen;
    for (let i = 0; i < scanlineLen; i++) {
      const x = raw[rawBase + 1 + i];
      const a = i >= bpp ? recon[reconBase + i - bpp] : 0;
      const b = row > 0 ? recon[prevBase + i] : 0;
      const c = row > 0 && i >= bpp ? recon[prevBase + i - bpp] : 0;
      let val;
      switch (filter) {
        case 0:
          val = x;
          break;
        case 1:
          val = (x + a) & 0xff;
          break;
        case 2:
          val = (x + b) & 0xff;
          break;
        case 3:
          val = (x + Math.floor((a + b) / 2)) & 0xff;
          break;
        case 4:
          val = (x + paeth(a, b, c)) & 0xff;
          break;
        default:
          throw new Error(`Unknown PNG filter type: ${filter}`);
      }
      recon[reconBase + i] = val;
    }
  }

  const alphaMask = new Uint8Array(width * height);
  let totalPixelArea = 0;
  for (let i = 0; i < width * height; i++) {
    if (recon[i * bpp + 3] > 128) {
      alphaMask[i] = 1;
      totalPixelArea++;
    }
  }
  return {
    garmentMask: Array.from(alphaMask),
    totalPixelArea,
    maskWidth: width,
    maskHeight: height,
  };
}
