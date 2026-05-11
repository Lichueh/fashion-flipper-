import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const GITHUB_API_URL = "https://models.inference.ai.azure.com/chat/completions";

// Stage-2 prompt: takes the English fabric JSON and returns same shape with
// each translatable string field replaced by { en, nb, zh } objects. Uses
// gpt-4o-mini because pure terminology translation is cheap & fast.
const TRANSLATE_SYSTEM_PROMPT = `You translate fabric / textile terminology into Norwegian Bokmål (nb) and Traditional Chinese (zh).

Input: a JSON object describing analyzed fabric.
Output: same JSON structure, but each translatable string value replaced with:
  { "en": "<original English>", "nb": "<Norwegian Bokmål>", "zh": "<Traditional Chinese>" }

Translate these string fields ONLY:
- type, color, weight, texture, condition (top-level strings)
- composition[].material (string inside array of objects — keep percentage numeric unchanged)
- tags[] (array of strings — each element becomes a { en, nb, zh } object)

Use natural textile vocabulary. Examples:
- "Cotton Fabric" → { "en": "Cotton Fabric", "nb": "Bomullsstoff", "zh": "棉質布料" }
- "Deep Blue" → { "en": "Deep Blue", "nb": "Dyp blå", "zh": "深藍" }
- "Plain weave" → { "en": "Plain weave", "nb": "Lerretsbinding", "zh": "平織" }
- "Medium weight" → { "en": "Medium weight", "nb": "Middels vekt", "zh": "中等厚度" }
- "Good (slight fading)" → { "en": "Good (slight fading)", "nb": "God (litt falming)", "zh": "良好（輕微褪色）" }
- "Natural Fiber" → { "en": "Natural Fiber", "nb": "Naturfiber", "zh": "天然纖維" }
- "Unknown" → { "en": "Unknown", "nb": "Ukjent", "zh": "未知" }

Return ONLY a valid JSON object. No markdown, no explanation.`;

const SYSTEM_PROMPT = `You are a fabric analysis assistant for an upcycling app. Analyse the garment's fabric carefully — look at weave/knit pattern, sheen, drape, surface texture, color saturation, and visible wear. Ignore any ruler, hand, or background object in the photo. Then return ONLY a valid JSON object — no markdown, no explanation:
{
  "type": "string (e.g. Cotton Fabric, Denim, Linen, Polyester Blend, Wool Knit, Silk Blend)",
  "color": "string (e.g. Deep Blue, Cream White, Burgundy Red, Charcoal)",
  "composition": [{ "material": "string", "percentage": number }],
  "weight": "string — one of: Lightweight, Medium weight, Heavy",
  "texture": "string — pick the best match: Plain weave, Twill, Jersey knit, Ribbed knit, Denim twill, Fleece, Satin, Canvas, Corduroy, Other (...)",
  "condition": "string (e.g. Excellent, Good, Good (slight fading), Fair (visible wear), Worn)",
  "tags": ["string"]
}
Rules:
- For tags, pick 2–4 from: Natural Fiber, Synthetic, Blended, Machine Washable, Hand Wash Only, Dye-friendly, Stretch, Woven, Knit.
- Composition percentages must sum to 100.
- If a field genuinely cannot be determined from the photo (e.g. fabric not in frame, severe blur), return "Unknown" for that string field. Do NOT invent details to fill gaps — saying Unknown is preferred over wrong.
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
                    max_tokens: 600,
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
                  console.log("[analyze] gpt-4o →", content.replace(/\s+/g, " "));
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
                // Stage 2 — translate the English JSON into { en, nb, zh } shape
                let translated = content;
                try {
                  const parsed = JSON.parse(content);
                  const t0 = Date.now();
                  const tRes = await fetch(GITHUB_API_URL, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      model: "gpt-4o-mini",
                      messages: [
                        {
                          role: "system",
                          content: TRANSLATE_SYSTEM_PROMPT,
                        },
                        {
                          role: "user",
                          content: JSON.stringify(parsed),
                        },
                      ],
                      response_format: { type: "json_object" },
                      temperature: 0,
                      max_tokens: 800,
                    }),
                  });
                  if (tRes.ok) {
                    const tData = await tRes.json();
                    const tContent = tData.choices?.[0]?.message?.content;
                    if (tContent) {
                      // Validate it parses — otherwise fall back to English
                      JSON.parse(tContent);
                      translated = tContent;
                      console.log(
                        `[analyze] translate ok (${Date.now() - t0}ms)`,
                      );
                    } else {
                      console.warn(
                        "[analyze] translate empty content, keeping English",
                      );
                    }
                  } else {
                    console.warn(
                      `[analyze] translate upstream ${tRes.status}, keeping English`,
                    );
                  }
                } catch (tErr) {
                  console.warn(
                    "[analyze] translate threw, keeping English:",
                    tErr.message,
                  );
                }
                res.statusCode = 200;
                res.end(translated);
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
                  error: "Neither GEMINI_API_KEY nor POLLINATIONS_KEY set in .env",
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
    ],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    server: {
      allowedHosts: [".trycloudflare.com", ".ngrok.io", ".ngrok-free.app"],
    },
  };
});
