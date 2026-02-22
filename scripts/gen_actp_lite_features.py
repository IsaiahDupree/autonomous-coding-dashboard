#!/usr/bin/env python3
"""Generate 250+ feature lists for each ACTP Lite system."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from actp_lite_feature_defs import get_all_services
from actp_lite_extra_features import get_extras

def make_feature(fid, desc):
    return {"id": fid, "description": desc, "passes": False}

def generate_feature_list(service_id, service_info, features):
    # Add extra features to push over 250
    extras = get_extras(service_id)
    all_features = features + extras
    
    path = service_info["path"]
    os.makedirs(path, exist_ok=True)
    data = {
        "project": service_info["name"],
        "description": service_info["desc"],
        "stack": service_info["stack"],
        "features": [make_feature(f[0], f[1]) for f in all_features]
    }
    out = os.path.join(path, "feature_list.json")
    with open(out, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  {service_info['name']}: {len(all_features)} features -> {out}")
    return len(all_features)

def main():
    services = get_all_services()
    print(f"Generating feature lists for {len(services)} ACTP Lite systems:\n")
    total = 0
    for sid, (info, features) in services.items():
        total += generate_feature_list(sid, info, features)
    print(f"\nTotal: {total} features across {len(services)} systems")

if __name__ == "__main__":
    main()
