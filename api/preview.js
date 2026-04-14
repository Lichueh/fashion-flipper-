const POLLINATIONS_URL = "https://image.pollinations.ai/prompt";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.POLLINATIONS_KEY;
  if (!token) {
    return res.status(500).json({ error: "POLLINATIONS_KEY not configured" });
  }

  const { prompt, seed = "1" } = req.query ?? {};
  if (!prompt) {
    return res.status(400).json({ error: "prompt is required" });
  }

  try {
    const upstream = await fetch(
      `${POLLINATIONS_URL}/${encodeURIComponent(prompt)}` +
        `?width=512&height=512&model=flux&nologo=true&seed=${seed}&key=${token}`,
    );

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Upstream error" });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") ?? "image/jpeg",
    );
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).send(buffer);
  } catch (err) {
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
}
