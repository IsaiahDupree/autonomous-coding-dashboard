# PRD-107: Cross-Platform Video Adaptation Engine

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-107-features.json
- **Priority**: P1 (HIGH — one render must become 5 platform-ready posts)

## Context

Currently a rendered video from Remotion is a single file. To hit 2–3 posts/day per platform across 5 platforms (TikTok, Instagram Reels, YouTube Shorts, Twitter/X, Threads), each render must be auto-adapted:
- Aspect ratio: 9:16 vertical for TikTok/IG/YT Shorts, 1:1 for Twitter, 16:9 for YouTube
- Caption length: TikTok 4000, IG 2200, YT 5000, Twitter 280, Threads 500
- Hashtag strategy: 30 for IG, 5-8 for TikTok, none for Threads
- Thumbnail: per-platform optimal frame extraction
- Audio: normalize levels, add captions/subtitles if supported

This engine takes one rendered video + one piece of generated content and produces 5 fully platform-adapted publish payloads.

## Architecture

```
CrossPlatformAdapter (cross_platform_adapter.py)
      ├── VideoTranscoder      — ffmpeg: resize, crop, aspect ratio
      ├── CaptionAdapter       — truncate, hashtag, platform rules
      ├── MetadataBuilder      — title, tags, category per platform
      └── AdaptedPayloadBuilder — assemble complete publish payload × 5
```

## Task

### Video Transcoder (uses ffmpeg subprocess)
1. `VideoTranscoder.to_vertical_916(input_path, output_path)` — crop/scale to 1080×1920 (TikTok/IG/YTShorts)
2. `VideoTranscoder.to_square_11(input_path, output_path)` — crop/scale to 1080×1080 (Twitter)
3. `VideoTranscoder.to_horizontal_169(input_path, output_path)` — scale to 1920×1080 (YouTube)
4. `VideoTranscoder.normalize_audio(input_path, output_path, target_lufs=-14)` — loudnorm filter
5. `VideoTranscoder.add_subtitles(input_path, srt_path, output_path)` — burn subtitles via ffmpeg
6. `VideoTranscoder.generate_srt(transcript_text, duration_seconds)` — simple evenly-spaced SRT
7. `VideoTranscoder.transcode_all(input_path, output_dir)` — produce all 3 aspect ratio variants, return dict
8. `VideoTranscoder.get_video_duration(input_path)` — ffprobe to get duration in seconds
9. `VideoTranscoder.validate_output(output_path, min_size_bytes=100000)` — verify file exists and > 100KB

### Caption Adapter
10. `CaptionAdapter.adapt_for_tiktok(raw_caption, hashtags)` — max 4000 chars, 5-8 hashtags, emojis allowed
11. `CaptionAdapter.adapt_for_instagram(raw_caption, hashtags)` — max 2200 chars, up to 30 hashtags
12. `CaptionAdapter.adapt_for_youtube(raw_caption, hashtags)` — max 5000 chars, keyword-rich description
13. `CaptionAdapter.adapt_for_twitter(raw_caption)` — max 280 chars, no hashtag spam, punchy
14. `CaptionAdapter.adapt_for_threads(raw_caption)` — max 500 chars, conversational, no hashtags
15. `CaptionAdapter.truncate_smart(text, max_chars)` — truncate at sentence boundary, add ellipsis
16. `CaptionAdapter.generate_hashtags(niche, platform, count)` — call Claude Haiku for niche-relevant hashtags
17. `CaptionAdapter.adapt_all(raw_caption, niche)` — return dict with all 5 platform captions

### Metadata Builder
18. `MetadataBuilder.build_tiktok(script, niche)` — sound_name, cover_timestamp, duet_allowed
19. `MetadataBuilder.build_instagram(script, niche)` — location, collab_tag, alt_text
20. `MetadataBuilder.build_youtube(script, niche)` — title <=100 chars, description, tags list, category_id, made_for_kids=False
21. `MetadataBuilder.build_twitter(script)` — reply_settings, sensitive_flag
22. `MetadataBuilder.build_threads(script)` — reply_control
23. `MetadataBuilder.generate_title(script, platform, max_chars=100)` — Claude Haiku title generation

### Adapted Payload Builder
24. `AdaptedPayloadBuilder.build_tiktok_payload(job, video_916, caption, metadata)` — complete TikTok publish dict
25. `AdaptedPayloadBuilder.build_instagram_payload(job, video_916, caption, metadata)` — complete IG Reels dict
26. `AdaptedPayloadBuilder.build_youtube_payload(job, video_916, caption, metadata)` — complete YT Shorts dict
27. `AdaptedPayloadBuilder.build_twitter_payload(job, video_11, caption, metadata)` — complete Twitter dict
28. `AdaptedPayloadBuilder.build_threads_payload(job, video_11, caption, metadata)` — complete Threads dict
29. `AdaptedPayloadBuilder.adapt_all(job, raw_video_path, raw_caption, niche)` — full pipeline, return 5 payloads
30. `AdaptedPayloadBuilder.enqueue_all(payloads)` — push all 5 to MPLite queue

### Pipeline Integration
31. Patch `OutputHandler.notify_content_agent()` in PRD-105 — call `AdaptedPayloadBuilder.adapt_all()` after render
32. Add `adaptation_status` column to `actp_gen_jobs` — pending/processing/complete per platform
33. `get_adaptation_coverage(job_id)` — return dict: platform → payload_ready bool

### Supabase Tables
34. Migration `actp_adapted_payloads` — job_id FK, platform, video_path, caption, metadata jsonb, enqueued_at
35. `get_payloads_for_job(job_id)` — return all 5 platform payloads
36. `mark_payload_published(payload_id, post_url)` — update with live post URL

### Health Server Routes
37. `GET /api/adaptation/status` — jobs adapted today, platforms covered
38. `POST /api/adaptation/run/:job_id` — manually trigger adaptation for a specific job

### Tests
39. `test_transcode_vertical_output_dimensions()` — verify output is 1080×1920
40. `test_caption_tiktok_max_chars()` — verify tiktok caption <= 4000 chars
41. `test_caption_twitter_max_chars()` — verify twitter caption <= 280 chars
42. `test_adapt_all_returns_5_payloads()` — verify dict has tiktok/ig/youtube/twitter/threads keys
43. `test_enqueue_all_calls_mplite()` — mock MPLite, verify 5 enqueue calls

## Key Files
- `cross_platform_adapter.py` (new)
- `renderer_volume_engine.py` (import OutputHandler, call adapt_all after render)
- `health_server.py` (add /api/adaptation routes)

## Environment Variables Required
- `FFMPEG_PATH` — path to ffmpeg binary (default: `ffmpeg` in PATH)
- `FFPROBE_PATH` — path to ffprobe binary (default: `ffprobe` in PATH)

## Testing
```bash
python3 cross_platform_adapter.py --adapt /path/to/video.mp4 --niche solopreneur
python3 -m pytest tests/test_cross_platform_adapter.py -v
```
