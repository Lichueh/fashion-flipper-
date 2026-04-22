/** Convert a FreeSewing path ops array into an SVG `d` string. */
function opsToD(ops) {
  let d = "";
  for (const op of ops) {
    if (op.type === "move") {
      d += `M ${op.to.x.toFixed(2)} ${op.to.y.toFixed(2)} `;
    } else if (op.type === "line") {
      d += `L ${op.to.x.toFixed(2)} ${op.to.y.toFixed(2)} `;
    } else if (op.type === "curve") {
      d += `C ${op.cp1.x.toFixed(2)} ${op.cp1.y.toFixed(2)} ${op.cp2.x.toFixed(2)} ${op.cp2.y.toFixed(2)} ${op.to.x.toFixed(2)} ${op.to.y.toFixed(2)} `;
    } else if (op.type === "close") {
      d += "Z ";
    }
  }
  return d.trim();
}

/**
 * Compute the signed area of a path using Green's theorem / Shoelace formula.
 * Cubic Bézier curves are sampled at 20 interior points each (error < 0.5 %).
 * Returns the absolute area in mm².
 */
function pathArea(ops) {
  // Collect a polyline approximation of the closed path.
  const pts = [];
  let cx = 0;
  let cy = 0;

  for (const op of ops) {
    if (op.type === "move") {
      cx = op.to.x;
      cy = op.to.y;
      pts.push([cx, cy]);
    } else if (op.type === "line") {
      cx = op.to.x;
      cy = op.to.y;
      pts.push([cx, cy]);
    } else if (op.type === "curve") {
      // Sample 20 points along the cubic Bézier (excluding t=0 which was last point).
      const x0 = cx,
        y0 = cy;
      const x1 = op.cp1.x,
        y1 = op.cp1.y;
      const x2 = op.cp2.x,
        y2 = op.cp2.y;
      const x3 = op.to.x,
        y3 = op.to.y;
      const STEPS = 20;
      for (let i = 1; i <= STEPS; i++) {
        const t = i / STEPS;
        const u = 1 - t;
        pts.push([
          u * u * u * x0 +
            3 * u * u * t * x1 +
            3 * u * t * t * x2 +
            t * t * t * x3,
          u * u * u * y0 +
            3 * u * u * t * y1 +
            3 * u * t * t * y2 +
            t * t * t * y3,
        ]);
      }
      cx = op.to.x;
      cy = op.to.y;
    }
    // "close" op: shoelace handles open/closed automatically
  }

  // Shoelace formula.
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

/**
 * Compute a tight bounding box from the control/end points of a set of path ops.
 * (Uses control-point bbox, which slightly over-estimates Bézier curves but is
 *  accurate enough for layout purposes.)
 */
function pathBBox(ops) {
  const xs = [];
  const ys = [];
  for (const op of ops) {
    if (op.to) {
      xs.push(op.to.x);
      ys.push(op.to.y);
    }
    if (op.cp1) {
      xs.push(op.cp1.x);
      ys.push(op.cp1.y);
    }
    if (op.cp2) {
      xs.push(op.cp2.x);
      ys.push(op.cp2.y);
    }
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, minY, wMm: maxX - minX, hMm: maxY - minY };
}

/**
 * Generic FreeSewing pattern extractor. Works with any FreeSewing Design.
 *
 * @param {Function} Design      - A FreeSewing Design class (e.g. Aaron, Sandy)
 * @param {object}   measurements - Measurement set from @freesewing/models
 * @param {object}   parts        - Map of FreeSewing part key → display config:
 *                                  { label, panel, defaultX, defaultY, color, grainAngleDeg? }
 *                                  Parts not listed here are silently skipped.
 * @returns {Array} Piece objects compatible with PatternLayoutScreen's patternPieces format,
 *                  each with shape: "svgpath".
 */
export function extractPatternPieces(Design, measurements, parts) {
  const pattern = new Design({ measurements });
  pattern.draft();
  const draftedParts = pattern.parts?.[0];

  const result = [];

  for (const [key, part] of Object.entries(draftedParts)) {
    const config = parts[key];
    if (!config) continue; // skip internal base blocks and unlisted parts

    const seamPath = part.paths?.seam;
    if (!seamPath) continue;

    const { minX, minY, wMm, hMm } = pathBBox(seamPath.ops);

    result.push({
      id: key.replace(".", "-"),
      label: config.label,
      shape: "svgpath",
      svgPath: opsToD(seamPath.ops),
      viewBox: `${minX.toFixed(2)} ${minY.toFixed(2)} ${wMm.toFixed(2)} ${hMm.toFixed(2)}`,
      widthCm: parseFloat((wMm / 10).toFixed(1)),
      heightCm: parseFloat((hMm / 10).toFixed(1)),
      // Shoelace area (mm²) → cm², multiplied by cutCount (how many copies to cut).
      // e.g. a half-front drafted on-fold has cutCount: 2 to get both halves.
      areaCm2: Math.round(
        (pathArea(seamPath.ops) / 100) * (config.cutCount ?? 1),
      ),
      cutCount: config.cutCount ?? 1,
      grainAngleDeg: config.grainAngleDeg ?? 90,
      panel: config.panel,
      defaultX: config.defaultX,
      defaultY: config.defaultY,
      color: config.color,
    });
  }

  return result;
}
