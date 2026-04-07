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

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Framework   | React 18                            |
| Build tool  | Vite 5                              |
| Styling     | Tailwind CSS 3                      |
| Language    | JavaScript (JSX)                    |
| Platform    | Mobile browser (phone-frame layout) |

---

## Application Structure

```
src/
├── App.jsx                  # Root component, screen router, shared state
├── main.jsx                 # Entry point
├── index.css                # Global styles
├── components/
│   ├── PhoneFrame.jsx       # Outer phone chrome wrapper
│   └── BottomNav.jsx        # Persistent bottom navigation bar
├── screens/
│   ├── HomeScreen.jsx       # Landing: hero, stats, community preview, templates
│   ├── UploadScreen.jsx     # Camera / image upload
│   ├── AnalysisScreen.jsx   # Simulated AI fabric analysis result
│   ├── TemplateSelectScreen.jsx  # Choose upcycling target (bag or hat)
│   ├── StepGuideScreen.jsx  # Step-by-step sewing instructions
│   ├── ResultScreen.jsx     # Finished result & share
│   └── CommunityScreen.jsx  # Community gallery feed
└── data/
    ├── templates.js         # Full step/material data for Tote Bag & Bucket Hat
    └── mockAnalysis.js      # Mock AI analysis response
```

---

## User Flow

```
[Home] → [Upload Photo] → [AI Analysis] → [Template Select]
                                                  ↓
                                          [Step Guide (5–6 steps)]
                                                  ↓
                                          [Result / Share]
                                                  ↕
                                          [Community Feed]
```

---

## Templates

### 1. Tote Bag (Beginner · ~1.5 hrs)
5-step guide converting old garments into a functional tote bag.
Steps: Cut fabric → Make handles → Sew body → Shape → Attach handles & finish.

### 2. Bucket Hat (Beginner+ · 2–3 hrs)
6-step guide for a vintage-style bucket hat.
Steps: Prepare pattern → Cut fabric → Sew crown → Make brim → Attach brim → Topstitch & finish.

---

## Key Design Decisions

- **Phone-frame wrapper**: All screens render inside a simulated phone frame (`PhoneFrame.jsx`) to reinforce mobile-native feel during desktop demos.
- **Simulated AI**: Fabric analysis is mocked (`mockAnalysis.js`) — no backend required, keeping the prototype self-contained.
- **Shared state in App.jsx**: `uploadedImage` and `selectedTemplate` flow down as props; `navigate()` handles both routing and data passing in one call.
- **Tailwind utility classes**: All styling is inline Tailwind — no separate CSS modules, fast iteration for prototype.

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
