// api/segment.js
// Vercel serverless function — calls fal.ai SAM 3 and maps output
// to the exact same SegmentationResult shape as the old segmentation.js.

export const config = { maxDuration: 30 }; // extend beyond 10s default for slow images

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: true, message: "Method not allowed", lowConfidence: true });
  }

  
  const { imageBase64, mimeType = "image/jpeg" } = req.body ?? {};

  if (!imageBase64) {
    return res.status(400).json({ error: true, message: "Missing imageBase64", lowConfidence: true });
  }

  try {
    const falRes = await fetch("https://fal.run/fal-ai/sam-3/image", {
      method: "POST",
      headers: {
        "Authorization": `Key ${process.env.FAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: `data:${mimeType};base64,${imageBase64}`,
        // Prompt SAM to focus on the garment, not the background/person
        text_prompt: "garment, clothing, shirt, dress, pants, jacket, coat",
      }),
    });

    if (!falRes.ok) {
      const errText = await falRes.text();
      return res.status(500).json({ error: true, message: `fal.ai error: ${errText}`, lowConfidence: true });
    }

    const falData = await falRes.json();
    console.log("RAW FAL RESPONSE:", JSON.stringify(falData, null, 2));
    return res.json(mapFalToSegmentationResult(falData));

  } catch (err) {
    return res.status(500).json({
      error: true,
      message: err?.message ?? String(err),
      lowConfidence: true,
    });
  }
}


// ---------------------------------------------------------------------------
// Map fal.ai response → SegmentationResult
// fal.ai returns: { masks: [{ label, score, mask_url }], ... }
// We don't get pixel-level Uint8Array masks from the API so mask is null,
// but pixelArea is approximated from the bounding box area × score.
// ---------------------------------------------------------------------------
function mapFalToSegmentationResult(falData) {
  const masks = falData?.masks ?? falData?.objects ?? [];

  // fal.ai SAM returns masks with a `score` (0–1) and bounding box dimensions.
  // We use score + bbox area as a proxy for pixelArea since we don't download
  // the raw mask PNG in the serverless function.
  const FRONT_LABELS = ["shirt", "upper-clothes", "dress", "coat", "jacket", "top", "garment", "clothing"];
  const LEFT_LABELS  = ["left-arm", "left sleeve", "left arm"];
  const RIGHT_LABELS = ["right-arm", "right sleeve", "right arm"];
  const PANT_LABELS  = ["pants", "trousers", "jeans", "skirt", "bottom"];

  function bboxArea(mask) {
    const b = mask?.box ?? mask?.bbox;
    if (!b) return mask?.score ? Math.round(mask.score * 10000) : 0;
    return Math.round((b.w ?? b.width ?? 0) * (b.h ?? b.height ?? 0));
  }

  function mergeRegion(labelKeywords) {
    const matched = masks.filter(m =>
      labelKeywords.some(kw => m.label?.toLowerCase().includes(kw))
    );
    const area = matched.reduce((sum, m) => sum + bboxArea(m), 0);
    const avgScore = matched.length
      ? matched.reduce((s, m) => s + (m.score ?? 0), 0) / matched.length
      : 0;
    return { pixelArea: area, confidence: avgScore, mask: null };
  }

  const frontPanel  = mergeRegion(FRONT_LABELS);
  const sleeveLeft  = mergeRegion(LEFT_LABELS);
  const sleeveRight = mergeRegion(RIGHT_LABELS);
  const backPanel   = { pixelArea: 0, confidence: 0, mask: null };

  const totalGarmentPixels = frontPanel.pixelArea + sleeveLeft.pixelArea + sleeveRight.pixelArea;

  // Re-normalise confidence against total garment pixels (same logic as original)
  function normalise(region) {
    return {
      ...region,
      confidence: totalGarmentPixels > 0 ? region.pixelArea / totalGarmentPixels : 0,
    };
  }

  const fp = normalise(frontPanel);
  const sl = normalise(sleeveLeft);
  const sr = normalise(sleeveRight);

  // Garment category
  const pantArea = mergeRegion(PANT_LABELS).pixelArea;
  const maxPx = Math.max(fp.pixelArea, pantArea);
  let garmentCategory = "unknown";
  if (maxPx > 0) {
    if (maxPx === pantArea && pantArea > fp.pixelArea) garmentCategory = "pants";
    else if (fp.pixelArea > 0) {
      const hasDress = masks.some(m => m.label?.toLowerCase().includes("dress"));
      garmentCategory = hasDress ? "dress" : "tshirt";
    }
  }

  const dominantConfidence = Math.max(fp.confidence, sl.confidence, sr.confidence);
  const lowConfidence = dominantConfidence < 0.15;

  const rawLabels = Object.fromEntries(
    masks.map(m => [m.label ?? "unknown", bboxArea(m)])
  );

  

  return {
    garmentCategory,
    lowConfidence,
    regions: { frontPanel: fp, sleeveLeft: sl, sleeveRight: sr, backPanel },
    rawLabels,
  };
}