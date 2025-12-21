# Autonomous Coding Agent Dashboard

A comprehensive, real-time monitoring dashboard for the [Claude Autonomous Coding Agent](https://github.com/anthropics/claude-quickstarts/tree/main/autonomous-coding). This dashboard provides visual insights into agent sessions, feature implementation progress, usage analytics, and command execution logs.

![Dashboard Preview](https://img.shields.io/badge/Status-Live-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

## 🎯 Features

### Real-Time Monitoring
- **Live Session Tracking**: Monitor active coding sessions with real-time progress updates
- **Feature Implementation Status**: Track all 200 test cases with pass/pending indicators
- **Activity Timeline**: View recent work, commits, and command executions
- **Progress Visualization**: Interactive charts showing feature completion over time

### Analytics & Insights
- **Usage Statistics**: API token consumption, session duration, and cost tracking
- **Command Execution Logs**: Monitor all bash commands with security allowlist validation
- **Git Commit History**: Track version control activity with detailed commit information
- **Performance Metrics**: Average time per feature, success rates, and throughput analysis

### Visual Design
- **Modern Dark Theme**: Sleek glassmorphism effects with vibrant accent colors
- **Responsive Layout**: Fully responsive design that works on all devices
- **Interactive Charts**: Chart.js visualizations for data analysis
- **Smooth Animations**: Micro-interactions and transitions for enhanced UX

## 🚀 Quick Start

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (optional, for local development server)

### Installation

1. **Clone or download this repository**:
   ```bash
   cd /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard
   ```

2. **Open the dashboard**:
   
   **Option A: Direct File Access**
   ```bash
   open index.html
   ```
   
   **Option B: Local Server (Recommended)**
   ```bash
   # Using npx (no installation required)
   npx -y serve .
   
   # Or using Python
   python3 -m http.server 3000
   ```

3. **Access the dashboard**:
   - If using a server: http://localhost:3000
   - If opening directly: The file will open in your default browser

## 📊 Dashboard Components

### Key Metrics Overview
Four stat cards displaying:
- Total features completed (142/200)
- Active sessions count
- Success rate percentage
- API token usage and costs

### Progress Tracking
- **Current Session Progress Bar**: Visual indicator of feature completion
- **Feature Completion Timeline**: Line chart showing progress over time
- **Session Statistics**: Detailed metrics for the current coding session

### Activity Monitoring
- **Recent Activity Timeline**: Live feed of agent actions
- **Feature Status Table**: Sortable/filterable list of all features
- **Command Execution Log**: Real-time command monitoring with status indicators

### Usage Analytics
- **API Token Usage Chart**: Bar chart showing input/output token consumption
- **Command Execution Chart**: Doughnut chart of command frequency by type

### Session History
- **All Sessions Overview**: Cards for each session with key metrics
- **Git Commit Timeline**: Chronological view of all version control activity

## 🎨 Customization

### Modifying Mock Data
Edit `mock-data.js` to customize the displayed data:
- Change feature count (currently 200)
- Update session information
- Modify token usage statistics
- Adjust command execution logs

### Styling Changes
Edit `index.css` to customize the appearance:
- Color palette (lines 6-16)
- Spacing and layout (lines 37-43)
- Typography and fonts (lines 49-51)

### Adding Real Data
To connect to a real autonomous coding agent:

1. **Replace mock data** with API calls in `app.js`
2. **Set up a backend** to serve agent data
3. **Update data fetch functions** to pull from your API
4. **Configure WebSocket** for real-time updates (optional)

## 📁 Project Structure

```
autonomous-coding-dashboard/
├── index.html          # Main HTML structure
├── index.css           # Design system & styles
├── app.js              # Application logic & chart setup
├── mock-data.js        # Simulated agent data
└── README.md           # This file
```

## 🔒 Security Features

The dashboard displays security-related information from the autonomous coding agent:
- **Command Allowlist Monitoring**: Shows which commands are permitted
- **Blocked Command Detection**: Highlights security violations
- **Safe Mode Indicator**: Visual indicator of security status

## 🛠️ Technology Stack

- **HTML5**: Semantic markup
- **CSS3**: Custom properties, grid, flexbox, animations
- **Vanilla JavaScript**: No framework dependencies
- **Chart.js**: Data visualization library
- **Google Fonts**: Inter & JetBrains Mono

## 📈 Data Points Tracked

- Features completed vs. pending (200 total)
- Session count and duration
- API token usage (input/output)
- Command execution frequency
- Git commits and file changes
- Success/failure rates
- Time per feature metrics
- Cost analysis

## 🎯 Use Cases

1. **Development Monitoring**: Track agent progress during development
2. **Performance Analysis**: Identify bottlenecks and optimization opportunities
3. **Cost Management**: Monitor API token usage and associated costs
4. **Quality Assurance**: Verify test passage rates and feature completion
5. **Debugging**: Review command logs and error tracking

## 📝 License

MIT License - Feel free to use and modify for your own projects.

## 🙏 Acknowledgments

Built for the [Anthropic Claude Autonomous Coding Agent](https://github.com/anthropics/claude-quickstarts/tree/main/autonomous-coding) quickstart project.

---

**Made with ❤️ for autonomous coding**
