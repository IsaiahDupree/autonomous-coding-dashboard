# Motion Design with Claude Code in 20 Minutes
**Video**: https://www.youtube.com/watch?v=Vu_XOKKgJtA  
**Key topic**: Quick promotional motion graphics sprint using Remotion agent skill

---

## Core Insight

You can create a professional 10–15 second motion design graphic in under 20 minutes using Claude Code + the Remotion agent skill. This is best for: promotional title cards, social media hooks, logo reveals, short product highlights.

---

## Setup (Run OUTSIDE any project)

From the X/Twitter announcement, Remotion provided this install command:
```bash
# Run in terminal OUTSIDE any project directory
npx create-video@latest
```

This downloads the Remotion agent skill and sets up the project scaffold. After this, open Claude Code and start prompting inside the new project directory.

---

## 20-Minute Sprint Workflow

1. **Create project** — `npx create-video@latest my-promo`
2. **Open Claude Code** in the new directory
3. **First prompt** — describe the motion design:
   ```
   "Create a 15-second promotional video for [product].
   Style: dark background, electric blue accents, bold typography.
   Show the logo entering with a punch effect, then 3 feature callouts,
   then a CTA. Terminal/tech aesthetic."
   ```
4. **Review in Remotion Studio** — `npm start`
5. **Iterate** — targeted feedback, not wholesale rewrites:
   ```
   "The logo entrance is good. The feature text is too small — increase to 56px.
   The CTA slide-up is too slow — make it 10 frames."
   ```
6. **Render** — `npx remotion render MainVideo output.mp4`

---

## Watch for on X/Social

- Many posts claiming to be Remotion-generated are NOT — be skeptical of rage bait
- Remotion's own announcement had 8.3M views
- The real outputs look professional but not Hollywood-level — that's appropriate for the use case

---

## Best For

- Social media hooks (TikTok/Reels intro cards)
- Product announcement graphics
- Feature highlight videos
- Promotional clips for apps and services
- Title cards for YouTube videos

---

## Key Quote

> "I created this motion design graphic in less than 20 minutes using Claude Code. I'm genuinely blown away by this new capability."
