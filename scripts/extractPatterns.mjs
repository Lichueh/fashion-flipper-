/**
 * Build script — run once to generate src/data/freesewingPatterns.json
 *
 * Usage:
 *   node scripts/extractPatterns.mjs
 *
 * To add a new pattern:
 *   1. npm install @freesewing/<name>
 *   2. Create src/patterns/<name>.js  (copy aaron.js as a template)
 *   3. Add one import + one entry in the `patternFiles` object below
 *   4. Re-run this script
 */

import { extractPatternPieces } from "../src/utils/extractFreeSewingPieces.js";
import { writeFileSync } from "fs";

// ── Add new patterns here ─────────────────────────────────────────────────────
import aaron from "../src/patterns/aaron.js";
import bella from "../src/patterns/bella.js";
import bent from "../src/patterns/bent.js";
import brian from "../src/patterns/brian.js";
import charlie from "../src/patterns/charlie.js";
import diana from "../src/patterns/diana.js";
import hortensia from "../src/patterns/hortensia.js";
import penelope from "../src/patterns/penelope.js";
import simon from "../src/patterns/simon.js";
import simone from "../src/patterns/simone.js";
import sophie from "../src/patterns/sophie.js";
import teagan from "../src/patterns/teagan.js";
import waralee from "../src/patterns/waralee.js";
import wahid from "../src/patterns/wahid.js";
// cathrin: excluded — no 'seam' paths found; pattern uses a different path name

const patternFiles = {
  aaron,
  bella,
  bent,
  brian,
  charlie,
  diana,
  hortensia,
  penelope,
  simon,
  simone,
  sophie,
  teagan,
  waralee,
  wahid,
};
// ─────────────────────────────────────────────────────────────────────────────

const result = {};
let ok = 0;
let fail = 0;

for (const [id, config] of Object.entries(patternFiles)) {
  try {
    const pieces = extractPatternPieces(
      config.Design,
      config.measurements,
      config.parts,
    );
    if (pieces.length === 0) {
      console.warn(`⚠  ${id}: extracted 0 pieces — check the parts map`);
      fail++;
    } else {
      result[id] = pieces;
      console.log(`✓  ${id}: ${pieces.length} piece(s)`);
      ok++;
    }
  } catch (err) {
    console.error(`✗  ${id}: ${err.message}`);
    fail++;
  }
}

writeFileSync(
  "./src/data/freesewingPatterns.json",
  JSON.stringify(result, null, 2),
);

console.log(
  `\nWrote src/data/freesewingPatterns.json  (${ok} ok, ${fail} failed)`,
);
