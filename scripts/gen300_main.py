#!/usr/bin/env python3
"""Main script: combine common + app-specific features, write ~300 feature_list.json per app."""
import json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from gen300_common import COMMON
from gen300_apps import APPS, gen_entity_features

BASE = '/Users/isaiahdupree/Documents/Software'

def build_feature_json(common_features, app_features):
    """Convert tuples to JSON-ready feature list."""
    features = []
    for fid, cat, pri, desc, crit in common_features:
        features.append({
            "id": fid,
            "category": cat,
            "priority": pri,
            "description": desc,
            "status": "pending",
            "acceptance_criteria": crit
        })
    for fid, cat, pri, desc, crit in app_features:
        features.append({
            "id": fid,
            "category": cat,
            "priority": pri,
            "description": desc,
            "status": "pending",
            "acceptance_criteria": crit
        })
    return {"version": "2.0", "features": features}

total_features = 0
total_apps = 0

for dirname, app_def in APPS.items():
    prefix, name, slug, entities, domain_extras = app_def
    
    # Generate app-specific features
    app_features = gen_entity_features(prefix, entities, domain_extras)
    
    # Combine
    data = build_feature_json(COMMON, app_features)
    count = len(data["features"])
    total_features += count
    
    # Write
    out_path = os.path.join(BASE, dirname, 'feature_list.json')
    if not os.path.isdir(os.path.join(BASE, dirname)):
        print(f"  SKIP {dirname}: directory not found")
        continue
    
    with open(out_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    total_apps += 1
    print(f"  OK {dirname}: {count} features")

print(f"\nGenerated for {total_apps} apps, {total_features} total features")
print(f"Average: {total_features // max(total_apps, 1)} features per app")
