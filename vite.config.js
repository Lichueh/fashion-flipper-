import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const GITHUB_API_URL = "https://models.inference.ai.azure.com/chat/completions";

const SYSTEM_PROMPT = `You are a fabric analysis assistant. When given an image of a garment, analyze its fabric and return ONLY a valid JSON object with this exact structure — no markdown, no explanation, only the JSON:
{
  "type": "string (e.g. Cotton Fabric, Denim, Linen, Polyester Blend)",
  "color": "string (e.g. Deep Blue, Cream White, Burgundy Red)",
  "composition": [{ "material": "string", "percentage": number }],
  "weight": "string (one of: Lightweight, Medium weight, Heavy)",
  "texture": "string (e.g. Plain weave, Twill, Jersey knit, Denim twill, Ribbed knit)",
  "condition": "string (e.g. Excellent, Good, Good (slight fading), Fair (visible wear))",
  "tags": ["string"]
}
For tags, pick 2–4 relevant labels from: Natural Fiber, Synthetic, Blended, Machine Washable, Hand Wash Only, Dye-friendly, Stretch, Woven, Knit.
Composition percentages must sum to 100.`;

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
                              detail: "low",
                            },
                          },
                          {
                            type: "text",
                            text: "Analyze this garment's fabric and return the JSON object.",
                          },
                        ],
                      },
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.1,
                    max_tokens: 400,
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
              console.error(
                `[preview] gemini ok but no inlineData in ${Date.now() - t0}ms:`,
                JSON.stringify(json).slice(0, 500),
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

                if (!prompt) {
                  res.statusCode = 400;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: "prompt is required" }));
                  return;
                }

                const result =
                  (await tryGemini(prompt, seed, image).catch(() => null)) ??
                  (await tryPollinations(prompt, seed, image).catch(
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
