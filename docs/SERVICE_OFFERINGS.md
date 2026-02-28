# Service Offerings — Isaiah Dupree
### Creative Copywriter × Software Engineer × AI Systems Builder

> Everything below is backed by working software already built and running locally. These aren't ideas — they're live systems that can be deployed for a client in days.

---

## Software Inventory (What's Already Built)

### Automation Layer
| Tool | What It Does | Status |
|---|---|---|
| Safari Automation (25 packages) | Browser automation: DMs, comments, research, LinkedIn, Upwork across 9 platforms | ✅ Live |
| crm_brain.py | AI pipeline: sync inboxes → score contacts → generate messages → send | ✅ Live |
| li_prospect.py | LinkedIn search → ICP score → connect → message pipeline | ✅ Live |
| safari_cloud_controller.py | Enqueue cloud commands → local Safari executes | ✅ Live |

### Content & Publishing Stack
| Tool | What It Does | Status |
|---|---|---|
| ContentLite | Claude-powered content engine: tweets, scripts, blogs, newsletters, ad copy | ✅ Deployed |
| ResearchLite | Market research ingestion + blueprint extraction | ✅ Deployed |
| PublishLite | Platform-adapted scheduling (TikTok, IG, YT, Twitter, Threads) | ✅ Deployed |
| MediaPoster Lite | Multi-platform publish queue with Safari upload + Blotato | ✅ Live |
| Workflow Engine | DAG orchestration: research → generate → review → publish | ✅ Deployed on Vercel |
| actp-worker | Local daemon: Remotion render, Safari upload, Blotato publish | ✅ Live |
| AdLite | Ad creative testing, deployments, graduation, performance tracking | ✅ Deployed |

### SaaS Products (Built, Some Revenue-Ready)
| Product | What It Is | Status |
|---|---|---|
| BlogCanvas | AI blog content pipeline: research → outline → draft → SEO + client portal | ✅ Built |
| KindLetters (SteadyLetters) | AI physical letter sending via Thanks.io. Voice → handwritten letter | ✅ Built |
| CRMLite | Full CRM: contacts, conversations, campaigns, RevenueCat integration | ✅ Built |
| HookLite | Webhook receiver + event dashboard for ad/payment events | ✅ Deployed |
| 21 Rork Mobile Apps | Expo Router apps: CRM, IG lead finder, simulive studio, vlogflow, etc. | 🔧 In progress |

### Research & Intelligence
| Tool | What It Does |
|---|---|
| Market Research API (port 3106) | Scrape top 100 creators + 1000 posts per niche across TW/IG/TT/Threads/FB |
| Feedback Loop Engine | Post → track 1hr/4hr/24hr → classify viral/flop → refine strategy → repeat |
| Twitter Research Pipeline | 5K tweets, 10 content frameworks, living playbook per niche |
| LinkedIn Prospecting | ICP scoring, search → qualify → connect → message automation |

---

## Service Offerings

---

### 🔥 Service 1 — Done-For-You Social Media Outreach System

**Who it's for:** Coaches, consultants, SaaS founders, agency owners who want leads from Instagram, Twitter, TikTok, or LinkedIn without hiring a full team.

**What you deliver:**
- Set up the full Safari Automation + CRM stack on their machine (or manage it yourself)
- Build their ICP in `crm_contacts` with platform handles across all 4 platforms
- Run weekly market research to find active buyers in their niche
- Daily DM outreach (5-20 per platform per day, rate-limited and verified)
- Inbox sync so every reply hits their CRM within 24 hours
- Weekly report: contacts reached, replies received, pipeline stage breakdown

**Tools used:** Safari Automation (3001/3003/3102/3105), crm_brain.py, crm_market_research, crm_contacts

**Pricing:**
- Setup: **$1,500** (install + configure + seed 100 target contacts)
- Monthly retainer: **$800–1,500/month** (managed outreach + weekly reports)
- DIY license: **$297/month** (access to scripts + documentation + 1 onboarding call)

---

### 🔥 Service 2 — LinkedIn Lead Generation (B2B)

**Who it's for:** B2B founders, agency owners, recruiters who want a consistent pipeline of qualified LinkedIn leads without cold email or paid ads.

**What you deliver:**
- Build ICP criteria in `prospect_config.yaml` (title, company size, keywords, seniority)
- Run `li_prospect.py --pipeline` to search + score + connect daily
- AI-personalized connection notes (Claude-generated from profile data)
- Follow-up message sequences triggered by acceptance
- Weekly Supabase report: prospects found, qualified, connected, replied

**Tools used:** li_prospect.py, LinkedIn Automation (port 3105), linkedin_prospects table, crm_brain.py

**Pricing:**
- Setup: **$1,000**
- Monthly retainer: **$600–1,200/month** (managed pipeline)
- Results: typically 50–150 qualified connections/month, 10–30% reply rate

---

### 🔥 Service 3 — AI Content Engine (Write, Generate, Publish)

**Who it's for:** Creators, brands, and businesses who need consistent high-quality content across Twitter, LinkedIn, Instagram, TikTok — without writing everything themselves.

**What you deliver:**
- Set up ContentLite + niche research pipeline for their industry
- Weekly research sweep: scrape top 100 posts in their niche, extract content frameworks
- Generate 5–30 pieces of content per week (tweets, threads, IG captions, TikTok scripts)
- AI review gate (rubric-based scoring: hook, CTA, authenticity, platform fit)
- Auto-publish via MediaPoster Lite or schedule via PublishLite
- Monthly performance report + strategy refresh

**Tools used:** ContentLite, ResearchLite, Market Research API, MediaPoster Lite, actp-worker, Feedback Loop Engine

**Pricing:**
- Setup: **$1,500**
- Monthly retainer: **$1,000–2,500/month** (full management)
- Content-only tier: **$500/month** (generate + deliver drafts, client publishes)

---

### 🔥 Service 4 — AI Blog & SEO Content Pipeline (BlogCanvas)

**Who it's for:** Businesses, SaaS companies, agencies that need SEO blog content at scale without a full content team.

**What you deliver:**
- White-label deployment of BlogCanvas for their brand
- Multi-agent pipeline: keyword research → outline → draft → SEO optimization → publish to WordPress/CMS
- AI-powered topic research using Google Search Console data
- Email digest of new posts for their audience
- Analytics dashboard: views, conversions, goal tracking

**Tools used:** BlogCanvas (full Next.js app with 200+ API routes), Google Search Console integration, WordPress/CMS connections

**Pricing:**
- Setup + customization: **$2,000–4,000**
- Monthly management: **$800–1,500/month**
- SaaS access (self-managed): **$97–297/month**

---

### 🔥 Service 5 — Physical Letter / Direct Mail Campaign (KindLetters)

**Who it's for:** High-ticket coaches, real estate agents, luxury brands, financial advisors — anyone whose clients respond better to physical mail than digital.

**What you deliver:**
- Set up KindLetters (SteadyLetters) with their brand voice
- AI generates personalized letter copy from CRM data (name, context, offer)
- Voice-to-letter: record a voice note → transcribed → converted to handwritten-style letter via Thanks.io
- Segmented campaigns: send different letters to different pipeline stages
- Tracking: delivery confirmation, reply rate logging

**Tools used:** KindLetters (full SaaS), Thanks.io API, AI generation, voice transcription

**Pricing:**
- Per-letter cost: Thanks.io pass-through (~$2–4/letter) + **$0.50–1.00 service fee**
- Campaign setup: **$500–1,500**
- Monthly management: **$300–800/month**
- High-ticket niche: easily justifies $5–10K/campaign for 100–500 letters

---

### 🔥 Service 6 — Copywriting (Your Core Skill + AI Leverage)

**Who it's for:** Any business that needs words that convert — landing pages, email sequences, ad copy, VSL scripts, cold outreach, nurture sequences.

**What you deliver as a copywriter with AI leverage:**
- Research the market using your Market Research API (real data: what's working right now in their niche)
- Draft copy using ContentLite with your voice and frameworks loaded
- Multiple variants for A/B testing (ContentLite generates variants, AdLite tracks performance)
- Feedback loop: AdLite + HookLite track which copy converts, iterate

**Deliverables + pricing:**
| Deliverable | Price |
|---|---|
| Landing page (full) | **$800–2,500** |
| Email sequence (5-7 emails) | **$500–1,500** |
| Ad copy package (5 ads × 3 variants) | **$400–1,200** |
| VSL / sales video script | **$1,000–3,000** |
| Cold outreach sequence (3-touch) | **$400–800** |
| Monthly retainer (ongoing copy) | **$1,500–3,500/month** |

---

### 🔥 Service 7 — Custom Mobile App Development (Rork Apps)

**Who it's for:** Founders who need an MVP mobile app fast. You have 21 battle-tested Expo Router app templates covering CRM, social media tools, video tools, learning platforms, and more.

**What you deliver:**
- Start from the closest Rork template (already ~300 features scoped)
- Customize branding, features, backend (Supabase), payments (Superwall/Stripe)
- Ship iOS + Android via Expo
- Hand off with full codebase + deployment guide

**Relevant templates already built:**
- `rork-crm-superwall` — Mobile CRM with paywalls
- `rork-ig-research---lead-finder` — Instagram lead research app
- `rork-social-media-campaign-manager` — Campaign manager
- `rork-simulive---multistream-studio` — Live streaming tool
- `rork-vlogflow--plan---film` — Video planning app
- `rork-voice-chat-pdf` — Voice + PDF AI chat
- `rork-client-portal-system` — Client portal

**Pricing:**
- Simple customization of existing template: **$2,500–5,000**
- Full custom app from template base: **$5,000–15,000**
- Ongoing maintenance + features: **$500–1,500/month**

---

### 🔥 Service 8 — Autonomous Coding / AI Development Pipeline Setup

**Who it's for:** Dev teams, agencies, or technical founders who want to 10x their development velocity using AI agent harnesses.

**What you deliver:**
- Set up the ACD (Autonomous Coding Dashboard) for their project
- Configure harness prompts per feature/PRD
- Set up the parallel agent queue (multi-agent simultaneous feature development)
- Claude/Windsurf integration with auto-commit and status tracking
- Train their team on the workflow

**Tools used:** autonomous-coding-dashboard, harness system, actp-worker

**Pricing:**
- Setup + training: **$2,500–5,000**
- Ongoing consulting: **$200–500/hour**

---

## Revenue Model Comparison

| Service | Type | Entry Price | Monthly Potential | Effort |
|---|---|---|---|---|
| Social Media Outreach | Managed | $1,500 setup | $800–1,500/mo | Medium |
| LinkedIn Lead Gen | Managed | $1,000 setup | $600–1,200/mo | Low (automated) |
| AI Content Engine | Managed | $1,500 setup | $1,000–2,500/mo | Medium |
| BlogCanvas | SaaS/Managed | $97–4,000 | $97–1,500/mo | Low–Medium |
| KindLetters | Per-campaign | $500 setup | $300–800/mo | Low |
| Copywriting | Freelance | $400/project | $1,500–3,500/mo | High |
| Mobile App Dev | Project | $2,500/project | $500–1,500/mo (maint) | High |
| AI Dev Pipeline | Consulting | $2,500 setup | $200–500/hr | Medium |

---

## Fastest Path to $5K/Month

Pick **2 services** to start, close 3–5 clients total:

1. **LinkedIn Lead Gen** ($600–1,200/month × 3 clients = $1,800–3,600/month)
   - Fully automated after setup. Most scalable.
   - Use your own LinkedIn to demo results first.

2. **Copywriting + AI Content Engine** ($1,500–2,500/month × 1–2 clients = $1,500–5,000/month)
   - Your copywriting skill is the differentiator. The AI stack is your unfair advantage.
   - Deliver faster and better than any agency because you own the research + generation pipeline.

**Total: $3,300–8,600/month with 4–5 clients.**

---

## How to Get First Clients

Your existing `crm_contacts` already has **520 contacts** (IG:63, TikTok:107, Twitter:6, LinkedIn:344).

```bash
# Score them, generate outreach, send
python3 scripts/crm_brain.py --pipeline

# LinkedIn: search for agency owners and coaches
python3 scripts/li_prospect.py --search --query "agency owner social media" --limit 20
python3 scripts/li_prospect.py --connect --limit 5
```

Use your own tools to get your own clients. That's the cleanest proof of concept for every service above.

---

## Positioning Statement

> "I build AI systems that grow businesses — I write the copy that converts them, and I build the software that scales it."

**Primary offer (combine skills):** "I'll set up a done-for-you AI outreach and content system for your business, write the copy that goes into it, and make sure it actually converts."

This is impossible for a copywriter without tech skills and impossible for a developer without copy skills. You're the only one who can offer it end-to-end.
