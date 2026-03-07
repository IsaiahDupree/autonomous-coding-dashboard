"""Pydantic models for the Acquisition Agent API."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class NicheConfigCreate(BaseModel):
    niche_id: str
    name: str
    platforms: list[str]
    keywords: list[str]
    icp_criteria: dict = Field(default_factory=dict)
    daily_discovery_limit: int = 50
    daily_dm_limit: int = 10
    warmup_comments_before_dm: int = 3
    warmup_interval_hours: int = 24
    enabled: bool = True


class NicheConfigResponse(NicheConfigCreate):
    id: str
    created_at: datetime
    updated_at: datetime


class ContactStageUpdate(BaseModel):
    contact_id: str
    target_stage: str
    triggered_by: str = "manual"


class DiscoveryRunRequest(BaseModel):
    niche_id: str
    platform: str
    max_results: int = 50
    dry_run: bool = False


class DiscoveryRunResponse(BaseModel):
    niche_id: str
    platform: str
    contacts_found: int
    contacts_new: int
    contacts_skipped: int
    duration_ms: int
    errors: list[str] = Field(default_factory=list)


class WarmupScheduleCreate(BaseModel):
    contact_id: str
    platform: str
    post_url: str
    comment_text: str
    scheduled_at: datetime


class OutreachRequest(BaseModel):
    contact_id: str
    platform: str
    dry_run: bool = False


class OutreachResponse(BaseModel):
    contact_id: str
    message_sent: bool
    message_text: Optional[str] = None
    variant_id: Optional[str] = None
    error: Optional[str] = None


class DailyCapStatus(BaseModel):
    platform: str
    action: str
    date: date
    current_count: int
    daily_limit: int
    remaining: int
    at_limit: bool


class FunnelSummary(BaseModel):
    stage: str
    count: int
    percentage: float


class WeeklyReportResponse(BaseModel):
    id: str
    week_start: date
    week_end: date
    funnel_summary: list[FunnelSummary]
    platform_breakdown: dict
    recommendations: list[str]
    created_at: datetime


class OrchestratorStatus(BaseModel):
    running: bool
    current_cycle: Optional[str] = None
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    active_niches: int = 0
    contacts_in_pipeline: dict = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"
    uptime_seconds: float = 0
    active_niches: int = 0
    pipeline_counts: dict = Field(default_factory=dict)
