#!/usr/bin/env node

/**
 * Code Fixer Agent (SH-002)
 * =========================
 * Claude Code SDK session that reads error context, identifies root cause,
 * applies minimal fix, validates, and commits.
 *
 * Usage:
 *   node harness/code-fixer-agent.js --service ig-dm --context '{"port":3100,...}'
 *   node harness/code-fixer-agent.js --file /path/to/broken.js --error "TypeError: ..."
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATS_FILE = path.join(__dirname, 'healing-stats.json');
const LOG_FILE = path.join(__dirname, 'logs', 'code-fixer-agent.log');

// ── Logging ──────────────────────────────────────────────────────────────────

function log(msg) {
  const line = `${new Date().toISOString()} [code-fixer] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch { /* non-fatal */ }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadJson(fp, fallback) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return fallback; }
}

function writeJson(fp, data) {
  try { fs.writeFileSync(fp, JSON.stringify(data, null, 2)); } catch (e) { log(`Write error: ${e.message}`); }
}

function readTail(filePath, lines = 50) {
  try {
    const all = fs.readFileSync(filePath, 'utf-8').split('\n');
    return all.slice(-lines).join('\n');
  } catch { return ''; }
}

// ── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_file',
    description: 'Read a file from disk (returns content)',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute file path' },
        tail_lines: { type: 'number', description: 'If set, only return last N lines' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file (overwrites)',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute file path' },
        content: { type: 'string', description: 'File content' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'run_command',
    description: 'Run a shell command and return output (max 30s)',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
        cwd: { type: 'string', description: 'Working directory (optional)' },
      },
      required: ['command'],
    },
  },
  {
    name: 'record_result',
    description: 'Record the fix result to healing-stats.json and exit',
    input_schema: {
      type: 'object',
      properties: {
        service: { type: 'string' },
        success: { type: 'boolean' },
        fix_description: { type: 'string' },
        file_modified: { type: 'string' },
        validated: { type: 'boolean' },
      },
      required: ['service', 'success', 'fix_description'],
    },
  },
];

// ── Tool handlers ────────────────────────────────────────────────────────────

function handleTool(name, input) {
  switch (name) {
    case 'read_file': {
      if (!fs.existsSync(input.path)) return { error: `File not found: ${input.path}` };
      try {
        if (input.tail_lines) return { content: readTail(input.path, input.tail_lines) };
        const content = fs.readFileSync(input.path, 'utf-8');
        if (content.length > 50000) return { content: content.slice(0, 50000), truncated: true };
        return { content };
      } catch (e) { return { error: e.message }; }
    }

    case 'write_file': {
      try {
        fs.mkdirSync(path.dirname(input.path), { recursive: true });
        fs.writeFileSync(input.path, input.content);
        return { written: true, path: input.path };
      } catch (e) { return { error: e.message }; }
    }

    case 'run_command': {
      // Safety: block destructive commands
      const blocked = ['rm -rf /', 'DROP DATABASE', 'git push --force main'];
      if (blocked.some(b => input.command.includes(b))) {
        return { error: 'Blocked: destructive command' };
      }
      try {
        const output = execSync(input.command, {
          cwd: input.cwd || __dirname,
          encoding: 'utf-8',
          timeout: 30000,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { output: output.slice(0, 10000) };
      } catch (e) {
        return { error: e.message, stdout: e.stdout?.slice(0, 5000), stderr: e.stderr?.slice(0, 5000) };
      }
    }

    case 'record_result': {
      const stats = loadJson(STATS_FILE, {
        total_attempts: 0, successes: 0, failures: 0, mttr_seconds: 0, recent_heals: [], by_service: {},
      });
      stats.total_attempts++;
      if (input.success) stats.successes++;
      else stats.failures++;

      stats.recent_heals = stats.recent_heals.slice(-49);
      stats.recent_heals.push({
        ts: new Date().toISOString(),
        service: input.service,
        success: input.success,
        fix_description: input.fix_description,
        file_modified: input.file_modified || null,
        validated: input.validated || false,
        source: 'code-fixer-agent',
      });

      if (!stats.by_service[input.service]) {
        stats.by_service[input.service] = { attempts: 0, successes: 0, failures: 0 };
      }
      const svc = stats.by_service[input.service];
      svc.attempts++;
      if (input.success) svc.successes++;
      else svc.failures++;

      writeJson(STATS_FILE, stats);
      return { recorded: true };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = fs.existsSync(path.join(__dirname, 'prompts', 'code-fixer.md'))
  ? fs.readFileSync(path.join(__dirname, 'prompts', 'code-fixer.md'), 'utf-8')
  : `You are an autonomous code fixer. Read logs, find the bug, apply a minimal fix, validate, and record the result.`;

// ── Main fix loop ────────────────────────────────────────────────────────────

export async function runCodeFixer(context) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `Fix this service error:\n\n${JSON.stringify(context, null, 2)}\n\nStart by reading the relevant log files and source code to identify the root cause.`;

  const messages = [{ role: 'user', content: userMessage }];
  const actionsTaken = [];
  let turns = 0;
  const MAX_TURNS = 15;
  let resultRecorded = false;

  while (turns < MAX_TURNS) {
    turns++;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') break;
    if (response.stop_reason !== 'tool_use') break;

    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      log(`Tool call: ${block.name}(${JSON.stringify(block.input).slice(0, 200)})`);
      const result = handleTool(block.name, block.input);
      actionsTaken.push({ tool: block.name, input: block.input, result });
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
      if (block.name === 'record_result') resultRecorded = true;
    }

    messages.push({ role: 'user', content: toolResults });
  }

  const success = actionsTaken.some(a => a.tool === 'record_result' && a.result?.recorded);
  log(`Completed in ${turns} turns, recorded=${resultRecorded}, actions=${actionsTaken.length}`);

  return { turns, actions: actionsTaken.length, resultRecorded, success };
}

// ── CLI entry ─────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
  };

  const service = getArg('--service') || 'unknown';
  const contextStr = getArg('--context') || '{}';
  const file = getArg('--file');
  const error = getArg('--error');

  let context;
  try { context = JSON.parse(contextStr); } catch { context = {}; }
  context.service = context.service || service;
  if (file) context.file_path = file;
  if (error) context.error_message = error;

  // Try to read recent service log
  const logPath = path.join(__dirname, 'logs', `${service}.log`);
  if (fs.existsSync(logPath)) {
    context.error_log = readTail(logPath, 50);
  }

  fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
  log(`Starting code-fixer for service=${service}`);

  runCodeFixer(context)
    .then(result => {
      log(`Result: ${JSON.stringify(result)}`);
      process.exit(result.success ? 0 : 1);
    })
    .catch(e => {
      log(`Fatal: ${e.message}`);
      process.exit(1);
    });
}
