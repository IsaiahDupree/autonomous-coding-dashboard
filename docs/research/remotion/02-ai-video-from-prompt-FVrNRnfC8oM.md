# AI Video Generation from Text Prompt in Claude
**Video**: https://www.youtube.com/watch?v=FVrNRnfC8oM  
**Key topic**: Product demo videos from UI screenshots + single text prompt

---

## Core Insight

With 1–2 prompts, Claude Code can take UI component screenshots and generate full product demo videos with voiceovers — no video editor involved.

**Use case demonstrated**: SaaS product demo — takes real UI screenshots → animated walkthrough → Nana Banana voiceover → complete marketing video.

---

## Key Patterns

### UI Component → Video
1. Screenshot the most important product screens (3–5 max)
2. Drop them into `/public/assets/`
3. Describe the product in the prompt
4. Claude Code generates Remotion scenes showing each screen with animation
5. Add voiceover narration that explains what's being shown

### Voiceover Options
- **Nana Banana** — fast, free-tier voiceover API used in this video
- **ElevenLabs** — higher quality, SDK integration (recommended for ACTP)
- Both produce MP3 → reference via `staticFile('voiceover.mp3')` in Remotion

### Prompt Pattern for Product Demo
```
"Create a 30-second product demo video for [Product].
I have screenshots in /public/assets/:
  - dashboard.png — main dashboard view
  - analytics.png — analytics page
  - settings.png — automation settings
Color palette: [primary] on [background]
Tone: professional, clean, minimal
Include voiceover script for each scene."
```

---

## ACTP Application

For ACTP, this means:
- After building any product/feature, generate a demo video automatically
- Feed the ACD dashboard screenshots as assets
- The `research-to-publish` workflow can auto-generate demo videos as one of the steps
- Product demo videos for all Rork apps in the queue

---

## Key Quotes

> "With just one or two prompts, I can make videos where it takes components from my UI and can literally build voiceovers and generate full-on product demos."

> "People are generating entire videos with voiceovers, motion graphics and product demos all from a single text prompt inside of Claude."
