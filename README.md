# Autonomous Coding Dashboard

[![Status](https://img.shields.io/badge/Status-Production-success?style=for-the-badge)](https://github.com/IsaiahDupree/autonomous-coding-dashboard)
[![Features](https://img.shields.io/badge/Features-2%2C040%2B-purple?style=for-the-badge)](#-achievements)
[![Systems](https://img.shields.io/badge/Systems-3-orange?style=for-the-badge)](#-systems)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

> **Autonomous AI-powered systems at scale** - A production-grade platform integrating autonomous software development, programmatic ad creative testing, and content factory pipelines.

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Systems](#-systems)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Technology Stack](#%EF%B8%8F-technology-stack)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

This repository contains **three integrated autonomous systems** designed to automate complex business processes using AI agents powered by Claude:

1. **Autonomous Coding Dashboard (ACD)** - Harness system for autonomous software development
2. **Programmatic Creative Testing (PCT)** - Systematic Facebook ad creative generation and testing
3. **Content Factory (CF)** - Multi-platform content production pipeline

Each system leverages AI agents to automate workflows that traditionally require significant human effort, transforming manual processes into systematic, data-driven operations.

---

## 🏆 Achievements

As of **March 2026**:

| Metric | Value |
|--------|-------|
| **Projects Completed** | 9 autonomous builds |
| **Total Features** | 2,040+ features |
| **Total Investment** | ~$390 |
| **Success Rate** | 90.8% |
| **Cost per Feature** | ~$0.19 |
| **Active Systems** | 3 production systems |

### Completed Projects (ACD)
- **MediaPoster** (538 features) - Social media management platform
- **GapRadar** (328 features) - Market analysis tool
- **CanvasCast** (175 features) - Creative collaboration
- **Remotion** (153 features) - Video generation framework
- **BlogCanvas** (136 features) - Modern blogging platform
- **EverReach App Kit** (134 features) - Mobile development kit
- **AI Video Platform** (106 features) - AI-powered video processing
- **SteadyLetters** (99 features) - Newsletter management
- **VelvetHold** (93 features) - Secure data management

[View Full Achievements](docs/ACHIEVEMENTS.md) | [Architecture](docs/ARCHITECTURE.md)

---

## 🚀 Systems

### 1️⃣ Autonomous Coding Dashboard (ACD)

**Purpose**: Monitor and control autonomous AI agents that build entire software applications from feature specifications.

**Key Features**:
- 📊 **Real-time Session Monitoring** - Live agent progress tracking
- 🎯 **Feature Management** - Track 2,000+ features across multiple projects
- 🤖 **Multi-Agent Orchestration** - Initializer & coding agents working in tandem
- 📈 **Analytics Dashboard** - Token usage, cost tracking, success rates
- 🔄 **Continuous Execution** - Sessions run until all features pass
- 🧪 **Automated Testing** - E2E tests with Playwright integration

**Access**:
- Dashboard: `index.html`
- Control Panel: `control.html`
- Queue Management: `queue.html`

[📚 View ACD Documentation →](docs/ARCHITECTURE.md)

---

### 2️⃣ Programmatic Creative Testing (PCT)

**Purpose**: Transform Facebook advertising from "creative guesswork" into a systematic, data-driven testing process.

**Core Philosophy**: Instead of randomly creating ads and hoping they work, systematically test marketing parameters (USPs, angles, frameworks, awareness levels) to discover what resonates with customers.

**Key Features**:
- 🎨 **Brand & Product Management** - Organize campaigns by brand/product hierarchy
- 💬 **Voice of Customer (VoC)** - Collect and analyze customer language
- 🎯 **USP & Marketing Angles** - Generate strategic positioning from product features
- ✍️ **Hook Generation** - AI-powered ad copy using proven frameworks
- 🖼️ **Creative Templates** - Apply hooks to visual templates at scale
- 🎬 **Video Scripts** - Generate Hook → Lid → Body → CTA video structures
- 📊 **Meta Integration** - Deploy ads to Facebook via Marketing API
- 📈 **Performance Tracking** - Sync metrics and identify winning creatives
- 🔄 **Iteration Engine** - Double down on winners, kill losers

**Frameworks**:
- **Customer Awareness Levels** (Eugene Schwartz): Unaware → Problem Aware → Solution Aware → Product Aware → Most Aware
- **Market Sophistication** (1-5): New category → Competition → Unique mechanism → Proof-based → Identification
- **Messaging Styles**: Punchy, Bold Statements, Desire Future States, Question-Based, Problem-Agitation, Social Proof

**Access**:
- Dashboard: `pct.html`
- API: `backend/src/routes/pct.ts`
- Database Models: `backend/prisma/schema.prisma` (PctBrand, PctProduct, PctHook, etc.)

[📚 View PCT Documentation →](docs/PRD-Programmatic-Creative-Testing.md)

---

### 3️⃣ Content Factory (CF)

**Purpose**: Autonomous multi-platform content production system that generates, assembles, and publishes content at scale.

**Key Features**:
- 📝 **Product Dossiers** - Comprehensive product information repository
- 🎥 **Script Generation** - Platform-specific content scripts (YouTube, TikTok, Instagram)
- 🖼️ **Image Generation** - AI-generated visual assets
- 🎬 **Video Production** - Automated video creation pipeline
- 📦 **Content Assembly** - Combine scripts, visuals, and audio
- 🚀 **Multi-Platform Publishing** - Deploy to YouTube, TikTok, Instagram, etc.
- 📊 **Performance Analytics** - Track engagement across platforms
- 🔄 **Angle Testing** - Test different marketing angles and messaging

**Workflow**:
```
Product Dossier → Script Generation → Asset Creation → Assembly → Publishing → Analytics
```

**Access**:
- API: `backend/src/routes/content-factory.ts`
- Database Models: `backend/prisma/schema.prisma` (CfProductDossier, CfScript, etc.)

[📚 View CF Documentation →](docs/CONTENT_FACTORY_README.md)

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required
- Node.js 18+ (for backend)
- PostgreSQL 14+ (for database)
- Redis 7+ (for job queues)

# Optional
- Docker & Docker Compose (for containerized deployment)
```

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/IsaiahDupree/autonomous-coding-dashboard.git
cd autonomous-coding-dashboard
```

2. **Install dependencies**:
```bash
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

3. **Set up environment variables**:
```bash
# Copy example env files
cp .env.example .env
cp backend/.env.example backend/.env

# Edit .env files with your configuration
# Required: DATABASE_URL, ANTHROPIC_API_KEY, REDIS_URL
```

4. **Initialize the database**:
```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
cd ..
```

5. **Start the services**:
```bash
# Option A: Using the init script
./init.sh

# Option B: Manual startup
npm run dev              # Start frontend dev server
cd backend && npm run dev  # Start backend API
```

6. **Access the applications**:
- **ACD Dashboard**: http://localhost:3000
- **PCT System**: http://localhost:3000/pct.html
- **Backend API**: http://localhost:4000
- **API Docs**: http://localhost:4000/api-docs (if Swagger enabled)

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    ACD      │  │     PCT     │  │      CF     │        │
│  │  Dashboard  │  │   System    │  │  Content    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend API (Express)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   Auth   │  │  Harness │  │   PCT    │  │    CF    │  │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌────────────┐  ┌────────────┐  ┌────────────┐
│ PostgreSQL │  │   Redis    │  │  External  │
│  Database  │  │ Job Queue  │  │  Services  │
│            │  │            │  │  (Meta,    │
│  - Users   │  │  - BullMQ  │  │  Claude,   │
│  - Orgs    │  │  - Workers │  │  etc.)     │
│  - Features│  │  - Crons   │  │            │
│  - Sessions│  │            │  │            │
└────────────┘  └────────────┘  └────────────┘
```

### Project Structure

```
autonomous-coding-dashboard/
├── frontend/              # React/Next.js frontend (if applicable)
├── backend/              # Express.js API server
│   ├── src/
│   │   ├── auth.ts      # Authentication & authorization
│   │   ├── index.ts     # Main server entry point
│   │   ├── routes/      # API route handlers
│   │   │   ├── content-factory.ts
│   │   │   ├── pct.ts
│   │   │   └── gdpr.ts
│   │   ├── services/    # Business logic services
│   │   │   ├── audit-logger.ts
│   │   │   ├── cache-service.ts
│   │   │   ├── session-manager.ts
│   │   │   └── image-optimizer.ts
│   │   ├── middleware/  # Express middleware
│   │   ├── db/          # Database utilities
│   │   └── utils/       # Helper functions
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # Database migrations
│   └── __tests__/       # Backend tests
├── harness/             # Agent harness system
│   ├── run-harness.js   # Main harness runner
│   ├── prompts/         # Agent system prompts
│   └── features/        # Feature specifications
├── docs/                # Documentation
│   ├── DATABASE_SCHEMA.md
│   ├── CONTENT_FACTORY_API.md
│   ├── PRD-Programmatic-Creative-Testing.md
│   └── prd/            # Product requirement docs
├── packages/            # Shared packages
│   ├── auth/           # Authentication package
│   ├── infrastructure/ # Infrastructure utilities
│   └── platform/       # Platform integrations
├── public/             # Static assets
├── scripts/            # Utility scripts
├── e2e/               # End-to-end tests
├── index.html         # ACD Dashboard
├── pct.html           # PCT Dashboard
├── control.html       # Harness Control Panel
├── queue.html         # Queue Management
└── README.md          # This file
```

---

## 🛠️ Technology Stack

### Frontend
- **HTML5/CSS3** - Semantic markup & modern styling
- **Vanilla JavaScript** - No framework dependencies for dashboards
- **Chart.js** - Data visualization
- **Inter & JetBrains Mono** - Typography
- **Responsive Design** - Mobile-first approach

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **Prisma** - Database ORM
- **PostgreSQL** - Primary database
- **Redis** - Caching & job queues
- **BullMQ** - Background job processing
- **Socket.io** - Real-time communication

### AI & Integrations
- **Anthropic Claude SDK** - AI agent capabilities
- **Meta Marketing API** - Facebook ad deployment
- **Remotion** - Video generation (future)
- **Resend/SendGrid** - Transactional emails

### DevOps & Testing
- **Docker** - Containerization
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **GitHub Actions** - CI/CD pipelines

---

## 📚 Documentation

### Core Documentation
- [**ARCHITECTURE.md**](docs/ARCHITECTURE.md) - System design and components
- [**DATABASE_SCHEMA.md**](docs/DATABASE_SCHEMA.md) - Complete database schema with ER diagrams
- [**ACHIEVEMENTS.md**](docs/ACHIEVEMENTS.md) - Project milestones and statistics

### System-Specific Docs

#### ACD (Autonomous Coding Dashboard)
- [AUTONOMOUS_SYSTEM_MASTER.md](docs/AUTONOMOUS_SYSTEM_MASTER.md) - Master system overview
- [ACTP_ARCHITECTURE.md](docs/ACTP_ARCHITECTURE.md) - Agent architecture
- [HARNESS_DB_TRACKING.md](docs/HARNESS_DB_TRACKING.md) - Database tracking

#### PCT (Programmatic Creative Testing)
- [PRD-Programmatic-Creative-Testing.md](docs/PRD-Programmatic-Creative-Testing.md) - Product requirements
- [FEATURES-Programmatic-Creative-Testing.md](docs/FEATURES-Programmatic-Creative-Testing.md) - Feature list
- [IMPLEMENTATION_DECISION_PCT.md](docs/IMPLEMENTATION_DECISION_PCT.md) - Implementation decisions

#### CF (Content Factory)
- [CONTENT_FACTORY_README.md](docs/CONTENT_FACTORY_README.md) - System overview
- [CONTENT_FACTORY_API.md](docs/CONTENT_FACTORY_API.md) - API documentation
- [CONTENT_FACTORY_DATABASE_SCHEMA.md](docs/CONTENT_FACTORY_DATABASE_SCHEMA.md) - Database schema
- [CONTENT_FACTORY_DEPLOYMENT.md](docs/CONTENT_FACTORY_DEPLOYMENT.md) - Deployment guide
- [CONTENT_FACTORY_TESTING.md](docs/CONTENT_FACTORY_TESTING.md) - Testing strategy
- [PRD-Content-Factory.md](docs/PRD-Content-Factory.md) - Product requirements

### Integration & Business
- [INTEGRATION_WAITLISTLAB_META.md](docs/INTEGRATION_WAITLISTLAB_META.md) - WaitlistLab integration
- [UNIFIED_PLATFORM_ARCHITECTURE.md](docs/UNIFIED_PLATFORM_ARCHITECTURE.md) - Platform integration
- [BUSINESS_OPERATIONS_GUIDE.md](docs/BUSINESS_OPERATIONS_GUIDE.md) - Business operations
- [SERVICE_OFFERINGS.md](docs/SERVICE_OFFERINGS.md) - Service offerings guide

### Additional Resources
- [ENVIRONMENT_SECURITY.md](docs/ENVIRONMENT_SECURITY.md) - Security best practices
- [INTEGRATION_TEST_CHECKLIST.md](docs/INTEGRATION_TEST_CHECKLIST.md) - Testing checklist
- [PRDs (Product Requirements)](docs/prd/) - 46+ PRD documents

---

## 🧪 Testing

### Run Tests

```bash
# Backend unit tests
cd backend
npm test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Testing Strategy
- **Unit Tests**: Services, utilities, database queries
- **Integration Tests**: API endpoints, authentication flows
- **E2E Tests**: Full user workflows with Playwright
- **Load Tests**: Performance and scalability validation

See [CONTENT_FACTORY_TESTING.md](docs/CONTENT_FACTORY_TESTING.md) for comprehensive testing documentation.

---

## 🚢 Deployment

### Production Deployment

```bash
# Build for production
npm run build

# Start production server
npm run start
```

### Environment Variables

Required variables (see `.env.example`):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/acd

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret

# AI Services
ANTHROPIC_API_KEY=your-anthropic-key

# Meta/Facebook (for PCT)
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret

# Email (optional)
RESEND_API_KEY=your-resend-key
```

See [CONTENT_FACTORY_DEPLOYMENT.md](docs/CONTENT_FACTORY_DEPLOYMENT.md) for detailed deployment instructions.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Workflow

1. Read relevant documentation in `docs/`
2. Follow existing code patterns
3. Write tests for new features
4. Update documentation as needed
5. Ensure all tests pass before submitting PR

---

## 🎯 Use Cases

### For Product Teams
- **Rapid Prototyping**: Build MVPs in hours, not weeks
- **Feature Development**: Autonomous implementation of feature backlogs
- **Quality Assurance**: Automated testing and verification

### For Marketing Teams
- **Ad Creative Testing**: Systematic ad testing at scale (PCT)
- **Content Production**: Multi-platform content pipelines (CF)
- **Performance Optimization**: Data-driven creative decisions

### For Developers
- **Code Generation**: AI-powered feature implementation
- **Technical Debt**: Automated refactoring and improvements
- **Documentation**: Auto-generated docs and schemas

---

## 📊 Metrics & Analytics

Track key metrics across all systems:

- **Feature Completion Rate**: % of features successfully implemented
- **Cost per Feature**: Total spend / features completed
- **Session Success Rate**: % of successful autonomous sessions
- **Token Efficiency**: Average tokens per completed feature
- **Ad Performance** (PCT): CTR, CPC, ROAS, conversion rates
- **Content Performance** (CF): Views, engagement, conversion rates

Access analytics:
- ACD: `index.html` → Analytics tab
- PCT: `pct.html` → Analytics tab
- Backend: `/api/metrics` endpoints

---

## 🔒 Security

- **Row Level Security (RLS)**: Database-level tenant isolation
- **JWT Authentication**: Secure API access
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Zod schema validation
- **GDPR Compliance**: Data export and deletion
- **Audit Logging**: Track all data mutations

See [ENVIRONMENT_SECURITY.md](docs/ENVIRONMENT_SECURITY.md) for security best practices.

---

## 📝 License

MIT License - Feel free to use and modify for your own projects.

---

## 🙏 Acknowledgments

- **Anthropic Claude** - Powering autonomous AI agents
- **Meta Marketing API** - Ad deployment infrastructure
- **Open Source Community** - Foundation libraries and tools

---

## 📞 Support

- **Documentation**: See `docs/` directory
- **Issues**: [GitHub Issues](https://github.com/IsaiahDupree/autonomous-coding-dashboard/issues)
- **Discussions**: [GitHub Discussions](https://github.com/IsaiahDupree/autonomous-coding-dashboard/discussions)

---

**Made with 🤖 by the Autonomous Coding Dashboard**

*"The future of software development, marketing, and content creation is autonomous—and it's happening now."*
