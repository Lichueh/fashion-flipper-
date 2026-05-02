const POLLINATIONS_URL = "https://image.pollinations.ai/prompt";
const GEMINI_MODEL = "gemini-2.5-flash-image";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function tryGemini(prompt, seed, image) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

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

  if (!upstream.ok) return null;

  const json = await upstream.json();
  const part = json?.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data,
  );
  if (!part) return null;

  return {
    buffer: Buffer.from(part.inlineData.data, "base64"),
    contentType: part.inlineData.mimeType ?? "image/png",
  };
}

async function tryPollinations(prompt, seed, image) {
  // Pollinations FLUX has no image-to-image — skip when caller wants the
  // source image preserved.
  if (image) return null;
  const key = process.env.POLLINATIONS_KEY;
  if (!key) return null;

  const upstream = await fetch(
    `${POLLINATIONS_URL}/${encodeURIComponent(prompt)}` +
      `?width=512&height=512&model=flux&nologo=true&seed=${seed}&key=${key}`,
  );
  if (!upstream.ok) return null;

  return {
    buffer: Buffer.from(await upstream.arrayBuffer()),
    contentType: upstream.headers.get("content-type") ?? "image/jpeg",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, seed = "1", image = null } = req.body ?? {};
  if (!prompt) {
    return res.status(400).json({ error: "prompt is required" });
  }

  if (!process.env.GEMINI_API_KEY && !process.env.POLLINATIONS_KEY) {
    return res
      .status(500)
      .json({ error: "Neither GEMINI_API_KEY nor POLLINATIONS_KEY configured" });
  }

  try {
    const result =
      (await tryGemini(prompt, seed, image).catch(() => null)) ??
      (await tryPollinations(prompt, seed, image).catch(() => null));

    if (!result) {
      return res.status(502).json({ error: "All upstream providers failed" });
    }

    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).send(result.buffer);
  } catch (err) {
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
}
