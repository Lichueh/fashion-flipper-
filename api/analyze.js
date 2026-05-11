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

// Stage-2: takes the English fabric JSON and returns same shape with each
// translatable string field replaced by { en, nb, zh } objects. Uses gpt-4o-mini
// because pure terminology translation is cheap & fast.
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

async function translateFabricResult(parsed, token) {
  try {
    const upstream = await fetch(GITHUB_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: TRANSLATE_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(parsed) },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 800,
      }),
    });
    if (!upstream.ok) {
      console.warn("[analyze] translate upstream", upstream.status);
      return parsed;
    }
    const data = await upstream.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return parsed;
    return JSON.parse(content);
  } catch (err) {
    console.warn("[analyze] translate threw:", err?.message);
    return parsed;
  }
}

// ── Retry helper ──────────────────────────────────────────────────────────────
// Retries on transient server errors (502/503/504) with exponential backoff.
// Does NOT retry on client errors (400, 401, 429) since those won't self-resolve.
async function fetchWithRetry(url, options, retries = 3, baseDelayMs = 800) {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** (attempt - 1)));
    }
    try {
      const res = await fetch(url, options);
      if ([502, 503, 504].includes(res.status)) {
        lastError = new Error(`HTTP ${res.status}`);
        continue; // retry
      }
      return res; // success or non-retryable error — return as-is
    } catch (err) {
      lastError = err; // network failure — retry
    }
  }
  throw lastError;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "API token not configured" });
  }

  const { imageBase64, mimeType } = req.body ?? {};
  if (!imageBase64) {
    return res.status(400).json({ error: "imageBase64 is required" });
  }

  try {
    const upstream = await fetchWithRetry(GITHUB_API_URL, {
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
      const body = await upstream.text(); // read raw body
      console.error("Upstream error:", upstream.status, body);
      return res
        .status(upstream.status)
        .json({
          error: `Upstream API error: ${upstream.status}`,
          detail: body,
        });
    }

    const data = await upstream.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("[analyze] empty content from model", JSON.stringify(data));
      return res.status(502).json({
        error: "Empty response from model — please try again",
        finishReason: data.choices?.[0]?.finish_reason,
        raw: data,
      });
    }

    const parsed = JSON.parse(content);
    const translated = await translateFabricResult(parsed, token);
    return res.status(200).json(translated);
  } catch (err) {
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
}
