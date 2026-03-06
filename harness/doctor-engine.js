#!/usr/bin/env node

/**
 * ACD Doctor Engine
 * =================
 * Uses @anthropic-ai/sdk with a tool-use loop to diagnose and heal stuck agents.
 * "Claude diagnoses Claude" — reads logs, status, telemetry, then executes fixes.
 *
 * Usage:
 *   import { diagnoseAndHeal } from './doctor-engine.js';
 *   const result = await diagnoseAndHeal('my-slug', 'No status update for 35 minutes');
 *   // result: { diagnosis, actions_taken, success, turns }
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { getEvents } from './agent-telemetry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_ROOT = path.resolve(__dirname, '..');
const LOGS_DIR = path.join(__dirname, 'logs');
const PROGRESS_FILE = path.join(DASHBOARD_ROOT, 'claude-progress.txt');

// ── Tool definitions ──────────────────────────────────────────────────────────

const DOCTOR_TOOLS = [
  {
    name: 'get_agent_status',
    description: 'Read the harness-status-{slug}.json file from the dashboard root',
    input_schema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Agent slug / project ID' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'read_agent_logs',
    description: 'Read the last N lines from the agent log file in harness/logs/',
    input_schema: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        lines: { type: 'number', description: 'Number of tail lines (default 150)' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'read_feature_list',
    description: 'Read the features JSON for the agent, showing pass/fail state',
    input_schema: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'read_telemetry',
    description: 'Read last N telemetry events from in-memory ring buffer',
    input_schema: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        limit: { type: 'number', description: 'Number of events (default 20)' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'kill_agent',
    description: 'Send SIGTERM to the agent process by PID (reads PID from status if not provided)',
    input_schema: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        pid: { type: 'number', description: 'PID to kill (optional — reads from status file)' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'restart_agent',
    description: 'Re-run launch-{slug}.sh to restart the agent in the background',
    input_schema: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'fix_feature_file',
    description: 'Write corrected features JSON to the feature list file',
    input_schema: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        content: { type: 'string', description: 'Full JSON string to write to the feature file' },
      },
      required: ['slug', 'content'],
    },
  },
  {
    name: 'inject_note',
    description: 'Append a diagnosis note to claude-progress.txt',
    input_schema: {
      type: 'object',
      properties: {
        note: { type: 'string', description: 'Diagnosis note to append' },
      },
      required: ['note'],
    },
  },
];

// ── Tool handlers ─────────────────────────────────────────────────────────────

function handleTool(name, input) {
  switch (name) {
    case 'get_agent_status': {
      const statusFile = path.join(DASHBOARD_ROOT, `harness-status-${input.slug}.json`);
      if (!fs.existsSync(statusFile)) return { error: 'Status file not found', tried: statusFile };
      try {
        return JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
      } catch (e) {
        return { error: e.message };
      }
    }

    case 'read_agent_logs': {
      const lines = input.lines || 150;
      const logFile = path.join(LOGS_DIR, `${input.slug}.log`);
      if (!fs.existsSync(logFile)) return { error: 'Log file not found', tried: logFile };
      try {
        const all = fs.readFileSync(logFile, 'utf-8').split('\n');
        return { content: all.slice(-lines).join('\n'), totalLines: all.length };
      } catch (e) {
        return { error: e.message };
      }
    }

    case 'read_feature_list': {
      const candidates = [
        path.join(__dirname, 'features', `${input.slug}.json`),
        path.join(__dirname, `${input.slug}-features.json`),
      ];
      for (const fp of candidates) {
        if (fs.existsSync(fp)) {
          try {
            return JSON.parse(fs.readFileSync(fp, 'utf-8'));
          } catch (e) {
            return { error: e.message };
          }
        }
      }
      return { error: 'Feature file not found', tried: candidates };
    }

    case 'read_telemetry': {
      return { events: getEvents(input.slug, input.limit || 20) };
    }

    case 'kill_agent': {
      let pid = input.pid;
      if (!pid) {
        const statusFile = path.join(DASHBOARD_ROOT, `harness-status-${input.slug}.json`);
        try {
          pid = JSON.parse(fs.readFileSync(statusFile, 'utf-8')).pid;
        } catch { /* ok */ }
      }
      if (!pid) return { error: 'No PID found — cannot kill' };
      try {
        process.kill(pid, 'SIGTERM');
        return { killed: true, pid };
      } catch (e) {
        return { error: e.message, pid };
      }
    }

    case 'restart_agent': {
      const launchScript = path.join(__dirname, `launch-${input.slug}.sh`);
      if (!fs.existsSync(launchScript)) {
        return { error: `Launch script not found: ${launchScript}` };
      }
      try {
        const proc = spawn('/bin/zsh', [launchScript], {
          detached: true,
          stdio: 'ignore',
          cwd: __dirname,
        });
        proc.unref();
        return { started: true, pid: proc.pid, script: launchScript };
      } catch (e) {
        return { error: e.message };
      }
    }

    case 'fix_feature_file': {
      const candidates = [
        path.join(__dirname, 'features', `${input.slug}.json`),
        path.join(__dirname, `${input.slug}-features.json`),
      ];
      const fp = candidates.find(f => fs.existsSync(f)) || candidates[0];
      try {
        JSON.parse(input.content); // validate JSON before writing
        fs.writeFileSync(fp, input.content);
        return { written: true, path: fp };
      } catch (e) {
        return { error: `Invalid JSON or write error: ${e.message}` };
      }
    }

    case 'inject_note': {
      try {
        const line = `\n[DOCTOR ${new Date().toISOString()}] ${input.note}\n`;
        fs.appendFileSync(PROGRESS_FILE, line);
        return { written: true };
      } catch (e) {
        return { error: e.message };
      }
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Doctor system prompt ──────────────────────────────────────────────────────

const DOCTOR_SYSTEM = `You are the ACD Doctor Agent — a diagnostics system that identifies and fixes stuck autonomous coding agents.

Your job:
1. Read the agent's logs, status, and feature list to identify the root cause of the stall
2. Execute 1-3 targeted healing actions from the available tools
3. Append a concise diagnosis note via inject_note as your LAST action

Root causes to look for:
- Infinite loop or repeated same action without progress
- Wrong file path (feature list not found, wrong project root)
- Corrupt feature JSON (bare array instead of {"features": [...]})
- Rate limit or auth error causing agent to hang
- Zombie process (PID alive but no log output for 15+ minutes)
- Context overflow or tool failure

Rules:
- Keep sessions ≤ 10 tool calls total
- Prefer restart_agent over kill_agent alone (restart implies kill + relaunch)
- Always call inject_note as your final action to document the diagnosis
- If you cannot fix the issue, still inject_note explaining what you found`;

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Diagnose and heal a stuck agent using a Claude tool-use loop.
 * @param {string} slug - Agent project ID
 * @param {string} reason - Why the agent was flagged as stuck
 * @returns {Promise<{diagnosis: string, actions_taken: Array, success: boolean, turns: number}>}
 */
export async function diagnoseAndHeal(slug, reason) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const messages = [
    {
      role: 'user',
      content: `Agent "${slug}" appears stuck.\nReason: ${reason}\n\nPlease diagnose and heal it. Start by reading the agent's status and recent logs.`,
    },
  ];

  const actionsTaken = [];
  let diagnosis = null;
  let turns = 0;
  const MAX_TURNS = 10;

  while (turns < MAX_TURNS) {
    turns++;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: DOCTOR_SYSTEM,
      tools: DOCTOR_TOOLS,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      if (textBlock) diagnosis = textBlock.text;
      break;
    }

    if (response.stop_reason !== 'tool_use') break;

    // Execute tool calls and collect results
    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      const result = handleTool(block.name, block.input);
      actionsTaken.push({ tool: block.name, input: block.input, result });
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  const success =
    actionsTaken.some(a => a.tool === 'restart_agent' && a.result?.started === true) ||
    actionsTaken.some(a => a.tool === 'fix_feature_file' && a.result?.written === true);

  return { diagnosis, actions_taken: actionsTaken, success, turns };
}

// ── CLI usage ─────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const eq = args.find(a => a.startsWith(`${flag}=`));
    if (eq) return eq.split('=').slice(1).join('=');
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
  };

  const slug = getArg('--slug') || args[0];
  const reason = getArg('--reason') || 'Manual invocation';

  if (!slug) {
    console.error('Usage: node doctor-engine.js --slug <slug> [--reason <reason>]');
    process.exit(1);
  }

  console.log(`Doctor engine running for "${slug}"...`);
  diagnoseAndHeal(slug, reason)
    .then(result => {
      console.log('\n── Doctor Result ──');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(e => {
      console.error(`Fatal: ${e.message}`);
      process.exit(1);
    });
}
