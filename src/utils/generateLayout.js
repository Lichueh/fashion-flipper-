// ─────────────────────────────────────────────────────────────────────────────
// GRID RESOLUTION
// Adjust GRID_CELL_CM to change packing accuracy vs. speed.
//   2 cm  → default, good balance (a ~50×70 cm front panel = 25×35 = 875 cells)
//   1 cm  → finer, fewer false rejections on curved garment edges, ~4× slower scan
//   4 cm  → coarser, fastest, but pieces near concave edges may land off-fabric
// ─────────────────────────────────────────────────────────────────────────────
const GRID_CELL_CM = 2;

// ── Occupancy grid ────────────────────────────────────────────────────────────

/**
 * Build a 2-D boolean occupancy grid from a segmentation mask.
 * Each cell is `true` when ≥ OCCUPANCY_THRESHOLD of its source pixels are
 * garment fabric. This lets pieces be placed on real garment fabric only.
 *
 * @param {Uint8Array} garmentMask   - Flat mask from segmentGarment().
 * @param {number}     maskWidth
 * @param {number}     maskHeight
 * @param {{ x, y, w, h }} bboxFraction - Bounding-box fractions from computeMeasurements().
 * @param {number}     panelWCm      - Physical width of the cropped bbox in cm.
 * @param {number}     panelHCm      - Physical height of the cropped bbox in cm.
 * @param {number}     [cellCm]      - Grid resolution in cm (defaults to GRID_CELL_CM).
 * @returns {{ grid: boolean[][], cols: number, rows: number, cellCm: number }}
 */
export function buildOccupancyGrid(
  garmentMask,
  maskWidth,
  maskHeight,
  bboxFraction,
  panelWCm,
  panelHCm,
  cellCm = GRID_CELL_CM,
) {
  // Fraction of a cell's pixels that must be garment for the cell to be "on".
  const OCCUPANCY_THRESHOLD = 0.5;

  const cols = Math.max(1, Math.ceil(panelWCm / cellCm));
  const rows = Math.max(1, Math.ceil(panelHCm / cellCm));

  // Pre-compute the pixel range inside the mask that corresponds to the bbox.
  const bboxColStart = bboxFraction.x * maskWidth;
  const bboxRowStart = bboxFraction.y * maskHeight;
  const bboxColEnd = bboxColStart + bboxFraction.w * maskWidth;
  const bboxRowEnd = bboxRowStart + bboxFraction.h * maskHeight;
  const bboxW = bboxColEnd - bboxColStart;
  const bboxH = bboxRowEnd - bboxRowStart;

  const grid = Array.from({ length: rows }, () => new Array(cols).fill(false));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Pixel bounds within the bounding-box crop for this grid cell.
      const px0 = bboxColStart + (col / cols) * bboxW;
      const px1 = bboxColStart + ((col + 1) / cols) * bboxW;
      const py0 = bboxRowStart + (row / rows) * bboxH;
      const py1 = bboxRowStart + ((row + 1) / rows) * bboxH;

      let total = 0;
      let garment = 0;

      for (let py = Math.floor(py0); py < Math.ceil(py1); py++) {
        if (py < 0 || py >= maskHeight) continue;
        for (let px = Math.floor(px0); px < Math.ceil(px1); px++) {
          if (px < 0 || px >= maskWidth) continue;
          total++;
          if (garmentMask[py * maskWidth + px]) garment++;
        }
      }

      grid[row][col] = total > 0 && garment / total >= OCCUPANCY_THRESHOLD;
    }
  }

  return { grid, cols, rows, cellCm };
}

/**
 * Returns true when placing a piece at `rotDeg` keeps its grain within 15°
 * of the garment grain — the same threshold used by the layout screen's
 * misalignment warning badge.
 */
function _isGrainAligned(pieceGrainDeg, rotDeg, garmentGrainDeg) {
  const effective = (pieceGrainDeg + rotDeg) % 360;
  const diff = Math.abs((effective - garmentGrainDeg + 180) % 180);
  return diff <= 15;
}

/**
 * Check whether a rectangle of `(pieceCols × pieceRows)` grid cells fits
 * at grid position `(startCol, startRow)` — i.e. all covered cells are `true`.
 */
function _rectangleFitsOnGrid(
  grid,
  rows,
  cols,
  startCol,
  startRow,
  pieceCols,
  pieceRows,
) {
  if (startRow + pieceRows > rows || startCol + pieceCols > cols) return false;
  for (let r = startRow; r < startRow + pieceRows; r++) {
    for (let c = startCol; c < startCol + pieceCols; c++) {
      if (!grid[r][c]) return false;
    }
  }
  return true;
}

/**
 * Mark cells occupied after a piece is placed so subsequent pieces don't
 * land in the same spot. Sets covered cells to `false` (no longer available).
 */
function _markCellsUsed(grid, startCol, startRow, pieceCols, pieceRows) {
  for (let r = startRow; r < startRow + pieceRows; r++) {
    for (let c = startCol; c < startCol + pieceCols; c++) {
      grid[r][c] = false;
    }
  }
}

// ── Layout packer ─────────────────────────────────────────────────────────────

/**
 * Greedy shelf-packing layout generator.
 *
 * When `segmentation` is supplied the packer uses an occupancy grid derived
 * from the garment mask so pieces are placed on real fabric only. The back
 * panel has no mask and is treated as fully covered fabric.
 *
 * When `segmentation` is absent (FreeSewing-only flow, no photo uploaded) the
 * packer falls back to the simple bounding-box shelf algorithm.
 *
 * Adjust GRID_CELL_CM at the top of this file to change accuracy vs. speed.
 *
 * @param {Array<{
 *   id: string,
 *   widthCm: number,
 *   heightCm: number,
 *   areaCm2?: number,
 *   cutCount?: number,
 * }>} pieces
 *
 * @param {{
 *   front: { widthCm: number, heightCm: number } | null,
 *   back:  { widthCm: number, heightCm: number } | null,
 * }} panelsCm
 *
 * @param {{
 *   garmentMask: Uint8Array,
 *   maskWidth: number,
 *   maskHeight: number,
 *   bboxFraction: { x: number, y: number, w: number, h: number },
 * } | null} [segmentation] - Pass null / undefined to skip mask-aware packing.
 *
 * @param {number} [garmentGrainDeg=90] - Garment grain direction in degrees.
 *   Pieces are tried in their grain-aligned orientation first. Only rotated as
 *   a fallback when the aligned orientation cannot be placed anywhere.
 *
 * @param {number} [seamAllowanceCm=1]
 *
 * @returns {{
 *   placements: Object.<string, { xCm: number, yCm: number, rotationDeg: number, panelKey: string }>,
 *   allFit: boolean,
 * }}
 */
export function generateLayout(
  pieces,
  panelsCm,
  segmentation = null,
  garmentGrainDeg = 90,
  seamAllowanceCm = 1,
) {
  const S = seamAllowanceCm;

  // Sort largest total-fabric-need first (area × cutCount) so big pieces get
  // first pick of space. Smaller pieces fill the gaps.
  const sorted = [...pieces].sort((a, b) => {
    const aA = (a.areaCm2 ?? a.widthCm * a.heightCm) * (a.cutCount ?? 1);
    const bA = (b.areaCm2 ?? b.widthCm * b.heightCm) * (b.cutCount ?? 1);
    return bA - aA;
  });

  // Build ordered panel list — front first, then back.
  const panels = [];
  if (panelsCm?.front?.widthCm)
    panels.push({ key: "front", ...panelsCm.front });
  if (panelsCm?.back?.widthCm) panels.push({ key: "back", ...panelsCm.back });

  const placements = {};
  let remaining = [...sorted];

  for (const panel of panels) {
    if (remaining.length === 0) break;

    const panW = panel.widthCm;
    const panH = panel.heightCm;

    // Build occupancy grid from the garment mask when available.
    // Both front and back panels use the same mask — the back panel background
    // shows the same garment image (at reduced opacity) so pieces should land
    // on the fabric area there too.
    let occupancy = null;
    if (segmentation?.garmentMask && segmentation.maskWidth) {
      const bf = segmentation.bboxFraction ?? { x: 0, y: 0, w: 1, h: 1 };
      occupancy = buildOccupancyGrid(
        segmentation.garmentMask,
        segmentation.maskWidth,
        segmentation.maskHeight,
        bf,
        panW,
        panH,
      );
    }

    const stillRemaining = [];

    for (const piece of remaining) {
      // Candidate orientations: 0° (natural) and 90° (rotated).
      // Only keep orientations that physically fit within the panel.
      const opts = [
        { pw: piece.widthCm, ph: piece.heightCm, rot: 0 },
        { pw: piece.heightCm, ph: piece.widthCm, rot: 90 },
      ].filter(({ pw, ph }) => pw <= panW - 2 * S && ph <= panH - 2 * S);

      if (opts.length === 0) {
        stillRemaining.push(piece);
        continue;
      }

      // Sort: grain-aligned orientation first, narrower width as tiebreaker.
      // This ensures pieces are never unnecessarily rotated away from grain.
      const pieceGrain = piece.grainAngleDeg ?? 90;
      opts.sort((a, b) => {
        const aAligned = _isGrainAligned(pieceGrain, a.rot, garmentGrainDeg);
        const bAligned = _isGrainAligned(pieceGrain, b.rot, garmentGrainDeg);
        if (aAligned !== bAligned) return aAligned ? -1 : 1;
        return a.pw - b.pw; // narrower as tiebreaker when both equal
      });

      // Primary orientation to try (grain-aligned and/or narrower).
      const primary = opts[0];
      // Fallback orientation only used when primary fails everywhere.
      const fallback = opts[1] ?? null;

      if (occupancy) {
        // ── Mask-aware placement: scan for the first grid position where
        //    the piece's bounding box is fully over garment fabric. ──────────
        const pieceCols = Math.ceil(primary.pw / occupancy.cellCm);
        const pieceRows = Math.ceil(primary.ph / occupancy.cellCm);
        let placed = false;

        outerScan: for (let r = 0; r <= occupancy.rows - pieceRows; r++) {
          for (let c = 0; c <= occupancy.cols - pieceCols; c++) {
            if (
              _rectangleFitsOnGrid(
                occupancy.grid,
                occupancy.rows,
                occupancy.cols,
                c,
                r,
                pieceCols,
                pieceRows,
              )
            ) {
              placements[piece.id] = {
                xCm: c * occupancy.cellCm + S,
                yCm: r * occupancy.cellCm + S,
                rotationDeg: primary.rot,
                panelKey: panel.key,
              };
              _markCellsUsed(occupancy.grid, c, r, pieceCols, pieceRows);
              placed = true;
              break outerScan;
            }
          }
        }

        // Fallback orientation — only tried when primary fails everywhere.
        if (!placed && fallback) {
          const altCols = Math.ceil(fallback.pw / occupancy.cellCm);
          const altRows = Math.ceil(fallback.ph / occupancy.cellCm);

          outerScanAlt: for (let r = 0; r <= occupancy.rows - altRows; r++) {
            for (let c = 0; c <= occupancy.cols - altCols; c++) {
              if (
                _rectangleFitsOnGrid(
                  occupancy.grid,
                  occupancy.rows,
                  occupancy.cols,
                  c,
                  r,
                  altCols,
                  altRows,
                )
              ) {
                placements[piece.id] = {
                  xCm: c * occupancy.cellCm + S,
                  yCm: r * occupancy.cellCm + S,
                  rotationDeg: fallback.rot,
                  panelKey: panel.key,
                };
                _markCellsUsed(occupancy.grid, c, r, altCols, altRows);
                placed = true;
                break outerScanAlt;
              }
            }
          }
        }

        if (!placed) stillRemaining.push(piece);
      } else {
        // ── Simple shelf packing (no mask) ───────────────────────────────────
        stillRemaining.push({
          _needsShelf: true,
          piece,
          pw: primary.pw,
          ph: primary.ph,
          rot: primary.rot,
        });
      }
    }

    // Drain the shelf queue for this panel (pieces that had no mask to check).
    if (stillRemaining.some((e) => e._needsShelf)) {
      let shelfX = S;
      let shelfY = S;
      let shelfH = 0;
      const nextRemaining = [];

      for (const entry of stillRemaining) {
        if (!entry._needsShelf) {
          nextRemaining.push(entry);
          continue;
        }
        const { piece, pw, ph, rot } = entry;

        if (shelfX + pw > panW - S) {
          shelfX = S;
          shelfY += shelfH + S;
          shelfH = 0;
        }
        if (shelfY + ph > panH - S) {
          nextRemaining.push(piece);
          continue;
        }

        placements[piece.id] = {
          xCm: shelfX,
          yCm: shelfY,
          rotationDeg: rot,
          panelKey: panel.key,
        };
        shelfX += pw + S;
        shelfH = Math.max(shelfH, ph);
      }
      remaining = nextRemaining;
    } else {
      remaining = stillRemaining;
    }
  }

  return { placements, allFit: remaining.length === 0 };
}
