// api/segment.js
// Vercel serverless function — calls fal.ai BiRefNet (primary) or rembg (fallback)
// and returns a flat binary alpha mask compatible with computeMeasurements().

import { fal } from "@fal-ai/client";

export const config = {
  api: { bodyParser: false }, // required to read raw multipart stream
};

const TIMEOUT_MS = 25000;

fal.config({ credentials: process.env.FAL_API_KEY });

export default async function handler(req, res) {
  // Temporary debug endpoint — remove after confirming key is set
  if (req.method === "GET") {
    return res.status(200).json({
      hasFalKey: !!process.env.FAL_API_KEY,
      keyPrefix: process.env.FAL_API_KEY?.slice(0, 8) + "...",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: true, message: "Method not allowed" });
  }

  // Read raw body stream, then parse as FormData via the Web Fetch API (Node 18+).
  let imageFile;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);

    const webReq = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": req.headers["content-type"] },
      body: rawBody,
    });
    const formData = await webReq.formData();
    imageFile = formData.get("image");
  } catch (e) {
    return res
      .status(400)
      .json({ error: true, message: "Failed to parse FormData" });
  }

  if (!imageFile) {
    return res
      .status(400)
      .json({ error: true, message: "Missing 'image' field in FormData" });
  }

  const arrayBuffer = await imageFile.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = imageFile.type || "image/jpeg";
  const imageUrl = `data:${mimeType};base64,${base64}`;

  // Primary: BiRefNet
  let result = await _runWithTimeout(
    () => _callFal("fal-ai/birefnet", imageUrl),
    TIMEOUT_MS,
  );

  // Fallback: rembg
  if (!result) {
    console.warn(
      "[segment] BiRefNet failed or timed out — trying rembg fallback",
    );
    result = await _runWithTimeout(
      () => _callFal("fal-ai/imageutils/rembg", imageUrl),
      TIMEOUT_MS,
    );
  }

  if (!result) {
    return res
      .status(500)
      .json({ error: true, message: "Both segmentation models failed" });
  }

  return res.status(200).json(result);
}

// ── fal.ai call + alpha extraction ───────────────────────────────────────────

async function _callFal(modelId, imageUrl) {
  const output = await fal.run(modelId, {
    input: { image_url: imageUrl },
  });

  const outputImageUrl = output?.image?.url ?? output?.output?.image?.url;
  if (!outputImageUrl) throw new Error(`No output image URL from ${modelId}`);

  const imgRes = await fetch(outputImageUrl);
  if (!imgRes.ok)
    throw new Error(`Failed to fetch output image: ${imgRes.status}`);

  const arrayBuffer = await imgRes.arrayBuffer();
  return await _extractAlphaMask(new Uint8Array(arrayBuffer));
}

// ── PNG alpha extraction (pure Node, no canvas) ───────────────────────────────

async function _extractAlphaMask(pngBytes) {
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
    if (chunkType === "IDAT") {
      idatChunks.push(pngBytes.slice(offset + 8, offset + 8 + chunkLen));
    }
    if (chunkType === "IEND") break;
    offset += 12 + chunkLen;
  }

  if (idatChunks.length === 0) throw new Error("No IDAT chunks found in PNG");

  const compressed = _concatUint8Arrays(idatChunks);
  const ds = new DecompressionStream("deflate");
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  writer.write(compressed);
  writer.close();

  const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const raw = _concatUint8Arrays(chunks);

  const bpp = 4;
  const scanlineLen = width * bpp;
  const recon = new Uint8Array(height * scanlineLen);

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
          val = (x + _paeth(a, b, c)) & 0xff;
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

function _paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function _concatUint8Arrays(arrays) {
  const total = arrays.reduce((s, a) => s + a.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.byteLength;
  }
  return out;
}

function _runWithTimeout(fn, ms) {
  return Promise.race([
    fn().catch((err) => {
      console.error("[segment] model error:", err.message);
      return null;
    }),
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}
