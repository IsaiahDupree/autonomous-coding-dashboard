/**
 * youtube-content-prompts.js
 * ==========================
 * All Claude/OpenAI prompts for the YouTube → Content Package pipeline.
 *
 * Pipeline design (3 Claude calls, no RapidAPI needed):
 *   Step 1: yt-dlp downloads video to Passport drive
 *   Step 2: ffmpeg extracts audio → OpenAI Whisper transcribes
 *   Step 3: ffmpeg extracts keyframes → Claude Vision analyses slides/diagrams
 *   Call 1 (Sonnet): merge transcript + visual analysis → structured extract
 *   Call 2 (Sonnet): generate full content package (blog + newsletter + social)
 *   Call 3 (Haiku):  generate attachments (summary, lesson plan, resources)
 *   Publish → all platforms → delete local video file
 */

// ── Call 1: Structured Extract ────────────────────────────────────────────────
// Receives: Whisper transcript text + Claude vision frame descriptions
export function buildExtractPrompt({ title, channel, url, transcriptText, visualInsights }) {
  const visualSection = visualInsights
    ? `\nVisual Analysis (from video frames — slides, diagrams, screen content):\n${visualInsights}`
    : '';

  return `You are a content intelligence engine processing a YouTube video.

Video: "${title}"
Channel: ${channel}
URL: ${url}

Transcript (verbatim from audio, Whisper transcription):
${transcriptText}
${visualSection}

Extract and return a single JSON object with these exact fields:
{
  "insights": "bullet list of up to 10 key insights, each on its own line starting with •",
  "learning_lessons": "numbered list of up to 7 actionable lessons, each starting with a number and period",
  "key_takeaways": "3-5 punchy one-liner takeaways readers will remember, each on its own line starting with →",
  "resources": [{"name": "string", "url": "string or null", "type": "tool|book|person|link|framework"}],
  "claude_skill": "a reusable Claude system prompt that lets someone apply the main concept from this video. Format:\\n# Skill: {name}\\n# Source: {title} by {channel}\\n\\n## System Prompt\\n{the prompt}\\n\\n## Example Usage\\n{1-2 examples with expected responses}",
  "voice_track": "narration script for a 60-90 second short-form video. Speaker-only text. Engaging, curious tone. No stage directions. No quotation marks. 150-250 words.",
  "suggested_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "topic_summary": "2-3 sentence plain-English summary of what the video teaches"
}

Return ONLY the JSON object. No markdown fences, no explanation.`;
}

// ── Visual frame analysis prompt (sent to Claude vision per frame batch) ──────
export function buildFrameAnalysisPrompt(frameCount) {
  return `These are ${frameCount} keyframes from a YouTube video. For each frame that contains useful content, describe:
- Any text visible (slide titles, bullet points, code, URLs, tool names)
- Any diagrams, charts, or visual frameworks shown
- Any on-screen demonstrations or UI walkthroughs

Focus on information that would NOT be in an audio transcript. Skip frames showing only the speaker talking.
Be concise. Output as a plain numbered list of frame observations. Skip blank or speaker-only frames entirely.`;
}

// ── Call 2: Full Content Package ──────────────────────────────────────────────
export function buildContentPackagePrompt({ title, channel, url, insights, learning_lessons, key_takeaways, resources, topic_summary }) {
  const resourceList = Array.isArray(resources) && resources.length
    ? resources.map(r => `- ${r.name}${r.url ? ': ' + r.url : ''} (${r.type})`).join('\n')
    : '(none mentioned)';

  return `You are a professional content strategist. Generate a complete multi-format content package based on this video analysis.

VIDEO: "${title}" by ${channel}
URL: ${url}
Summary: ${topic_summary}

Key Insights:
${insights}

Learning Lessons:
${learning_lessons}

Key Takeaways:
${key_takeaways}

Resources Mentioned:
${resourceList}

Generate a JSON object with exactly these fields:

{
  "medium_title": "compelling, SEO-friendly title for Medium (60-80 chars)",
  "medium_subtitle": "engaging subtitle that expands on the title (max 140 chars)",
  "medium_post_html": "complete Medium blog post in HTML, 800-1500 words. Structure: <h1>title</h1><p>intro hook</p> then 3-5 <h2> sections weaving in insights and lessons. End with <h2>Key Takeaways</h2> as a <ul> list, then a CTA paragraph. CRITICAL: use single quotes for ALL HTML attributes e.g. <a href='url'>name</a> <h2 class='section'>. NO double quotes inside HTML. NO DOCTYPE, html, head, or body tags.",
  "newsletter_text": "plain-text newsletter. Format:\\nSubject: {line}\\n\\n{hook 2-3 sentences}\\n\\nWhat you'll learn:\\n{3 bullet lessons}\\n\\n{CTA to read full post} [MEDIUM_URL]\\n\\nMax 350 words.",
  "community_post": "casual community forum post, 200-300 words. Sound like a person sharing a discovery, not a marketer. End with a question to spark replies.",
  "tweet_thread": "5-7 tweet thread. Format each as: N/ {text}\\n — one per line. Tweet 1: hook with biggest insight. Tweets 2-5: one learning each. Tweet 6: a standout resource or tool. Tweet 7: CTA [MEDIUM_URL]. Each tweet max 280 chars.",
  "pinterest_caption": "Pinterest image caption, max 250 chars, hooks on the content theme, ends with a CTA",
  "linkedin_post": "professional LinkedIn post, 150-250 words. Opens with a bold statement. Uses line breaks for readability. 3-5 insights as short bullets. Ends with a question. Include relevant hashtags at the bottom."
}

Return ONLY the JSON object. No markdown fences, no explanation.`;
}

// ── Call 3: Attachments ───────────────────────────────────────────────────────
export function buildAttachmentsPrompt({ title, channel, url, insights, learning_lessons, key_takeaways, resources, topic_summary }) {
  const resourceTable = Array.isArray(resources) && resources.length
    ? '| Name | Type | URL |\n|------|------|-----|\n' +
      resources.map(r => `| ${r.name} | ${r.type} | ${r.url || 'n/a'} |`).join('\n')
    : '| (none mentioned) | — | — |';

  return `Generate 3 structured markdown documents as a JSON object. Be thorough and specific to this content.

VIDEO: "${title}" by ${channel}
URL: ${url}
Summary: ${topic_summary}

Insights: ${insights}
Lessons: ${learning_lessons}
Takeaways: ${key_takeaways}

Resources:
${resourceTable}

Use EXACTLY this output format with the delimiter tags. Write each document in full between its tags:

===SUMMARY_START===
# ${title}
Source: ${url}
Channel: ${channel}

## What This Is About
{2-3 sentences}

## Key Insights
{bullet list from insights}

## Learning Lessons
{numbered list from lessons}

## Key Takeaways
{one-liners, one per line}

## Resources
${resourceTable}
===SUMMARY_END===

===LESSONS_START===
# Lesson Plan: {topic derived from video}

## Learning Objectives
{3-5 specific, measurable bullets}

## Prerequisites
{what the learner needs to know first}

## Lesson Outline (30-60 min)
{timed sections with content}

## Exercises / Practice
{3-5 hands-on tasks}

## Assessment / Check Your Understanding
{5 questions}

## Further Reading
{resources with URLs}
===LESSONS_END===

===RESOURCES_START===
# Resource Guide: {topic}

## Tools & Software
{tools with 1-line descriptions}

## Books & Articles
{titles with URLs if available}

## People to Follow
{experts or creators mentioned}

## Quick Reference
{key terms, commands, frameworks, or formulas from the video}
===RESOURCES_END===`;
}

// ── DALL-E image prompt ───────────────────────────────────────────────────────
export function buildImagePrompt(key_takeaways, title) {
  const firstTakeaway = (key_takeaways || '').split('\n').find(l => l.trim()) || title;
  const clean = firstTakeaway.replace(/^[→•\-\d\.]+\s*/, '').trim().slice(0, 120);
  return `Professional, minimalist blog post thumbnail. Dark gradient background transitioning from deep navy to charcoal. Clean geometric accent shapes in electric blue. The concept: "${clean}". Typographic-style design. No human faces. No text rendered in the image. Suitable for Medium header image and Pinterest pin.`;
}
