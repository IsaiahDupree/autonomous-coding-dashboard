# PRD-108: AI Thumbnail Generator

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-108-features.json
- **Priority**: P1 (HIGH — thumbnail determines 60%+ of click-through rate)

## Context

There is currently no AI thumbnail generation in the pipeline. Every video publishes without an optimized thumbnail, leaving CTR on the table. For YouTube in particular, the thumbnail IS the primary discovery mechanism — a poor thumbnail means no views regardless of content quality.

This engine:
1. Extracts candidate frames from each rendered video at key timestamps
2. Scores frames using AI (face detection, brightness, text-overlay potential)
3. Overlays AI-generated text (hook/title) using PIL/Pillow
4. Selects the best thumbnail variant per platform
5. Uploads to Supabase Storage for use in publish payloads

## Architecture

```
ThumbnailGenerator (thumbnail_generator.py)
      ├── FrameExtractor    — ffmpeg: extract N candidate frames
      ├── FrameScorer       — AI scoring: face, brightness, composition
      ├── TextOverlay       — PIL/Pillow: add hook text, gradient, branding
      └── ThumbnailSelector — select best per platform, upload to Supabase
```

## Task

### Frame Extractor
1. `FrameExtractor.extract_frames(video_path, count=10)` — ffmpeg extract 10 frames evenly distributed
2. `FrameExtractor.extract_at_timestamp(video_path, seconds)` — extract single frame at timestamp
3. `FrameExtractor.extract_key_frames(video_path)` — ffmpeg keyframe extraction for scene-boundary frames
4. `FrameExtractor.get_frame_paths(output_dir)` — return sorted list of extracted frame paths
5. `FrameExtractor.cleanup_frames(frame_paths)` — delete temp frame files after processing

### Frame Scorer
6. `FrameScorer.score_frame(frame_path)` — return FrameScore(brightness, contrast, has_face, composition, total)
7. `FrameScorer.detect_face(frame_path)` — OpenCV Haar cascade or simple heuristic, returns bool + bbox
8. `FrameScorer.compute_brightness(frame_path)` — PIL mean luminance 0-255
9. `FrameScorer.compute_contrast(frame_path)` — PIL std dev of luminance
10. `FrameScorer.compute_composition_score(frame_path)` — rule of thirds heuristic (subject off-center = higher score)
11. `FrameScorer.score_all(frame_paths)` — score all frames, return sorted list
12. `FrameScorer.get_best_frame(frame_paths)` — return path of highest-scoring frame

### Text Overlay
13. `TextOverlay.add_hook_text(frame_path, hook_text, output_path)` — PIL: large bold text, bottom-third placement
14. `TextOverlay.add_gradient_background(frame_path, output_path)` — dark gradient behind text for legibility
15. `TextOverlay.add_branding(frame_path, output_path, brand_config)` — optional logo/watermark corner placement
16. `TextOverlay.style_for_youtube(frame_path, title, output_path)` — large text, high contrast, thumbnail-optimized
17. `TextOverlay.style_for_tiktok(frame_path, hook, output_path)` — minimal text, emoji-compatible
18. `TextOverlay.style_for_instagram(frame_path, hook, output_path)` — square crop, centered text
19. `TextOverlay.generate_thumbnail_text(script, platform)` — Claude Haiku: extract best 5-8 word hook for thumbnail
20. `TextOverlay.apply_all_styles(best_frame, script, output_dir)` — produce 3 styled variants

### Thumbnail Selector
21. `ThumbnailSelector.select_for_platform(platform, styled_variants)` — choose best variant per platform
22. `ThumbnailSelector.upload_to_supabase_storage(thumbnail_path, bucket, key)` — upload, return public URL
23. `ThumbnailSelector.upload_all(variants_dict)` — upload all platform thumbnails, return URL dict
24. `ThumbnailSelector.update_payload_thumbnail(payload_id, platform, thumbnail_url)` — update actp_adapted_payloads
25. `ThumbnailSelector.get_thumbnail_url(job_id, platform)` — retrieve stored URL for a job+platform

### A/B Testing Support
26. `ThumbnailSelector.create_variant(job_id, platform, thumbnail_path, variant_label)` — store variant for A/B
27. `ThumbnailSelector.record_ctr(thumbnail_id, impressions, clicks)` — update actp_thumbnail_stats
28. `ThumbnailSelector.get_best_performing_style(platform, niche)` — query winning thumbnail style by CTR

### Pipeline Integration
29. Patch `OutputHandler` in PRD-105 — after adapt_all(), call `ThumbnailGenerator.generate(job, video_path, script)`
30. `generate(job, video_path, script)` — orchestration method: extract → score → overlay → select → upload → return URLs
31. Add `thumbnail_urls` jsonb column to `actp_gen_jobs`

### Supabase Tables
32. Migration `actp_thumbnail_stats` — id, job_id, platform, thumbnail_url, impressions, clicks, ctr, created_at
33. `get_thumbnail_ctr_by_platform(platform, days=30)` — avg CTR per platform

### Health Server Routes
34. `GET /api/thumbnails/stats` — avg CTR by platform, best-performing styles
35. `POST /api/thumbnails/generate/:job_id` — manually trigger thumbnail generation

### Tests
36. `test_extract_frames_returns_10_files()` — mock video, verify 10 frames extracted
37. `test_frame_scorer_prefers_bright_frames()` — dark vs bright frame, verify bright scored higher
38. `test_text_overlay_produces_output_file()` — verify output file exists and > 50KB
39. `test_generate_orchestration()` — mock all sub-steps, verify URL dict returned
40. `test_upload_to_supabase_storage()` — mock Supabase client, verify correct bucket/key

## Key Files
- `thumbnail_generator.py` (new)
- `renderer_volume_engine.py` `OutputHandler` (integrate thumbnail generation step)
- `health_server.py` (add /api/thumbnails routes)

## Environment Variables Required
- `THUMBNAIL_BUCKET` — Supabase Storage bucket name (default: `thumbnails`)
- `BRAND_LOGO_PATH` — optional path to logo PNG for watermark

## Testing
```bash
python3 thumbnail_generator.py --video /path/to/render.mp4 --script "Are you making this mistake?"
python3 -m pytest tests/test_thumbnail_generator.py -v
```
