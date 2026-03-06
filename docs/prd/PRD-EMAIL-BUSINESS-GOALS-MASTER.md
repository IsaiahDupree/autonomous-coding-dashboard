# PRD-EMAIL: Email Strategy Master Plan
**Status:** Planning | **Created:** 2026-03-05 | **Author:** Isaiah Dupree  
**Provider:** Resend API (`RESEND_API_KEY`) | **Engine:** `actp-worker/email_sequence_agent.py`  
**Builds on:** PRD-027, PRD-037, PRD-045

---

## Business Goals → Email Role

| Goal | Target | Email Lever |
|------|--------|-------------|
| `monthly_revenue` | $5,000/mo | Cold sequences → close |
| `everreach_mrr` | $2,000/mo | Trial → paid onboarding |
| `client_portal_mrr` | $1,500/mo | B2B demo → close |
| `upwork_revenue` | $1,000/mo | Warm leads before proposal |
| `services_revenue` | $500/mo | Consulting nurture → call booking |
| Audience (TikTok/IG/YT/Twitter) | 1M each | Newsletter → share/follow loop |
| `avg_views_per_video` | 100K | Pre-publish email drives first-hour algo velocity |
| `ai_cost_ceiling` | <$400/mo | Email converts 3–10× better per $ than DM |

---

## 10 Email Use Cases

### 1. Cold Acquisition Outreach
**Trigger:** Prospect scored ≥ 50 in `actp_prospect_scores` (CBS browser session)

```
Prospect scraped → CRM contact created
  → Email discovery: LinkedIn → website → pattern guess → SMTP verify
  → Channel gate: not in active DM sequence
  → Enroll cold_3touch
  → Claude personalizes subject + body from actp_research_briefs
  → Resend sends 9–11 AM recipient timezone (Tue–Thu)
  → Reply → pause, route to human with context
  → No open 3 days → skip step
  → Sequence complete, no reply → 90-day re_engage cooldown
```

Sequences: `cold_3touch` (3 emails, D0/4/8) · `cold_warm_bridge` (5 emails, D0/2/5/9/14) · `decision_close` (2 emails, D0/5)

---

### 2. Trial → Paid Conversion (EverReach / ClientPortal)
**Trigger:** Trial signup webhook → Supabase → auto-enroll

```
Signup → welcome_onboarding
  D0: Welcome + single action CTA
  D2: Pain identification
  D4: Value share
  D7: Case study
  D10: Soft CTA (reply yes/no)
  D14: Upgrade offer
  D21: Final offer or breakup
  → Upgrade → switch to customer_success
  → Billing fail → dunning (3 emails, D0/2/4)
```

Sequences: `welcome_onboarding` (7) · `trial_expiry_warning` (3) · `customer_success` (4) · `dunning` (3) · `churn_save` (2)

---

### 3. Upwork Proposal Warming
**Trigger:** Job scored ≥ 7.0 via `UpworkExecutor`

```
Job score ≥ 7.0
  → Returning client? → 1 value-proof email before proposal
  → Submit proposal via UpworkExecutor
  → Client email visible? → enroll upwork_follow_up (D3/7)
```

Sequences: `upwork_returning_client` (1) · `upwork_follow_up` (2)

---

### 4. Consulting / Services Nurture
**Trigger:** CRM score ≥ 80 OR DM signals buying intent

```
→ consulting_consideration
  D0: How I typically work
  D3: Case study in their niche
  D7: FAQ / objection handling
  D12: "15-min call?" + Calendly
  → Call booked → exit
  → No reply D20 → decision_breakup
  → Post-call → post_call_follow_up
```

Sequences: `consulting_consideration` (4) · `decision_breakup` (1) · `post_call_follow_up` (2)

---

### 5. LinkedIn B2B Pipeline
**Trigger:** Connection accepted OR no DM reply after 5 days  
**Source:** 344 LinkedIn contacts in CRM

```
Connection accepted → wait 2 days → DM 1 (value, no pitch)
  → DM replied → continue DM track
  → DM no reply 5 days + email known → switch to linkedin_b2b_email
    D0: Continuing from LinkedIn — value resource
    D3: Industry insight for their role
    D7: Case study in their vertical
    D14: Quick question about their challenge
    D21: "15-min call?"
```

Sequences: `linkedin_b2b_email` (5, D0/3/7/14/21) · `linkedin_event_follow_up` (3, D0/3/7)

---

### 6. Newsletter / Owned Audience
**Trigger:** DM exchange ≥ 2 replies OR bio link opt-in

```
"I put out a weekly breakdown — want in?"
  → Opt-in → newsletter_welcome (immediate)
  → Weekly cron Monday 7AM:
      Top 3 posts (past 7 days by engagement)
      + 1 market research insight (port 3106)
      + 1 soft offer mention
  → New video published → new_video_alert within 60 min
     (first-hour clicks → views → algo boost)
  → Inactive 60 days → list_reactivation → no open → unsubscribe
```

Sequences: `newsletter_welcome` (1) · `newsletter_weekly` (recurring Monday) · `new_video_alert` (per publish) · `list_reactivation` (2)

---

### 7. Content Amplification + A/B Subject Testing
**Trigger:** MPLite publish complete → `actp_organic_posts` row

```
Post published → content_alerts segment
  → 2 subject line variants via Claude Haiku
  → 50/50 A/B split via Resend
  → After 4hr: winner identified by open rate
  → Store pattern in actp_strategy_configs
  → Feed CTR into universal_feedback_engine.py
```

Sequence: `content_alert_ab` (1 per publish)

---

### 8. Gmail Inbound Lead Response
**Trigger:** `gmail_client.py` poll detects intent_score ≥ 50

```
Gmail poll every 30min
  → intent_score ≥ 50
  → Match/create CRM contact (source="email_inbound")
  → Claude generates reply → queue for approval
  → Telegram: "High-intent email from {name} — approve?"
  → Human approves → send
  → Enroll post_inquiry_reply (D1/3/7)
```

Sequence: `post_inquiry_reply` (3)

---

### 9. Retention / Re-Engagement
**Trigger:** Inactive >14 days, billing event, new feature ship

```
Inactive >14 days → re_engagement
  D0: "Haven't seen you — here's what's new"
  D5: "Quick win in 10 minutes"
  D10: "Should I stop emailing you?"
  → No reply → tag churned, suppress

Feature ships → feature_announcement (D0/3)
```

Sequences: `re_engagement` (3) · `feature_announcement` (2)

---

### 10. Operational Reporting
**Trigger:** Morning briefing cron (8 AM daily) + Monday 6 AM weekly

**Daily briefing adds:**
- Email queue: X due today, Y enrolled
- Revenue gap: current MRR vs $5K target
- CRM: new prospects, replies, conversions
- Best subject line (past 7 days open rate)

**Weekly digest adds:**
- Open/click/reply rates per sequence
- Email-attributed conversions (calls booked, purchases)
- List growth: net opt-ins/unsubscribes
- Recommended copy adjustments

---

## All 23 Sequences

| Sequence | Type | Emails | Schedule |
|----------|------|--------|----------|
| `cold_3touch` | cold | 3 | D 0/4/8 |
| `cold_warm_bridge` | warm | 5 | D 0/2/5/9/14 |
| `decision_close` | close | 2 | D 0/5 |
| `welcome_onboarding` | lifecycle | 7 | D 0–21 |
| `trial_expiry_warning` | lifecycle | 3 | D −3/−2/−1 |
| `customer_success` | lifecycle | 4 | D 0/3/7/14 |
| `dunning` | billing | 3 | D 0/2/4 |
| `churn_save` | re-engage | 2 | D 0/5 |
| `upwork_returning_client` | outreach | 1 | D 0 |
| `upwork_follow_up` | outreach | 2 | D 3/7 |
| `consulting_consideration` | nurture | 4 | D 0/3/7/12 |
| `decision_breakup` | close | 1 | D 20 |
| `post_call_follow_up` | close | 2 | D 1/3 |
| `linkedin_b2b_email` | outreach | 5 | D 0/3/7/14/21 |
| `linkedin_event_follow_up` | event | 3 | D 0/3/7 |
| `newsletter_welcome` | list | 1 | Immediate |
| `newsletter_weekly` | list | 1 | Every Monday |
| `new_video_alert` | content | 1 | Per publish |
| `list_reactivation` | re-engage | 2 | D 0/5 |
| `content_alert_ab` | content | 1 | Per publish |
| `post_inquiry_reply` | inbound | 3 | D 1/3/7 |
| `re_engagement` | retention | 3 | D 0/5/10 |
| `feature_announcement` | retention | 2 | D 0/3 |

---

## Channel Coordination Rules

Email and DM **never** run simultaneously on the same contact.

```
DM active          → block email enrollment
DM no reply 5d     → unlock email track
Email reply        → pause email, open DM track
Unsubscribe        → block all email forever (actp_email_suppressions)
CAN-SPAM           → unsubscribe link every email, honor within 10 days
```

| Stage | Email Cooldown | DM Cooldown |
|-------|----------------|-------------|
| Awareness | 14 days | 14 days |
| Consideration | 7 days | 7 days |
| Decision | 2 days | 2 days |
| Customer | Scheduled | — |

---

## Implementation Phases

**Phase 1 — Activate (1 day)**
1. Add `RESEND_API_KEY`, `FROM_EMAIL`, `FROM_NAME` to `.env`
2. `python email_sequence_agent.py --sequences` → verify templates
3. Enroll 3 test contacts in `cold_3touch`
4. `python email_sequence_agent.py --send-due` → confirm delivery

**Phase 2 — Lifecycle (1 week)**
1. Trial signup webhook → auto-enroll `welcome_onboarding`
2. `actp_revcat_events` → trigger `dunning` on billing fail
3. Wire `browser_session_daemon.py` → auto-enroll new prospects

**Phase 3 — Audience / Content (2 weeks)**
1. Newsletter opt-in trigger in DM reply handler
2. MPLite publish → `new_video_alert` + A/B subjects
3. Weekly newsletter cron from top `actp_organic_posts`

**Phase 4 — Intelligence (3–4 weeks)**
1. Gmail inbound scoring → approval queue → Telegram alert
2. A/B winners → `actp_strategy_configs` subject line patterns
3. Weekly email digest in morning briefing
4. Open/click events → update `prospect_score` in CRM

---

## Env Vars Needed

```bash
RESEND_API_KEY=re_...              # resend.com → API Keys (3K emails/mo free)
FROM_EMAIL=isaiah@yourdomain.com   # Verified domain in Resend
FROM_NAME=Isaiah
REPORT_TO_EMAIL=isaiah@...
REPORT_FROM_EMAIL=reports@...
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Open rate | ≥ 40% |
| Click rate | ≥ 5% |
| Reply rate | ≥ 3% |
| Trial → paid | ≥ 20% |
| Cold → call booked | ≥ 2% |
| List growth/week | ≥ 20 opt-ins |
| Email-attributed revenue | ≥ $1,000/mo |
