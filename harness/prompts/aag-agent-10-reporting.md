# AAG Agent 10 — Pipeline Analytics & Reporting Agent

## Mission
Build the reporting agent that generates weekly pipeline performance reports, tracks A/B message variant performance, calculates conversion rates at every stage, delivers reports via email + push notification + Obsidian, and auto-applies data-backed recommendations to improve the pipeline.

## Features to Build
AAG-093 through AAG-110, AAG-119, AAG-150, AAG-176

## Depends On
All other agents (data must exist in crm_contacts, acq_funnel_events, crm_messages, acq_outreach_sequences, acq_email_sequences)

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation/scripts/acquisition/`

## Output Files
- `acquisition/reporting_agent.py`
- `acquisition/reporting/stats_collector.py`
- `acquisition/reporting/insight_generator.py`
- `acquisition/reporting/formatter.py`
- `acquisition/api/routes/reports.py`
- `tests/test_reporting_agent.py`

## PipelineStatsCollector
```python
@dataclass
class WeeklyStats:
    week_start: date
    week_end: date
    # Funnel counts
    discovered: int
    qualified: int
    warmup_sent: int
    dms_sent: int
    emails_sent: int
    replies_received: int
    calls_booked: int
    closed_won: int
    # Stage snapshot
    pipeline_snapshot: dict  # {stage: count}
    # Rates
    qualify_rate: float
    reply_rate: float
    email_reply_rate: float
    close_rate: float
    # Best performers
    top_platform: str
    top_niche: str
    # Comparison
    prev_qualify_rate: float
    prev_reply_rate: float
    # Channel breakdown
    dm_stats: dict
    email_stats: dict
    # Variants
    variant_stats: list[dict]

async def collect_weekly_stats(week_start: date) -> WeeklyStats:
    week_end = week_start + timedelta(days=7)
    
    # Count events this week
    discovered = await queries.count_funnel_events(
        from_stage='new', since=week_start, until=week_end)
    qualified = await queries.count_funnel_events(
        to_stage='qualified', since=week_start, until=week_end)
    
    # DMs/emails sent this week
    dms_sent = await queries.count_crm_messages(
        message_type='dm', is_outbound=True, since=week_start, until=week_end)
    emails_sent = await queries.count_crm_messages(
        message_type='email', is_outbound=True, since=week_start, until=week_end)
    
    # Replies: inbound messages where there's a prior outbound
    replies_received = await queries.count_replies_this_week(week_start, week_end)
    
    # Stage snapshot (current)
    pipeline_snapshot = await queries.get_pipeline_snapshot()
    
    # Conversion rates
    qualify_rate = qualified / discovered if discovered > 0 else 0
    reply_rate = replies_received / (dms_sent + emails_sent) if (dms_sent + emails_sent) > 0 else 0
    
    # Best platform: group crm_messages by platform, calculate reply rate per platform
    top_platform = await queries.get_top_platform_by_reply_rate(week_start, week_end)
    
    # Best niche
    top_niche = await queries.get_top_niche_by_reply_rate(week_start, week_end)
    
    # Variant stats
    variant_stats = await queries.get_variant_performance()
    
    return WeeklyStats(...)
```

## ConversionCalculator
```python
async def get_conversion_rates(since: datetime = None) -> dict:
    """Calculate stage-to-stage conversion rates with optional date filter."""
    since = since or datetime.utcnow() - timedelta(days=30)
    
    totals = {}
    for stage in ALL_STAGES:
        totals[stage] = await queries.count_contacts_that_reached_stage(stage, since)
    
    return {
        "new_to_qualified": safe_divide(totals.get('qualified', 0), totals.get('new', 1)),
        "qualified_to_contacted": safe_divide(totals.get('contacted', 0), totals.get('qualified', 1)),
        "contacted_to_replied": safe_divide(totals.get('replied', 0), totals.get('contacted', 1)),
        "replied_to_closed": safe_divide(totals.get('closed_won', 0), totals.get('replied', 1)),
        "overall_funnel": safe_divide(totals.get('closed_won', 0), totals.get('new', 1)),
    }
```

## VariantTracker
```python
async def update_variant_performance():
    """Group messages by variant_id, calculate reply rates, flag winner."""
    variants = await queries.get_active_variants()
    
    for variant in variants:
        sends = await queries.count_variant_sends(variant.id)
        replies = await queries.count_variant_replies(variant.id)
        reply_rate = replies / sends if sends > 0 else 0
        
        await queries.update_variant_stats(variant.id, sends=sends, replies=replies,
                                           reply_rate=reply_rate)
    
    # Flag winner when one variant has 2x reply rate with >= 10 samples
    variants = await queries.get_active_variants()  # re-fetch updated
    best = max(variants, key=lambda v: v.reply_rate)
    for v in variants:
        if v.id != best.id and best.sends >= 10 and v.sends >= 5:
            if best.reply_rate >= v.reply_rate * 2:
                await queries.mark_variant_winner(best.id)
                await queries.deactivate_variant(v.id)
```

## InsightGenerator — Claude
```python
async def generate_insights(stats: WeeklyStats) -> list[Insight]:
    prompt = f"""You are analyzing acquisition pipeline performance data to generate actionable insights.

This week's data:
- Discovered: {stats.discovered} prospects
- Qualify rate: {stats.qualify_rate:.1%} (prev: {stats.prev_qualify_rate:.1%})
- Reply rate: {stats.reply_rate:.1%} (prev: {stats.prev_reply_rate:.1%})
- Top platform by reply rate: {stats.top_platform}
- Top niche: {stats.top_niche}
- Email open rate: {stats.email_stats.get('open_rate', 'N/A')}
- Best message variant: {stats.variant_stats[0]['name'] if stats.variant_stats else 'N/A'} ({stats.variant_stats[0].get('reply_rate', 0):.1%} reply rate)
- Pipeline: {json.dumps(stats.pipeline_snapshot)}

Generate 3-5 specific, actionable insights. Each must have:
1. An observation based directly on the data
2. Evidence (cite specific numbers)
3. A concrete recommended action

Format as JSON array:
[{{"observation": "...", "evidence": "...", "recommended_action": "...", "confidence": 0-100}}]

Be specific — "Twitter has 29% reply rate vs 14% Instagram" not "Twitter performs better."
Only recommend actions supported by the data."""

    response = await claude.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )
    return [Insight(**i) for i in json.loads(response.content[0].text)]
```

## ReportFormatter
```python
def format_markdown(stats: WeeklyStats, insights: list[Insight]) -> str:
    return f"""# Acquisition Pipeline — Week of {stats.week_start.strftime('%b %d')}–{stats.week_end.strftime('%b %d, %Y')}

## Funnel This Week
| Metric | This Week | vs Last Week |
|--------|-----------|--------------|
| Discovered | {stats.discovered} | {delta_str(stats.discovered, stats.prev_discovered)} |
| Qualified | {stats.qualified} ({stats.qualify_rate:.0%}) | {delta_str(stats.qualify_rate, stats.prev_qualify_rate, pct=True)} |
| DMs Sent | {stats.dms_sent} | — |
| Emails Sent | {stats.emails_sent} | — |
| Replies | {stats.replies_received} ({stats.reply_rate:.0%} reply rate) | {delta_str(stats.reply_rate, stats.prev_reply_rate, pct=True)} |
| Calls Booked | {stats.calls_booked} | — |
| Closed Won | {stats.closed_won} | — |

## Pipeline Snapshot
{' | '.join([f"**{k}**: {v}" for k, v in stats.pipeline_snapshot.items()])}

## Best Performing
- **Platform**: {stats.top_platform}
- **Niche**: {stats.top_niche}
- **Message Variant**: {stats.variant_stats[0]['name'] if stats.variant_stats else 'N/A'}

## Insights & Recommended Actions
{chr(10).join([f"{i+1}. **{ins.observation}**{chr(10)}   Evidence: {ins.evidence}{chr(10)}   → Action: {ins.recommended_action}" for i, ins in enumerate(insights)])}
"""
```

## Report Delivery
```python
async def deliver_report(report_md: str, stats: WeeklyStats):
    # 1. Email via Mail.app (AppleScript)
    await send_report_email(stats.week_start, report_md)
    
    # 2. Apple push notification summary
    summary = f"{stats.replies_received} replies, {stats.calls_booked} calls. Top: {stats.top_platform}"
    script = f'''display notification "{summary}" with title "Weekly Acquisition Report" sound name "default"'''
    subprocess.run(["osascript", "-e", script])
    
    # 3. Obsidian vault daily note
    vault_path = os.path.expanduser("~/.memory/vault")
    report_path = f"{vault_path}/DAILY-NOTES/{stats.week_start.isoformat()}-acquisition-report.md"
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, 'w') as f:
        f.write(report_md)
    
    # 4. Store in acq_weekly_reports
    await queries.insert_weekly_report(stats, report_md, delivered_at=datetime.utcnow())
```

## Auto-Apply Insights (AAG-102)
```python
async def auto_apply_insights(insights: list[Insight], dry_run: bool = True):
    applied = []
    for insight in insights:
        action = insight.recommended_action.lower()
        
        # Raise ICP min_score
        if 'raise' in action and 'score' in action and insight.confidence >= 80:
            # Parse new threshold from action text
            match = re.search(r'(\d+)', action)
            if match:
                new_threshold = int(match.group(1))
                if 60 <= new_threshold <= 85:  # sanity bounds
                    if not dry_run:
                        await queries.update_all_niche_min_scores(new_threshold)
                    applied.append(f"Raised ICP min_score to {new_threshold}")
        
        # Mark best variant as default
        if 'variant' in action and insight.confidence >= 75:
            if not dry_run:
                await queries.promote_winning_variant()
            applied.append("Promoted winning message variant to default")
    
    return applied
```

## API Routes
```python
@router.get("/latest")
async def latest_report():
    return await queries.get_latest_weekly_report()

@router.post("/generate")
async def generate_report(week_start: str, deliver: bool = False, dry_run: bool = False):
    ws = date.fromisoformat(week_start)
    stats = await collector.collect_weekly_stats(ws)
    insights = await insight_generator.generate_insights(stats)
    report_md = formatter.format_markdown(stats, insights)
    if deliver and not dry_run:
        await deliver_report(report_md, stats)
    return {"report": report_md, "insights": [i.dict() for i in insights]}

@router.get("/analytics/conversion")
async def conversion_rates(days: int = 30):
    return await calculator.get_conversion_rates(since=datetime.utcnow() - timedelta(days=days))

@router.get("/analytics/variants")
async def variant_performance():
    return await queries.get_variant_performance()

@router.post("/analytics/apply-insights")
async def apply_insights(dry_run: bool = True):
    latest = await queries.get_latest_weekly_report()
    applied = await auto_apply_insights(latest.insights, dry_run=dry_run)
    return {"applied_changes": applied}
```

## CLI
```bash
python3 acquisition/reporting_agent.py --generate             # print report to terminal
python3 acquisition/reporting_agent.py --deliver              # email + push + obsidian
python3 acquisition/reporting_agent.py --week 2026-02-24      # specific week
python3 acquisition/reporting_agent.py --dry-run              # no saves
python3 acquisition/reporting_agent.py --apply-insights       # auto-apply recommendations
```

## Tests Required
```python
test_stats_collector_counts_funnel_events_correctly()
test_conversion_calculator_safe_divide_zero()
test_variant_tracker_identifies_winner_at_2x()
test_variant_tracker_requires_10_sample_minimum()
test_insight_generator_returns_valid_json_array()
test_formatter_produces_valid_markdown()
test_auto_apply_raises_score_within_bounds()
test_report_stored_in_acq_weekly_reports()
test_obsidian_file_written_to_correct_path()
```
