# Fashion Flipper — Project Report

## Overview

**Fashion Flipper** is a mobile-first interactive prototype designed for an HCI research context. The app guides users through AI-assisted upcycling of old clothing items into new accessories, targeting sustainability and creative reuse.

The prototype simulates an end-to-end experience: photographing a garment, receiving an AI fabric analysis, selecting a upcycling template, following step-by-step sewing instructions, and sharing results in a community feed.

---

## Goals

- Demonstrate how AI can lower the barrier to clothing upcycling for non-expert users
- Evaluate user flow from photo input to completed DIY guide
- Provide a high-fidelity mobile prototype for user studies / CHI submission

---

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Framework  | React 18                            |
| Build tool | Vite 5                              |
| Styling    | Tailwind CSS 3                      |
| Language   | JavaScript (JSX)                    |
| Platform   | Mobile browser (phone-frame layout) |

---

## Application Structure

```
src/
├── App.jsx                  # Root component, screen router, shared state
├── main.jsx                 # Entry point
├── index.css                # Global styles
├── components/
│   ├── PhoneFrame.jsx       # Outer phone chrome wrapper
│   ├── BottomNav.jsx        # Persistent bottom navigation bar
│   └── GarmentOverlay.jsx   # Segmentation visualization with panel masks and measurements
├── screens/
│   ├── HomeScreen.jsx       # Landing: hero, stats, community preview, templates
│   ├── UploadScreen.jsx     # Camera / image upload
│   ├── CameraPatternScreen.jsx   # Measure garment (longest side) for pixel-to-cm calibration
│   ├── AnalysisScreen.jsx   # AI fabric analysis with segmentation visualization
│   ├── TemplateSelectScreen.jsx  # Choose upcycling target; shows feasible templates
│   ├── PatternLayoutScreen.jsx   # Interactive pattern piece placement on front/back panels
│   ├── StepGuideScreen.jsx  # Step-by-step sewing instructions
│   ├── BasicTutorialScreen.jsx   # Foundational sewing techniques (machine setup, stitches, etc.)
│   ├── ResultScreen.jsx     # Finished result & share
│   └── CommunityScreen.jsx  # Community gallery feed
├── hooks/
│   └── useAnalysisPipeline.js  # Orchestrates segmentation → measurement → feasibility checking
├── services/
│   ├── segmentation.js      # In-browser garment segmentation using Transformers.js (Xenova/segformer_b2_clothes)
│   ├── measurements.js      # Converts segmentation masks into physical measurements (cm²) using user-supplied pixel scale
│   ├── feasibility.js       # Checks which templates fit; validates area and bounding-box constraints
│   ├── segmentation.test.js # Unit tests for segmentation logic
│   └── feasibility.test.js  # Unit tests for feasibility checking
├── workers/
│   └── segmentation.worker.js   # Web Worker that runs the ML segmentation model (offthread)
├── data/
│   ├── templates.js         # Full step/material data for Tote Bag & Bucket Hat
│   ├── tutorials.js         # Optional sewing tutorials (machine basics, stitching techniques, etc.)
│   └── mockAnalysis.js      # Mock AI analysis response
```

---

## User Flow

```
[Home] → [Upload Photo] → [Camera Pattern Screen]
                                  ↓
                          (Measure longest side)
                                  ↓
                          [AI Analysis] → [Garment Overlay]
                                  ↓
                         [Template Select] ← Feasibility check
                                  ↓
                          [Pattern Layout]
                                  ↓
                          [Step Guide (5–6 steps)]
                                  ↓
                          [Result / Share]
                                  ↕
                          [Community Feed]
```

---

## Analysis Pipeline

The **Analysis Pipeline** (`useAnalysisPipeline.js`) orchestrates in-browser AI garment analysis:

### Stage 1: Segmentation

- Uses **Transformers.js** (Xenova/segformer_b2_clothes) to detect garment regions: front panel, sleeves, back panel.
- Runs in a **Web Worker** (`segmentation.worker.js`) to avoid blocking the UI.
- Returns pixel-level masks for each detected region and a confidence score.

### Stage 2: Scale Calibration

- User measures the longest side of their garment (via `CameraPatternScreen`).
- Pipeline calculates the pixel-to-cm scale factor using the front panel's bounding box.
- If confidence is low (<15%), prompts user for manual scale input.

### Stage 3: Measurement Computation

- Converts segmentation masks into physical measurements using `measurements.js`.
- Outputs: panel dimensions (width/height in cm), areas (cm²), and total garment area.

### Stage 4: Feasibility Checking

- `feasibility.js` validates each template against the garment:
  - **Area check**: Ensures total available area ≥ required area + 10% seam allowance.
  - **Piece fit check**: Verifies each pattern piece's bounding box fits within at least one detected panel.
- Returns a ranked list of feasible templates with fit scores.

**Status States:**

- `idle` → `segmenting` → `awaiting_scale` → `measuring` → `checking` → `done`
- On low confidence or error: transitions to `done` with `needsManualInput: true`

---

## Templates

### 1. Tote Bag (Beginner · ~1.5 hrs)

5-step guide converting old garments into a functional tote bag.
Steps: Cut fabric → Make handles → Sew body → Shape → Attach handles & finish.

### 2. Bucket Hat (Beginner+ · 2–3 hrs)

6-step guide for a vintage-style bucket hat.
Steps: Prepare pattern → Cut fabric → Sew crown → Make brim → Attach brim → Topstitch & finish.

### Pattern Layout

Before sewing, users interactively layout pattern pieces on front/back panels (`PatternLayoutScreen`):

- Drag pieces to reposition; double-tap to rotate.
- AI detects grain misalignment (pieces rotated ≠ garment grain) and flags warnings.
- Pieces can be moved between panels by dragging or using →B/→F buttons.
- Visual feedback: grain arrows, piece dimensions, rotation badges.

---

## Key Design Decisions

- **In-browser AI**: Uses Transformers.js for segmentation — no backend required; runs via Web Worker to keep UI responsive.
- **Pixel-to-CM calibration**: User measures only the longest side of their garment; all measurements scale from this single reference.
- **Phone-frame wrapper**: All screens render inside a simulated phone frame (`PhoneFrame.jsx`) to reinforce mobile-native feel during desktop demos.
- **Feasibility + Guided Layout**: Shows only feasible templates; lets users manually adjust piece placement with real-time grain direction warnings.
- **Shared state in App.jsx**: `uploadedImage`, `selectedTemplate`, `measurements`, `segmentation` flow down as props; `navigate()` handles routing and state passing.
- **Tailwind utility classes**: All styling is inline Tailwind — no separate CSS modules, fast iteration for prototype.
- **Optional tutorials**: `BasicTutorialScreen` offers foundational sewing techniques (accessible from any screen) to support less experienced users.

---

## Services & Utilities

### Segmentation (`services/segmentation.js`)

- **Model**: Xenova/segformer_b2_clothes (Transformers.js) — identifies garment regions at pixel level.
- **Output**: Region masks for `frontPanel`, `sleeveLeft`, `sleeveRight`, `backPanel`; confidence score.
- **Runs in**: Web Worker (async, non-blocking).

### Measurements (`services/measurements.js`)

- **Input**: Segmentation result + user-supplied longest-side measurement (cm).
- **Calculation**: Derives pixel-to-cm scale from front panel bounding box; applies to all panels.
- **Output**: Width/height/area (cm²) for each detected region + total garment area.
- **Tests**: `measurements.test.js` validates bounding-box math and scale conversions.

### Feasibility (`services/feasibility.js`)

- **Two-stage check**:
  1. **Area**: Total required area (+ 10% seam allowance) ≤ available area.
  2. **Piece fit**: Each pattern piece's bounding box must fit within at least one measured panel (trying both orientations).
- **Output**: Each template tagged with `feasible: true/false`, `fitScore` (0–1), `usedAreaPct`, and failure reason if applicable.
- **Tests**: `feasibility.test.js` verifies area checks, bounding-box logic, and edge cases.

### Web Worker (`workers/segmentation.worker.js`)

- Encapsulates the ML model initialization and inference.
- Listens for image data; returns segmentation result asynchronously.
- Reused across hook instances — model loads only once per page.

---

## Running the Prototype

```bash
npm install
npm run dev   # → http://localhost:5173
```

For mobile testing on the same Wi-Fi network, Vite's `--host` flag (already set in `package.json`) exposes the server on the local IP.

---

## Change Log

See [LOG.md](./LOG.md) for detailed change history.
