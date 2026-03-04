# EverReach — Bulk Facebook Ad Generator
## Ready-to-paste Claude Code prompt (all placeholders filled)
**Project root:** `/Users/isaiahdupree/Documents/Software/AdCreator/everreach-ad-system`

---

## PASTE THIS INTO CLAUDE CODE

```
You are my Facebook ad creative agent for EverReach.

EverReach is an AI-powered relationship intelligence app that tells you exactly
who to reach out to, what to say, and when — so your network never goes cold.

---

PRODUCT CONTEXT
- One-liner: "Never let an important relationship go cold again."
- Enemy: CRM busywork, sticky-note follow-up systems, and silent LinkedIn connections
- Value prop: EverReach surfaces who needs you TODAY and drafts a ready-to-send message in 60 seconds
- ICP: Founders, sales reps, freelancers, recruiters, and consultants with 100+ relationships
  and high value per relationship who are time-poor

PAIN POINTS (use exactly these — already validated from Reddit research):
1. BUSY — "You're not bad at relationships. You're overloaded." / "One minute a day keeps your network from drifting."
2. REVENUE — "The bag you missed was a follow-up you didn't send." / "Relationships are pipeline. Pipeline decays when you wait."
3. CRM — "This isn't a CRM. It's a daily 'who matters today' list." / "No dashboard hell. No logging. Just action."
4. ORG — "Notes don't tell you who needs you TODAY." / "Your CRM stores info. EverReach triggers action."
5. CRINGE — "Follow-ups that sound like you, not a template." / "You edit it. You approve it. It sounds like you."
6. PRIVACY — "You choose what to connect. You approve every message." / "No auto-send. No sneaky sync. You're in charge."

---

TASK: Build a bulk Facebook ad creative generator

Step 1 — Set up the project
- Work in: /Users/isaiahdupree/Documents/Software/AdCreator/everreach-ad-system/
- Create a subfolder: bulk-generator/
- Check if .env exists at that root. If not, create .env.example with:
    PERPLEXITY_API_KEY=
  Then ask me to paste my Perplexity key before proceeding to Step 2.

Step 2 — Generate 20 ad copy variations
Using the 6 pain point angles above, generate 20 ad copy sets.
Each set must have:
  - headline: max 8 words, punchy, based on one of the hooks above
  - body: max 20 words, expands the hook, ends on a soft CTA or open loop
  - angle_code: one of [BUSY, REVENUE, CRM, ORG, CRINGE, PRIVACY]
  - awareness_level: one of [unaware, problem_aware, solution_aware, product_aware]

Distribute them roughly:
  - 4 x unaware (BUSY, CRINGE angles — no product name in headline)
  - 6 x problem_aware (REVENUE, ORG angles — pain front and center)
  - 6 x solution_aware (CRM, ORG angles — EverReach as the answer)
  - 4 x product_aware (PRIVACY, CRM angles — handle objections)

Save all 20 as: bulk-generator/ad-copy.json

Step 3 — Build the ad creative generator
Create a React app at bulk-generator/ that renders each ad as a 1080x1080px card.

Ad card design — "bold confrontational statement" layout:
  - Background: solid color (vary per angle_code — see color map below)
  - Top 60% of card: headline in large bold white sans-serif (Inter or system-ui)
    centered, max 2 lines
  - Bottom 30% of card: body text in smaller white regular weight, centered
  - Bottom strip (8%): EverReach wordmark in white, left-aligned, with tagline
    "Your network never goes cold." right-aligned
  - No images. Pure React components.

Color map per angle_code:
  BUSY    → #1a1a2e  (deep navy)
  REVENUE → #2d1b00  (dark amber)
  CRM     → #0d2137  (dark blue)
  ORG     → #1a2d1a  (dark green)
  CRINGE  → #2d1a2d  (deep purple)
  PRIVACY → #1a1a1a  (near black)

Step 4 — Build the preview UI
Create a preview page at localhost:3000 showing:
  - Grid of all 20 ad cards (4 per row)
  - Each card labeled with its angle_code and awareness_level
  - Filter buttons at top: [All] [BUSY] [REVENUE] [CRM] [ORG] [CRINGE] [PRIVACY]
  - "Download All as ZIP" button using JSZip + html2canvas to export all PNGs
  - "Download Selected" for filtered view

Step 5 — Save outputs
When the user clicks Download:
  - Use html2canvas to render each card to a 1080x1080 PNG at 1x device pixel ratio
  - Name each file: ER-[ANGLE_CODE]-[INDEX]-[AWARENESS_LEVEL].png
    e.g. ER-BUSY-01-unaware.png
  - Bundle into a zip: everreach-ads-bulk-[DATE].zip

Step 6 — Save the copy manifest
Write bulk-generator/ad-manifest.json with all 20 ad sets including:
  - id, angle_code, awareness_level, headline, body, color, filename

---

DEPENDENCIES TO INSTALL:
  npm install html2canvas jszip react react-dom
  npm install -D vite @vitejs/plugin-react

Run with: npm run dev

Build it end-to-end, start the dev server, and show me the preview UI at localhost:3000.
If you hit any blockers, tell me before stopping.
```

---

## ANSWERS TO THE THREE QUESTIONS

| Question | Answer for EverReach |
|----------|---------------------|
| **Niche** | "Founders, sales reps, freelancers, and recruiters who lose deals and opportunities because relationships go cold" |
| **Ad template format** | Bold confrontational statement on solid dark background — NOT before/after. The guilt/urgency hook IS the ad. No images. |
| **`.env` path** | `/Users/isaiahdupree/Documents/Software/AdCreator/everreach-ad-system/.env` — does not exist yet; Claude Code will create `.env.example` and prompt for the Perplexity API key |

---

## OUTPUT FILE LOCATIONS

After Claude Code runs:
- React app: `AdCreator/everreach-ad-system/bulk-generator/`
- Ad copy JSON: `AdCreator/everreach-ad-system/bulk-generator/ad-copy.json`
- Ad manifest: `AdCreator/everreach-ad-system/bulk-generator/ad-manifest.json`
- Downloaded ZIPs: wherever browser saves downloads

---

## EXISTING ASSETS IN THIS PROJECT TO REFERENCE

Claude Code can also reference these files already in the repo:

| File | What's in it |
|------|-------------|
| `docs/marketing-doc.md` | Full EverReach positioning, ICP, value prop |
| `docs/belief-matrix.md` | Belief clusters with objections and proof needed |
| `matrix/angle-matrix.json` | 6 belief clusters with hooks, emotional triggers |
| `generations/test_generations_formatted.md` | Prior ad copy generations to reference for tone |
| `prompts/problem-aware/` | Existing prompt files per awareness level |

Add this to your Claude Code prompt if you want it to reference them:
```
Also read these files before generating copy:
- /Users/isaiahdupree/Documents/Software/AdCreator/everreach-ad-system/docs/marketing-doc.md
- /Users/isaiahdupree/Documents/Software/AdCreator/everreach-ad-system/matrix/angle-matrix.json
- /Users/isaiahdupree/Documents/Software/AdCreator/everreach-ad-system/generations/test_generations_formatted.md
Use these to inform the tone and hooks — match what's already established.
```
