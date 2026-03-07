"""Configuration for the Autonomous Acquisition Agent."""

import os
from dataclasses import dataclass, field
from typing import Optional


SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ivhfuhxorppptyuofbgq.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

SAFARI_PORTS = {
    "instagram": {"dm": 3100, "comments": 3005},
    "twitter": {"dm": 3003, "comments": 3007},
    "tiktok": {"dm": 3102, "comments": 3006},
    "linkedin": {"dm": 3105},
    "threads": {"comments": 3004},
}

MARKET_RESEARCH_PORT = 3106

PIPELINE_STAGES = [
    "new",
    "qualified",
    "warming",
    "ready_for_dm",
    "contacted",
    "replied",
    "call_booked",
    "archived",
]

SCORING_MODEL = "claude-3-haiku-20240307"
DM_GENERATION_MODEL = "claude-3-5-sonnet-20241022"

ARCHIVE_COOLDOWN_DAYS = 180


@dataclass
class NicheConfig:
    """Targeting configuration for a single niche."""

    niche_id: str
    name: str
    platforms: list[str]
    keywords: list[str]
    icp_criteria: dict = field(default_factory=dict)
    daily_discovery_limit: int = 50
    daily_dm_limit: int = 10
    warmup_comments_before_dm: int = 3
    warmup_interval_hours: int = 24
    enabled: bool = True


@dataclass
class DailyCapConfig:
    """Per-platform daily send limits."""

    platform: str
    action: str  # "dm", "comment", "connection_request"
    daily_limit: int
    current_count: int = 0


DEFAULT_DAILY_CAPS: dict[str, dict[str, int]] = {
    "instagram": {"dm": 10, "comment": 20},
    "twitter": {"dm": 15, "comment": 30},
    "tiktok": {"dm": 8, "comment": 15},
    "linkedin": {"dm": 20, "connection_request": 25},
    "threads": {"comment": 15},
}

DEFAULT_ICP_CRITERIA = {
    "min_followers": 1000,
    "max_followers": 100000,
    "min_engagement_rate": 0.02,
    "content_topics": ["ai", "automation", "saas", "software", "startup"],
    "business_signals": ["founder", "ceo", "cto", "building", "launched"],
    "exclude_competitors": True,
}

ACTIVE_HOURS_START = int(os.getenv("ACQ_ACTIVE_HOURS_START", "8"))
ACTIVE_HOURS_END = int(os.getenv("ACQ_ACTIVE_HOURS_END", "20"))


def get_supabase_headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
