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
      return res.status(upstream.status).json({ error: "Upstream API error" });
    }

    const data = await upstream.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: "Empty response from model" });
    }

    const parsed = JSON.parse(content);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
}
