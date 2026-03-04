#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["openai"]
# ///
"""
research_youtube_channel.py — YouTube Channel Research Skill (Layer 1: Raw Capability)

Subcommands:
  list         List latest N videos from a channel
  transcribe   Download transcript(s) for video(s)
  analyze      Analyze transcripts in an output dir → per-video docs
  synthesize   Cross-video synthesis + ACTP integration roadmap
  full         list → transcribe → analyze → synthesize (end-to-end)
  integrate    Generate a PRD/integration plan from existing synthesis
  watch        Check for new videos since last run, research only new ones

Examples:
  python3 scripts/research_youtube_channel.py full --channel @indydevdan --limit 12
  python3 scripts/research_youtube_channel.py list --channel @indydevdan --limit 20 --json
  python3 scripts/research_youtube_channel.py transcribe --video VIDEO_ID --output /tmp/transcripts
  python3 scripts/research_youtube_channel.py analyze --input docs/research/indydevdan
  python3 scripts/research_youtube_channel.py synthesize --input docs/research/indydevdan
  python3 scripts/research_youtube_channel.py integrate --input docs/research/indydevdan --target actp
  python3 scripts/research_youtube_channel.py watch --channel @indydevdan --state-file .research-state.json
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent
OPENAI_MODEL = "gpt-4o"

# Our system context injected into every analysis + synthesis prompt
OUR_STACK_CONTEXT = """
Our system context (ACTP ecosystem):
- **actp-worker** (`/Users/isaiahdupree/Documents/Software/actp-worker/`): Python daemon, 31 services, 184 topics, workflow executors, crons, dual-agent system
- **Safari Automation** (`/Users/isaiahdupree/Documents/Software/Safari Automation/`): Browser control across IG/TikTok/Twitter/LinkedIn/Threads — DMs, comments, market research
- **Workflow Engine** (Vercel): DAG-based step orchestration backed by Supabase — `actp_workflow_definitions`, `actp_workflow_tasks`, `claim_workflow_task`
- **Lite services** (all Next.js/Vercel): ContentLite, PublishLite, ResearchLite, GenLite, MetricsLite, AdLite, CRMLite
- **Dual-agent**: OpenAI gpt-4o-mini (interface/commander) + Claude (execution/operator) via `dual_agent.py`
- **Blotato**: Multi-platform publish (TikTok/YouTube/Instagram/Facebook/Twitter/Threads) via `blotato_client.py`
- **Universal Feedback Engine**: Closed-loop per platform×niche — register → check-back → classify → analyze → re-generate
- **MediaPoster** (`localhost:5555`): Smart scheduling + background publisher with GDrive → Blotato → Platform pipeline
- **Supabase** (project: `ivhfuhxorppptyuofbgq`): Shared DB for all services
""".strip()

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _run(cmd: list[str], cwd: str | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)


def _load_env():
    """Load OPENAI_API_KEY from actp-worker .env if not already in environment."""
    if os.environ.get("OPENAI_API_KEY"):
        return
    for candidate in [
        REPO_ROOT.parent / "actp-worker" / ".env",
        Path.home() / ".env",
    ]:
        if candidate.exists():
            for line in candidate.read_text().splitlines():
                if line.startswith("OPENAI_API_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    os.environ["OPENAI_API_KEY"] = key
                    return


def get_openai_client():
    _load_env()
    try:
        from openai import OpenAI
    except ImportError:
        print("ERROR: openai not installed. Run: pip3 install openai")
        sys.exit(1)
    if not os.environ.get("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY not set.")
        sys.exit(1)
    return OpenAI()


def sanitize_filename(s: str) -> str:
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s]+", "-", s.strip())
    return s[:80].lower()


def normalize_channel_url(channel: str) -> str:
    if not channel.startswith("http"):
        handle = channel.lstrip("@")
        return f"https://www.youtube.com/@{handle}"
    return channel


def fmt_date(d: str) -> str:
    if d and len(d) == 8:
        return f"{d[:4]}-{d[4:6]}-{d[6:]}"
    return d or ""


def _clean_vtt(vtt: str) -> str:
    """Strip VTT timing metadata, deduplicate repeated lines."""
    lines, seen = [], set()
    for line in vtt.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith(("WEBVTT", "NOTE", "Kind:", "Language:")):
            continue
        if re.match(r"^\d{2}:\d{2}:\d{2}", line) or "-->" in line:
            continue
        if re.match(r"^\d+$", line):
            continue
        line = re.sub(r"<[^>]+>", "", line).strip()
        if not line or line in seen:
            continue
        seen.add(line)
        lines.append(line)
    return " ".join(lines)


# ---------------------------------------------------------------------------
# Layer 1 primitives — each can be called independently
# ---------------------------------------------------------------------------

def cmd_list(channel: str, limit: int, as_json: bool = False) -> list[dict]:
    """
    LIST — Pull latest N video IDs + metadata from a channel.
    Returns list of video dicts. Prints table or JSON.
    """
    url = normalize_channel_url(channel)
    result = _run([
        "yt-dlp", "--flat-playlist",
        "--playlist-end", str(limit),
        "--print", "%(id)s\t%(title)s\t%(upload_date)s\t%(duration)s\t%(view_count)s\t%(description)s",
        "--no-warnings",
        f"{url}/videos",
    ])
    if result.returncode != 0:
        print(f"yt-dlp error:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)

    videos = []
    for line in result.stdout.strip().splitlines():
        parts = line.split("\t", 5)
        if len(parts) < 2:
            continue
        videos.append({
            "id": parts[0],
            "title": parts[1] if len(parts) > 1 else "Unknown",
            "upload_date": parts[2] if len(parts) > 2 else "",
            "duration": parts[3] if len(parts) > 3 else "",
            "views": parts[4] if len(parts) > 4 else "",
            "description": (parts[5] if len(parts) > 5 else "")[:500],
            "url": f"https://www.youtube.com/watch?v={parts[0]}",
        })

    if as_json:
        print(json.dumps(videos, indent=2))
    else:
        print(f"\nFound {len(videos)} videos from {url}:")
        for i, v in enumerate(videos, 1):
            print(f"  {i:2}. [{fmt_date(v['upload_date'])}] {v['views']:>7} views — {v['title'][:65]}")
    return videos


def cmd_transcribe(video_id: str, output_dir: Path) -> str | None:
    """
    TRANSCRIBE — Download auto-generated captions for a single video ID.
    Writes <video_id>.txt to output_dir. Returns cleaned text or None.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    out_file = output_dir / f"{video_id}.txt"

    if out_file.exists():
        print(f"  [cache] Transcript exists: {out_file}")
        return out_file.read_text()

    url = f"https://www.youtube.com/watch?v={video_id}"
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        for sub_type in ["--write-auto-subs", "--write-subs"]:
            _run([
                "yt-dlp", sub_type, "--skip-download",
                "--sub-format", "vtt", "--sub-langs", "en",
                "--output", str(tmp_path / f"{video_id}.%(ext)s"),
                "--no-warnings", url,
            ], cwd=tmp)
            vtt_files = list(tmp_path.glob(f"{video_id}*.vtt"))
            if vtt_files:
                cleaned = _clean_vtt(vtt_files[0].read_text(encoding="utf-8", errors="ignore"))
                if len(cleaned) > 100:
                    out_file.write_text(cleaned)
                    print(f"  ✓ Transcript saved: {out_file.name} ({len(cleaned):,} chars)")
                    return cleaned

    print(f"  ✗ No transcript for {video_id}")
    return None


def cmd_analyze(input_dir: Path, video: dict, transcript: str | None, client, index: int) -> Path:
    """
    ANALYZE — GPT-4o analysis of a single video → writes numbered .md doc.
    Returns path to written doc.
    """
    PROMPT = f"""You are an expert software engineering researcher studying a YouTube channel.

Channel persona (@IndyDevDan): Expert in agentic AI systems, Claude Code, solo-dev practices,
multi-agent orchestration, Claude Playwright CLI skills, production safety, prompt engineering.

VIDEO METADATA:
Title: {{title}}
URL: {{url}}
Upload Date: {{upload_date}}
Views: {{views}}
Description: {{description}}

TRANSCRIPT:
{{transcript}}

---
{OUR_STACK_CONTEXT}
---

Produce a comprehensive research document with EXACTLY these sections (use ## headings):

## Summary
2-3 sentence overview.

## Core Concepts & Ideas
Bullet list of main technical concepts/philosophies discussed.

## Key Software Practices
Concrete, actionable engineering/workflow practices demonstrated. Be specific.

## Architecture & Design Patterns
System design choices, patterns, data models, structural decisions.

## Tools & Technologies
Every tool/library/API/service mentioned — note exactly how each is used.

## Actionable Takeaways
Numbered list: 5-7 things a developer can immediately apply from this video.

## Integration Opportunities for Our Stack
Map practices to OUR specific files/services listed above. Be concrete — name actual file paths, function names, service names where applicable.

## Quotable Moments
2-3 direct quotes or key paraphrased statements worth saving.

## Tags
Comma-separated topic tags.
"""

    title = video["title"]
    transcript_text = (transcript or "[No transcript — analysis from title/description only]")[:60000]

    filled = PROMPT.format(
        title=title,
        url=video["url"],
        upload_date=fmt_date(video.get("upload_date", "")),
        views=video.get("views", "N/A"),
        description=video.get("description", "")[:400],
        transcript=transcript_text,
    )

    print(f"  [analyze] {title[:65]}...")
    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[{"role": "user", "content": filled}],
        temperature=0.3,
        max_tokens=3000,
    )
    analysis = resp.choices[0].message.content

    slug = sanitize_filename(title)
    doc_path = input_dir / f"{index:02d}-{slug}.md"
    doc_path.write_text(
        f"# {title}\n\n"
        f"**URL**: {video['url']}\n"
        f"**Uploaded**: {fmt_date(video.get('upload_date', ''))}\n"
        f"**Views**: {video.get('views', 'N/A')}\n"
        f"**Duration**: {video.get('duration', 'N/A')}s\n"
        f"**Research Date**: {datetime.now().strftime('%Y-%m-%d')}\n\n"
        f"---\n\n{analysis}\n\n---\n\n"
        f"## Raw Transcript Excerpt\n\n```\n"
        f"{(transcript or '[No transcript available]')[:3000]}"
        f"{'...' if transcript and len(transcript) > 3000 else ''}\n```\n",
        encoding="utf-8",
    )
    print(f"  ✓ Written: {doc_path.name}")
    return doc_path


def cmd_synthesize(input_dir: Path, videos: list[dict], analyses_text: list[str], client) -> Path:
    """
    SYNTHESIZE — Cross-video synthesis + ACTP integration roadmap.
    Reads all analysis docs in input_dir, produces 00-SYNTHESIS doc.
    """
    PROMPT = f"""You are a senior software architect integrating lessons from a top AI engineering educator into a production system.

{OUR_STACK_CONTEXT}

---

Below are {'{n}'} video analyses from @IndyDevDan:

{{analyses}}

---

Produce a synthesis with EXACTLY these sections (## headings):

## Executive Summary
The 3-5 most important things to learn from Dan's body of work.

## Cross-Video Patterns
Recurring themes, philosophies, and design choices across videos.

## Top 10 Actionable Practice Integrations
Each entry: **Practice name** (from video N) — concrete implementation step in OUR stack naming exact files/services.

## Architecture Improvements
Specific structural changes to our system design based on Dan's patterns.

## New Features to Build
Capabilities Dan demonstrates that we don't have — prioritized by impact.

## Developer Workflow Changes
How we should change our day-to-day dev process (not just code).

## Prompt Engineering Insights
How Dan structures prompts, SKILL.md files, agents, and sub-agents — what we should adopt.

## 30-Day Implementation Roadmap
- **Week 1** (quick wins, <1 day each): List items
- **Week 2** (medium, 1-3 days each): List items
- **Week 3-4** (architectural, 3-7 days each): List items

## Key Philosophy
The most memorable ideas to carry forward — maxims to live by.
"""

    combined = ""
    for i, (v, a) in enumerate(zip(videos, analyses_text), 1):
        combined += f"\n\n### Video {i}: {v['title']}\n\n{a[:1800]}\n"
        if len(combined) > 85000:
            combined += "\n[... remaining analyses truncated ...]"
            break

    filled = PROMPT.replace("{n}", str(len(videos))).replace("{analyses}", combined)

    print(f"\n  [synthesize] Generating cross-video synthesis ({len(videos)} videos)...")
    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[{"role": "user", "content": filled}],
        temperature=0.3,
        max_tokens=5000,
    )
    synthesis = resp.choices[0].message.content

    video_list = "\n".join(f"- [{v['title']}]({v['url']})" for v in videos)
    doc_path = input_dir / "00-SYNTHESIS-AND-INTEGRATION.md"
    doc_path.write_text(
        f"# Research Synthesis & Integration Guide\n\n"
        f"**Generated**: {datetime.now().strftime('%Y-%m-%d')}\n"
        f"**Videos Analyzed**: {len(videos)}\n\n"
        f"## Videos Covered\n\n{video_list}\n\n---\n\n{synthesis}\n\n"
        f"---\n\n*Generated by research_youtube_channel.py — autonomous-coding-dashboard*\n",
        encoding="utf-8",
    )
    print(f"  ✓ Synthesis written: {doc_path.name}")
    return doc_path


def cmd_integrate(input_dir: Path, target: str, client) -> Path:
    """
    INTEGRATE — Read synthesis doc → generate a concrete PRD/integration plan
    for a specific target system (e.g. 'actp', 'actp-worker', 'workflow-engine').
    """
    synthesis_path = input_dir / "00-SYNTHESIS-AND-INTEGRATION.md"
    if not synthesis_path.exists():
        print(f"ERROR: No synthesis doc found at {synthesis_path}. Run `synthesize` first.")
        sys.exit(1)

    synthesis = synthesis_path.read_text()

    PROMPT = f"""You are a senior engineer writing a concrete implementation PRD.

Target system to upgrade: **{target}**

{OUR_STACK_CONTEXT}

---

Research synthesis:
{{synthesis}}

---

Write a concrete PRD titled "PRD: {target} Upgrade from IndyDevDan Research" with:

## Problem Statement
What specific gaps does this target system have relative to Dan's best practices?

## Proposed Changes
For each change:
- **Change name**: description
- **File(s) affected**: exact paths
- **Before**: current behavior/code pattern (pseudocode ok)
- **After**: desired behavior/code pattern
- **Effort**: XS/S/M/L

## New Files to Create
List any new files with: path, purpose, key contents

## Migration Steps
Ordered list of implementation steps

## Success Criteria
How will we verify this is working?

## Priority Order
Rank the changes: P0 (do this week) → P1 (do this month) → P2 (backlog)
"""

    print(f"\n  [integrate] Generating {target} integration PRD...")
    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[{"role": "user", "content": PROMPT.replace("{synthesis}", synthesis[:60000])}],
        temperature=0.3,
        max_tokens=4000,
    )

    prd_slug = sanitize_filename(target)
    doc_path = input_dir / f"PRD-integrate-{prd_slug}.md"
    doc_path.write_text(resp.choices[0].message.content, encoding="utf-8")
    print(f"  ✓ Integration PRD written: {doc_path.name}")
    return doc_path


def cmd_watch(channel: str, state_file: Path, limit: int, output_dir: Path, client):
    """
    WATCH — Compare latest N videos against last-run state.
    Research only NEW videos not seen before. Update state file.
    """
    state = {}
    if state_file.exists():
        state = json.loads(state_file.read_text())

    seen_ids = set(state.get("seen_ids", []))
    videos = cmd_list(channel, limit, as_json=False)
    new_videos = [v for v in videos if v["id"] not in seen_ids]

    if not new_videos:
        print(f"\n  ✓ No new videos since last watch ({len(seen_ids)} already researched).")
        return

    print(f"\n  Found {len(new_videos)} new video(s) to research:")
    for v in new_videos:
        print(f"    - {v['title'][:65]}")

    output_dir.mkdir(parents=True, exist_ok=True)
    start_index = len(seen_ids) + 1
    all_analyses, doc_paths = [], []

    with tempfile.TemporaryDirectory() as tmp:
        for i, video in enumerate(new_videos, start_index):
            transcript = cmd_transcribe(video["id"], Path(tmp))
            doc_path = cmd_analyze(output_dir, video, transcript, client, i)
            doc_paths.append(doc_path)
            all_analyses.append(doc_path.read_text())

    all_videos = videos  # use latest list for synthesis context
    all_analyses_text = [p.read_text() for p in doc_paths]
    cmd_synthesize(output_dir, all_videos[:len(doc_paths)], all_analyses_text, client)

    state["seen_ids"] = list(seen_ids | {v["id"] for v in new_videos})
    state["last_run"] = datetime.now().isoformat()
    state["channel"] = channel
    state_file.write_text(json.dumps(state, indent=2))
    print(f"  ✓ State updated: {state_file}")


def _write_index(videos: list[dict], doc_paths: list[Path], output_dir: Path):
    rows = "\n".join(
        f"| {i} | [{v['title'][:60]}]({v['url']}) | {fmt_date(v.get('upload_date',''))} | [{p.name}]({p.name}) |"
        for i, (v, p) in enumerate(zip(videos, doc_paths), 1)
    )
    (output_dir / "README.md").write_text(
        f"# YouTube Channel Research\n\n"
        f"**Generated**: {datetime.now().strftime('%Y-%m-%d')}  \n"
        f"**Videos**: {len(videos)}\n\n"
        f"| # | Title | Date | Doc |\n|---|-------|------|-----|\n{rows}\n\n"
        f"## Synthesis\n\nSee [00-SYNTHESIS-AND-INTEGRATION.md](00-SYNTHESIS-AND-INTEGRATION.md).\n"
    )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="YouTube Channel Research Skill",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    # --- list ---
    p_list = sub.add_parser("list", help="List latest N videos from a channel")
    p_list.add_argument("--channel", required=True)
    p_list.add_argument("--limit", type=int, default=12)
    p_list.add_argument("--json", action="store_true", dest="as_json")

    # --- transcribe ---
    p_tx = sub.add_parser("transcribe", help="Download transcript for a video")
    p_tx.add_argument("--video", required=True, help="YouTube video ID")
    p_tx.add_argument("--output", default="/tmp/yt-transcripts")

    # --- analyze ---
    p_an = sub.add_parser("analyze", help="Analyze existing transcripts in output dir")
    p_an.add_argument("--input", required=True, help="Directory containing transcripts + video metadata JSON")
    p_an.add_argument("--channel", default=None, help="Channel to re-fetch metadata (optional if metadata.json exists)")
    p_an.add_argument("--limit", type=int, default=12)

    # --- synthesize ---
    p_syn = sub.add_parser("synthesize", help="Generate cross-video synthesis from existing docs")
    p_syn.add_argument("--input", required=True, help="Directory containing per-video .md docs")
    p_syn.add_argument("--channel", default=None)
    p_syn.add_argument("--limit", type=int, default=12)

    # --- full ---
    p_full = sub.add_parser("full", help="End-to-end: list → transcribe → analyze → synthesize")
    p_full.add_argument("--channel", required=True)
    p_full.add_argument("--limit", type=int, default=12)
    p_full.add_argument("--output", default=None, help="Output dir (default: docs/research/<channel-slug>)")
    p_full.add_argument("--skip-transcripts", action="store_true")

    # --- integrate ---
    p_int = sub.add_parser("integrate", help="Generate integration PRD for a target system")
    p_int.add_argument("--input", required=True, help="Directory containing synthesis doc")
    p_int.add_argument("--target", default="actp-worker", help="Target system (e.g. actp-worker, workflow-engine, dual-agent)")

    # --- watch ---
    p_watch = sub.add_parser("watch", help="Research only new videos since last run")
    p_watch.add_argument("--channel", required=True)
    p_watch.add_argument("--limit", type=int, default=20)
    p_watch.add_argument("--output", default=None)
    p_watch.add_argument("--state-file", default=None, help="JSON state file (default: <output>/.watch-state.json)")

    args = parser.parse_args()

    if args.cmd == "list":
        cmd_list(args.channel, args.limit, args.as_json)

    elif args.cmd == "transcribe":
        cmd_transcribe(args.video, Path(args.output))

    elif args.cmd in ("analyze", "synthesize"):
        input_dir = Path(args.input)
        client = get_openai_client()
        # Load metadata if available
        meta_file = input_dir / "metadata.json"
        if meta_file.exists():
            videos = json.loads(meta_file.read_text())
        elif args.channel:
            videos = cmd_list(args.channel, args.limit)
            meta_file.write_text(json.dumps(videos, indent=2))
        else:
            print("ERROR: --channel or existing metadata.json required.")
            sys.exit(1)

        if args.cmd == "analyze":
            input_dir.mkdir(parents=True, exist_ok=True)
            tx_dir = input_dir / "transcripts"
            doc_paths, analyses = [], []
            with tempfile.TemporaryDirectory() as tmp:
                for i, video in enumerate(videos, 1):
                    transcript = cmd_transcribe(video["id"], tx_dir)
                    dp = cmd_analyze(input_dir, video, transcript, client, i)
                    doc_paths.append(dp)
                    analyses.append(dp.read_text())
            _write_index(videos, doc_paths, input_dir)
            print(f"\n✅ Analyzed {len(doc_paths)} videos → {input_dir}")

        else:  # synthesize
            docs = sorted(input_dir.glob("[0-9][0-9]-*.md"))
            if not docs:
                print("ERROR: No numbered .md docs found. Run `analyze` first.")
                sys.exit(1)
            analyses_text = [d.read_text() for d in docs]
            cmd_synthesize(input_dir, videos[:len(docs)], analyses_text, client)

    elif args.cmd == "full":
        channel_slug = re.sub(r"[^\w]", "-", args.channel.lstrip("@").lower())
        output_dir = Path(args.output) if args.output else REPO_ROOT / "docs" / "research" / channel_slug
        output_dir.mkdir(parents=True, exist_ok=True)
        client = get_openai_client()

        print(f"\n{'='*60}\n  YouTube Research: {args.channel}\n  Output: {output_dir}\n{'='*60}")

        videos = cmd_list(args.channel, args.limit)
        (output_dir / "metadata.json").write_text(json.dumps(videos, indent=2))

        doc_paths, analyses_text = [], []
        tx_dir = output_dir / "transcripts"
        for i, video in enumerate(videos, 1):
            print(f"\n--- Video {i}/{len(videos)}: {video['title'][:65]} ---")
            transcript = None if args.skip_transcripts else cmd_transcribe(video["id"], tx_dir)
            dp = cmd_analyze(output_dir, video, transcript, client, i)
            doc_paths.append(dp)
            analyses_text.append(dp.read_text())

        synthesis_path = cmd_synthesize(output_dir, videos, analyses_text, client)
        _write_index(videos, doc_paths, output_dir)

        print(f"\n{'='*60}\n✅ Research complete! {len(doc_paths)} docs + synthesis\n👉 {synthesis_path}\n{'='*60}")

    elif args.cmd == "integrate":
        client = get_openai_client()
        cmd_integrate(Path(args.input), args.target, client)

    elif args.cmd == "watch":
        channel_slug = re.sub(r"[^\w]", "-", args.channel.lstrip("@").lower())
        output_dir = Path(args.output) if args.output else REPO_ROOT / "docs" / "research" / channel_slug
        state_file = Path(args.state_file) if args.state_file else output_dir / ".watch-state.json"
        client = get_openai_client()
        cmd_watch(args.channel, state_file, args.limit, output_dir, client)


if __name__ == "__main__":
    main()
