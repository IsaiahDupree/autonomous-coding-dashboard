#!/usr/bin/env python3
"""
Expand feature lists for ACD targets under 300 features.

Usage:
    python3 scripts/expand_features.py              # dry-run, show counts
    python3 scripts/expand_features.py --apply      # write expanded feature lists
    python3 scripts/expand_features.py --target blogcanvas  # single target
"""

import json, os, sys, argparse, shutil
from datetime import datetime
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))
from expand_web_features import web_common_features
from expand_mobile_features import mobile_common_features

QUEUE_PATH = os.path.join(os.path.dirname(__file__), '..', 'harness', 'repo-queue.json')
TARGET_COUNT = 300

KNOWN_MOBILE = [
    'kawaii-coffee', 'voice-chat-pdf', 'youtube-quiz', 'ai-calculator',
    'client-portal', 'collab-ai-workos', 'couples-habits', 'ig-lead-finder',
    'learning-gigs', 'media-ai-schema', 'meta-growth-hub', 'promap-rf',
    'pulselense', 'simulive-studio', 'social-campaigns', 'sora-watermark',
    'strongface', 'unified-media', 'vlogflow', 'voice-love-notes',
    'rork-crm', 'everreach-expo', 'steadyletters-ios', 'snapmix',
    'everreach-appkit',
]

KNOWN_WEB = [
    'blogcanvas', 'portal28', 'canvascast', 'steadyletters', 'vellopad',
    'velvethold', 'ai-video-platform', 'remotion', 'waitlistlab',
    'shortslinker', 'softwarehub', 'mediaposter', 'gapradar',
    'content-factory', 'lead-forms', 'programmatic', 'cross-system',
    'softwarehub-products',
]


def detect_stack(repo_id, repo_path):
    rid = repo_id.lower()
    for m in KNOWN_MOBILE:
        if m in rid:
            return 'mobile'
    for w in KNOWN_WEB:
        if w in rid:
            return 'web'
    if repo_path and os.path.exists(os.path.join(repo_path, 'app.json')):
        return 'mobile'
    if repo_path and (os.path.exists(os.path.join(repo_path, 'next.config.js')) or
       os.path.exists(os.path.join(repo_path, 'next.config.ts')) or
       os.path.exists(os.path.join(repo_path, 'next.config.mjs'))):
        return 'web'
    return 'web'


def get_prefix(features):
    """Extract ID prefix from existing features."""
    if not features:
        return "F"
    first_id = features[0].get('id', 'F-001')
    # Extract prefix before first dash or number
    parts = first_id.split('-')
    if len(parts) >= 2:
        return parts[0]
    return "F"


def expand_target(repo, dry_run=True, target_count=300):
    name = repo.get('name', '?')
    repo_id = repo.get('id', '')
    fl_path = repo.get('featureList', '')
    repo_path = repo.get('path', '')

    if not fl_path or not os.path.exists(fl_path):
        return None, f"No feature list: {fl_path}"

    with open(fl_path) as f:
        data = json.load(f)

    features = data.get('features', [])
    current = len(features)

    if current >= target_count:
        return current, f"Already at {current} >= {target_count}"

    need = target_count - current
    stack = detect_stack(repo_id, repo_path)
    prefix = get_prefix(features)

    # Generate common features
    if stack == 'mobile':
        pool = mobile_common_features(prefix)
    else:
        pool = web_common_features(prefix)

    # Deduplicate: skip features whose name is too similar to existing
    existing_names = {f.get('name', '').lower().strip() for f in features}
    existing_descs = {f.get('description', '').lower().strip()[:60] for f in features}
    existing_ids = {f.get('id', '') for f in features}

    new_features = []
    for feat in pool:
        if feat['id'] in existing_ids:
            continue
        if feat['name'].lower().strip() in existing_names:
            continue
        if feat['description'].lower().strip()[:60] in existing_descs:
            continue
        new_features.append(feat)
        if len(new_features) >= need:
            break

    if not dry_run:
        # Backup
        backup_dir = os.path.join(os.path.dirname(__file__), '..', 'backups',
                                   datetime.now().strftime('%Y%m%d_%H%M%S'))
        os.makedirs(backup_dir, exist_ok=True)
        backup_name = f"{repo_id}_feature_list.json"
        shutil.copy2(fl_path, os.path.join(backup_dir, backup_name))

        # Write expanded
        data['features'] = features + new_features
        with open(fl_path, 'w') as f:
            json.dump(data, f, indent=2)

    final = current + len(new_features)
    return final, f"{stack} | {current} -> {final} (+{len(new_features)})"


def main():
    parser = argparse.ArgumentParser(description='Expand feature lists to ~300')
    parser.add_argument('--apply', action='store_true', help='Write changes (default: dry-run)')
    parser.add_argument('--target', type=str, help='Expand single target by ID substring')
    parser.add_argument('--min', type=int, default=TARGET_COUNT, help=f'Target count (default: {TARGET_COUNT})')
    args = parser.parse_args()

    tc = args.min

    with open(QUEUE_PATH) as f:
        queue = json.load(f)

    repos = queue.get('repos', [])
    expanded = 0
    skipped = 0

    mode = "DRY RUN" if not args.apply else "APPLYING"
    print(f"\n{'='*60}")
    print(f"  Feature List Expansion ({mode})")
    print(f"  Target: {tc} features per repo")
    print(f"{'='*60}\n")

    for repo in repos:
        repo_id = repo.get('id', '')
        name = repo.get('name', '?')

        if args.target and args.target.lower() not in repo_id.lower():
            continue

        count, msg = expand_target(repo, dry_run=not args.apply, target_count=tc)

        if count is None:
            print(f"  ⚠️  {name}: {msg}")
        elif "Already" in msg:
            skipped += 1
            print(f"  ✅ {name}: {count} features (no change needed)")
        else:
            expanded += 1
            print(f"  📈 {name}: {msg}")

    print(f"\n{'='*60}")
    print(f"  Expanded: {expanded} repos")
    print(f"  Skipped (>= {tc}): {skipped} repos")
    if not args.apply and expanded > 0:
        print(f"\n  Run with --apply to write changes")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
