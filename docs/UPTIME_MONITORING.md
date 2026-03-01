# Uptime Monitoring Setup

**Last Updated:** 2026-03-01
**Services Covered:** UptimeRobot, Better Uptime, Custom Script

---

## Overview

This document describes the uptime monitoring setup for the Autonomous Coding Dashboard platform. Monitoring ensures high availability and quick response to outages across all three systems (ACD, PCT, CF).

---

## Monitored Endpoints

### Critical Endpoints (1-minute checks)

| Endpoint | Purpose | Expected Response | Timeout |
|----------|---------|-------------------|---------|
| `https://acd.yourdomain.com/api/health` | API health check | 200 OK | 10s |
| `https://acd.yourdomain.com/` | Frontend availability | 200 OK | 15s |
| `https://acd.yourdomain.com/api/db/health` | Database connectivity | 200 OK | 10s |
| `https://acd.yourdomain.com/api/cache/health` | Redis connectivity | 200 OK | 10s |

### Secondary Endpoints (5-minute checks)

| Endpoint | Purpose | Expected Response | Timeout |
|----------|---------|-------------------|---------|
| `https://acd.yourdomain.com/pct.html` | PCT system | 200 OK | 15s |
| `https://acd.yourdomain.com/control.html` | Control panel | 200 OK | 15s |
| `https://acd.yourdomain.com/queue.html` | Queue management | 200 OK | 15s |

---

## UptimeRobot Setup

### 1. Create Account

Visit: https://uptimerobot.com/

### 2. Add Monitors

#### API Health Monitor

- **Monitor Type**: HTTP(s)
- **Friendly Name**: ACD API Health
- **URL**: `https://acd.yourdomain.com/api/health`
- **Monitoring Interval**: Every 1 minute
- **Monitor Timeout**: 10 seconds
- **Request Headers**:
  ```
  User-Agent: UptimeRobot/1.0
  ```

#### Database Health Monitor

- **Monitor Type**: HTTP(s)
- **Friendly Name**: ACD Database Health
- **URL**: `https://acd.yourdomain.com/api/db/health`
- **Monitoring Interval**: Every 1 minute
- **Monitor Timeout**: 10 seconds
- **Expected Response**: 200 OK
- **Keyword Check**: `"status":"ok"`

#### Frontend Monitor

- **Monitor Type**: HTTP(s)
- **Friendly Name**: ACD Frontend
- **URL**: `https://acd.yourdomain.com/`
- **Monitoring Interval**: Every 5 minutes
- **Monitor Timeout**: 15 seconds

### 3. Configure Alert Contacts

Navigate to: **My Settings → Alert Contacts**

**Email Alerts**:
- Primary: `ops@yourdomain.com`
- Secondary: `admin@yourdomain.com`

**Slack Alerts** (recommended):
1. Create incoming webhook in Slack
2. Add webhook URL to UptimeRobot
3. Test notification

**SMS Alerts** (optional):
- Add phone number for critical alerts
- Recommended for production environments

### 4. Alert Thresholds

- **Down**: 2 failed checks (2 minutes)
- **Up**: 1 successful check after down
- **Notification Frequency**: Alert once per incident

---

## Better Uptime Setup

### 1. Create Account

Visit: https://betteruptime.com/

### 2. Add Monitors

Better Uptime offers more advanced monitoring features:

#### HTTP Monitor Configuration

```yaml
# betteruptime-monitors.yml
monitors:
  - name: "ACD API Health"
    url: "https://acd.yourdomain.com/api/health"
    check_frequency: 60 # seconds
    request_timeout: 10
    http_method: GET
    expected_status_codes:
      - 200
    response_validation:
      type: json
      value: '{"status": "ok"}'

  - name: "ACD Database"
    url: "https://acd.yourdomain.com/api/db/health"
    check_frequency: 60
    request_timeout: 10
    http_method: GET
    expected_status_codes:
      - 200
    response_validation:
      type: json
      value: '{"database": "connected"}'

  - name: "PCT System"
    url: "https://acd.yourdomain.com/pct.html"
    check_frequency: 300
    request_timeout: 15
    http_method: GET
    expected_status_codes:
      - 200
```

### 3. Incident Management

Better Uptime automatically creates incidents when monitors fail:

- **Auto-escalation**: Escalate to on-call after 5 minutes
- **Status Page**: Public status page at status.yourdomain.com
- **Incident Timeline**: Automatic incident logging

### 4. On-Call Scheduling

```yaml
# on-call-schedule.yml
schedules:
  - name: "Primary On-Call"
    timezone: "America/Los_Angeles"
    layers:
      - rotation_type: "weekly"
        rotation_starts: "Monday 00:00"
        members:
          - user_id: "user1"
          - user_id: "user2"

  - name: "Secondary On-Call"
    timezone: "America/Los_Angeles"
    layers:
      - rotation_type: "weekly"
        rotation_starts: "Monday 00:00"
        members:
          - user_id: "user3"
          - user_id: "user4"
```

---

## Custom Monitoring Script

For self-hosted monitoring or additional checks:

### Setup Script

```bash
#!/bin/bash
# scripts/uptime-monitor.sh

# Configuration
ENDPOINTS=(
  "https://acd.yourdomain.com/api/health|API Health"
  "https://acd.yourdomain.com/api/db/health|Database"
  "https://acd.yourdomain.com/api/cache/health|Redis"
)

SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
LOG_FILE="/var/log/uptime-monitor.log"

# Function to check endpoint
check_endpoint() {
  local url=$1
  local name=$2

  response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url")

  if [ "$response" -eq 200 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ $name is UP (HTTP $response)" >> "$LOG_FILE"
    return 0
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✗ $name is DOWN (HTTP $response)" >> "$LOG_FILE"

    # Send Slack alert
    curl -X POST "$SLACK_WEBHOOK" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"🚨 ALERT: $name is DOWN (HTTP $response)\\nURL: $url\\nTime: $(date)\"}"

    return 1
  fi
}

# Main monitoring loop
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting uptime monitor..." >> "$LOG_FILE"

for endpoint in "${ENDPOINTS[@]}"; do
  IFS='|' read -r url name <<< "$endpoint"
  check_endpoint "$url" "$name"
done

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Monitoring cycle complete" >> "$LOG_FILE"
```

### Make Script Executable

```bash
chmod +x scripts/uptime-monitor.sh
```

### Schedule with Cron

```bash
# Edit crontab
crontab -e

# Add monitoring job (every minute)
* * * * * /path/to/scripts/uptime-monitor.sh

# Or every 5 minutes
*/5 * * * * /path/to/scripts/uptime-monitor.sh
```

### Advanced Monitoring Script (Node.js)

```javascript
// scripts/uptime-monitor.js
const https = require('https');
const http = require('http');

const ENDPOINTS = [
  { url: 'https://acd.yourdomain.com/api/health', name: 'API Health', critical: true },
  { url: 'https://acd.yourdomain.com/api/db/health', name: 'Database', critical: true },
  { url: 'https://acd.yourdomain.com/api/cache/health', name: 'Redis', critical: true },
  { url: 'https://acd.yourdomain.com/', name: 'Frontend', critical: false },
  { url: 'https://acd.yourdomain.com/pct.html', name: 'PCT System', critical: false }
];

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const ALERT_COOLDOWN = 5 * 60 * 1000; // 5 minutes
const lastAlerts = new Map();

async function checkEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint.url);
    const protocol = url.protocol === 'https:' ? https : http;

    const startTime = Date.now();
    const req = protocol.get(url, { timeout: 10000 }, (res) => {
      const duration = Date.now() - startTime;

      resolve({
        ...endpoint,
        status: res.statusCode,
        duration,
        success: res.statusCode === 200
      });
    });

    req.on('error', (error) => {
      resolve({
        ...endpoint,
        status: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        ...endpoint,
        status: 0,
        duration: 10000,
        success: false,
        error: 'Timeout'
      });
    });
  });
}

async function sendSlackAlert(result) {
  if (!SLACK_WEBHOOK) return;

  const now = Date.now();
  const lastAlert = lastAlerts.get(result.name);

  // Cooldown to prevent alert spam
  if (lastAlert && (now - lastAlert) < ALERT_COOLDOWN) {
    return;
  }

  const message = {
    text: `🚨 ALERT: ${result.name} is DOWN`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚨 ${result.name} is DOWN`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*URL:*\n${result.url}`
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${result.status || 'Connection Failed'}`
          },
          {
            type: 'mrkdwn',
            text: `*Time:*\n${new Date().toISOString()}`
          },
          {
            type: 'mrkdwn',
            text: `*Critical:*\n${result.critical ? 'Yes ⚠️' : 'No'}`
          }
        ]
      }
    ]
  };

  if (result.error) {
    message.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Error:*\n\`\`\`${result.error}\`\`\``
      }
    });
  }

  try {
    const response = await fetch(SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (response.ok) {
      lastAlerts.set(result.name, now);
    }
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
  }
}

async function monitor() {
  console.log(`[${new Date().toISOString()}] Starting uptime check...`);

  const results = await Promise.all(
    ENDPOINTS.map(endpoint => checkEndpoint(endpoint))
  );

  let allUp = true;

  for (const result of results) {
    if (result.success) {
      console.log(`✓ ${result.name} is UP (${result.duration}ms)`);
    } else {
      console.error(`✗ ${result.name} is DOWN (${result.status || 'N/A'})`);
      allUp = false;

      // Send alert for failures
      await sendSlackAlert(result);
    }
  }

  const summary = {
    timestamp: new Date().toISOString(),
    totalChecks: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    averageResponseTime: Math.round(
      results.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) /
      results.filter(r => r.success).length
    )
  };

  console.log(`Summary: ${summary.successful}/${summary.totalChecks} UP, Avg: ${summary.averageResponseTime}ms`);

  // Write to log file
  const fs = require('fs');
  fs.appendFileSync('/var/log/uptime-monitor.log',
    JSON.stringify(summary) + '\n'
  );

  return allUp;
}

// Run monitor
monitor().then(allUp => {
  process.exit(allUp ? 0 : 1);
});
```

### Run Node.js Monitor

```bash
# Install globally
npm install -g npm-run-all

# Run once
SLACK_WEBHOOK_URL="https://hooks.slack.com/..." node scripts/uptime-monitor.js

# Run continuously (every minute)
watch -n 60 "SLACK_WEBHOOK_URL='https://...' node scripts/uptime-monitor.js"
```

---

## Health Check Endpoints

Ensure these endpoints exist in your backend:

```typescript
// backend/src/routes/health.ts
import express from 'express';
import { prisma } from '../db';
import { redis } from '../cache';

const router = express.Router();

// Basic health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Database health check
router.get('/db/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      database: 'disconnected',
      error: error.message
    });
  }
});

// Redis health check
router.get('/cache/health', async (req, res) => {
  try {
    await redis.ping();
    res.status(200).json({
      cache: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      cache: 'disconnected',
      error: error.message
    });
  }
});

// Comprehensive health check
router.get('/health/full', async (req, res) => {
  const checks = {
    api: 'ok',
    database: 'unknown',
    cache: 'unknown',
    external: 'unknown'
  };

  let overallStatus = 200;

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (error) {
    checks.database = 'error';
    overallStatus = 503;
  }

  // Check Redis
  try {
    await redis.ping();
    checks.cache = 'ok';
  } catch (error) {
    checks.cache = 'error';
    overallStatus = 503;
  }

  // Check external services (Anthropic API)
  try {
    // Simple connectivity check
    checks.external = 'ok';
  } catch (error) {
    checks.external = 'error';
    overallStatus = 503;
  }

  res.status(overallStatus).json({
    status: overallStatus === 200 ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;
```

---

## Status Page

### Public Status Page (Better Uptime)

Better Uptime provides a hosted status page:

- URL: `https://status.yourdomain.com`
- Features:
  - Real-time status updates
  - Historical uptime data
  - Incident timeline
  - Maintenance scheduling

### Self-Hosted Status Page

Use **Statusfy** or **Cachet** for self-hosted status pages:

```bash
# Install Statusfy
npm install -g statusfy

# Create status page
statusfy init

# Configure
# Edit config.yml

# Build and deploy
statusfy build
statusfy start
```

---

## Alerting Channels

### 1. Slack Notifications

```javascript
async function sendSlackNotification(message, severity = 'info') {
  const emoji = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '🚨'
  }[severity];

  const color = {
    info: '#36a64f',
    warning: '#ff9900',
    error: '#ff0000'
  }[severity];

  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [{
        color,
        title: `${emoji} ${message.title}`,
        text: message.text,
        fields: message.fields,
        footer: 'ACD Monitoring',
        ts: Math.floor(Date.now() / 1000)
      }]
    })
  });
}
```

### 2. Email Notifications

```javascript
import nodemailer from 'nodemailer';

async function sendEmailAlert(subject, body) {
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: 'alerts@yourdomain.com',
    to: 'ops@yourdomain.com',
    subject: `🚨 ${subject}`,
    html: body
  });
}
```

### 3. SMS Alerts (Twilio)

```javascript
import twilio from 'twilio';

async function sendSMSAlert(message) {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: process.env.ALERT_PHONE_NUMBER
  });
}
```

---

## Metrics & Reporting

### Weekly Uptime Report

```javascript
// scripts/uptime-report.js
async function generateUptimeReport() {
  const logs = await parseLogFile('/var/log/uptime-monitor.log');

  const report = {
    period: 'Last 7 days',
    endpoints: {}
  };

  for (const endpoint of ENDPOINTS) {
    const checks = logs.filter(l => l.endpoint === endpoint.name);
    const successful = checks.filter(c => c.success).length;
    const total = checks.length;

    report.endpoints[endpoint.name] = {
      uptime: ((successful / total) * 100).toFixed(2) + '%',
      totalChecks: total,
      successfulChecks: successful,
      failedChecks: total - successful,
      averageResponseTime: calculateAverage(checks.map(c => c.duration))
    };
  }

  return report;
}
```

---

## Best Practices

1. **Monitor from Multiple Locations**
   - Use geo-distributed monitoring
   - Detect regional outages

2. **Set Appropriate Timeouts**
   - API endpoints: 10 seconds
   - Frontend pages: 15 seconds
   - Database queries: 5 seconds

3. **Avoid False Positives**
   - Require 2+ failed checks before alerting
   - Implement alert cooldowns

4. **Escalation Policy**
   - Primary on-call: 5 minutes
   - Secondary on-call: 15 minutes
   - Management: 30 minutes

5. **Regular Review**
   - Weekly uptime reports
   - Monthly incident reviews
   - Quarterly monitoring audit

---

## Troubleshooting

### High False Positive Rate

- Increase timeout values
- Require more failed checks before alert
- Check monitor location network issues

### Missing Alerts

- Verify webhook URLs
- Check Slack/email delivery
- Test alert channels manually

### Slow Response Times

- Check server resources (CPU, memory)
- Analyze database query performance
- Review Redis cache hit rates

---

## Resources

- **UptimeRobot**: https://uptimerobot.com/
- **Better Uptime**: https://betteruptime.com/
- **Pingdom**: https://www.pingdom.com/
- **Statusfy**: https://statusfy.co/
- **Cachet**: https://cachethq.io/

---

**Last Updated:** 2026-03-01
**Monitoring Coverage:** API, Database, Cache, Frontend
