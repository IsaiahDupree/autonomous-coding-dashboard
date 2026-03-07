#!/usr/bin/env node
/**
 * obsidian-interlinker.js  v2
 * Watches ~/.memory/vault for new/modified notes and auto-injects [[wiki-links]].
 * Maintains a "## Related Notes" backlink section at the bottom of each note.
 *
 * Usage:
 *   node harness/obsidian-interlinker.js              # start daemon
 *   node harness/obsidian-interlinker.js --dry-run    # preview changes, no writes
 *   node harness/obsidian-interlinker.js --scan       # one-shot full vault scan + exit
 *   node harness/obsidian-interlinker.js --scan --max-age-days=30  # scan only recent files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const chokidar = require('chokidar');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const VAULT_DIR    = path.join(process.env.HOME, '.memory/vault');
const LOG_FILE     = path.join(__dirname, 'obsidian-interlinker-log.ndjson');
const ALIASES_FILE = path.join(VAULT_DIR, '00-META/ALIASES.md');
const STATE_FILE   = path.join(__dirname, 'obsidian-interlinker-state.json');
const DEBOUNCE_MS  = 1500;
const LOG_MAX_LINES = 500;
const MIN_ENTITY_LEN = 3;
const MAX_RELATED    = 12;

const DRY_RUN   = process.argv.includes('--dry-run');
const SCAN_ONCE = process.argv.includes('--scan');
const MAX_AGE_ARG = process.argv.find(a => a.startsWith('--max-age-days='));
const MAX_AGE_DAYS = MAX_AGE_ARG ? parseInt(MAX_AGE_ARG.split('=')[1], 10) : 0;

// ── Built-in aliases: plain term → note filename stem ────────────────────────
const BUILTIN_ALIASES = {
  'CRM':              'GROWTH-METRICS',
  'business goals':   'BUSINESS-GOALS',
  'growth metrics':   'GROWTH-METRICS',
  'knowledge graph':  'KNOWLEDGE-GRAPH',
  'entity graph':     'ENTITY-GRAPH',
  'tacit knowledge':  'TACIT-KNOWLEDGE',
  'vault index':      'VAULT-INDEX',
  'ACD':              'project-acd',
  'ACTP':             'project-actp-worker',
  'actp worker':      'project-actp-worker',
  'heartbeat':        'HEARTBEAT',
  'supabase queries': 'supabase-queries',
  'cloud commands':   'supabase-queries',
};

// ── In-memory state ───────────────────────────────────────────────────────────
const state = {
  entityMap:    new Map(), // matchKey (lowercase) → { stem, filePath }
  allFiles:     new Set(), // absolute paths of all .md files
  backlinkIndex: new Map(), // stem → Set<stem> of files that mention it
  fileMentions:  new Map(), // filePath → Set<stem> of stems it currently links to
  processedAt:   new Map(), // filePath → timestamp of last successful write
};

// ── Logging ───────────────────────────────────────────────────────────────────
function log(event, data = {}) {
  const entry = { ts: new Date().toISOString(), event, ...data };
  const extra = data.file ? ` ${data.file}` : data.message ? ` ${data.message}` : '';
  console.log(`[${entry.ts.slice(11, 19)}] ${event}${extra}`);
  try { fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n'); } catch (_) {}
}

function rotateLog() {
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = content.trim().split('\n');
    if (lines.length > LOG_MAX_LINES) {
      const trimmed = lines.slice(-Math.floor(LOG_MAX_LINES * 0.8)).join('\n') + '\n';
      fs.writeFileSync(LOG_FILE, trimmed);
      log('log_rotated', { kept: Math.floor(LOG_MAX_LINES * 0.8), dropped: lines.length - Math.floor(LOG_MAX_LINES * 0.8) });
    }
  } catch (_) {}
}

// ── Persistence (mtime tracking for --scan efficiency) ───────────────────────
function loadProcessedState() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    for (const [k, v] of Object.entries(raw.processedAt || {})) {
      state.processedAt.set(k, v);
    }
  } catch (_) {}
}

function saveProcessedState() {
  try {
    const out = { processedAt: Object.fromEntries(state.processedAt) };
    fs.writeFileSync(STATE_FILE, JSON.stringify(out, null, 2));
  } catch (_) {}
}

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Vault walk ────────────────────────────────────────────────────────────────
function walkVault(dir = VAULT_DIR, files = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return files; }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkVault(full, files);
    else if (e.name.endsWith('.md')) files.push(full);
  }
  return files;
}

// ── Build entity map + populate allFiles in one walk ─────────────────────────
function buildEntityMap() {
  const map = new Map();
  const files = walkVault();

  state.allFiles.clear();
  for (const fp of files) state.allFiles.add(fp);

  for (const filePath of files) {
    const stem = path.basename(filePath, '.md');

    // Read frontmatter title (first 500 chars only)
    let displayTitle = stem;
    try {
      const head = fs.readFileSync(filePath, 'utf8').slice(0, 500);
      const m = head.match(/^---[\s\S]*?^title:\s*(.+)$/m);
      if (m) displayTitle = m[1].trim();
    } catch {}

    const normalized = stem.replace(/[-_]/g, ' ');
    for (const key of new Set([stem, normalized, displayTitle])) {
      if (key.length >= MIN_ENTITY_LEN) {
        map.set(key.toLowerCase(), { stem, filePath });
      }
    }
  }

  // Built-in aliases
  for (const [alias, targetStem] of Object.entries(BUILTIN_ALIASES)) {
    // O(1) lookup via reverse stem index
    const fp = files.find(f => path.basename(f, '.md') === targetStem);
    if (fp) map.set(alias.toLowerCase(), { stem: targetStem, filePath: fp });
  }

  // User aliases from 00-META/ALIASES.md  (format: "- alias -> StemName")
  try {
    for (const line of fs.readFileSync(ALIASES_FILE, 'utf8').split('\n')) {
      const m = line.match(/^-\s+(.+?)\s*->\s*(.+?)\s*$/);
      if (!m) continue;
      const [, alias, targetStem] = m;
      const fp = files.find(f => path.basename(f, '.md') === targetStem);
      if (fp) map.set(alias.toLowerCase(), { stem: targetStem, filePath: fp });
    }
  } catch {}

  state.entityMap = map;
}

// ── Build backlink index from scratch (called once on startup) ────────────────
function buildBacklinkIndex() {
  state.backlinkIndex.clear();
  state.fileMentions.clear();

  for (const filePath of state.allFiles) {
    let content;
    try { content = fs.readFileSync(filePath, 'utf8'); } catch { continue; }
    const mentions = extractMentions(content);
    state.fileMentions.set(filePath, mentions);
    for (const stem of mentions) {
      if (!state.backlinkIndex.has(stem)) state.backlinkIndex.set(stem, new Set());
      state.backlinkIndex.get(stem).add(path.basename(filePath, '.md'));
    }
  }
}

// ── Extract all [[stems]] a file currently links to ──────────────────────────
function extractMentions(content) {
  const stems = new Set();
  const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let m;
  while ((m = re.exec(content)) !== null) stems.add(m[1]);
  return stems;
}

// ── Update backlink index for one file after its content changes ───────────────
function updateBacklinkIndex(filePath, newContent) {
  const selfStem = path.basename(filePath, '.md');
  const prevMentions = state.fileMentions.get(filePath) || new Set();
  const newMentions  = extractMentions(newContent);

  // Remove stale backlinks
  for (const stem of prevMentions) {
    if (!newMentions.has(stem)) {
      state.backlinkIndex.get(stem)?.delete(selfStem);
    }
  }
  // Add new backlinks
  for (const stem of newMentions) {
    if (!state.backlinkIndex.has(stem)) state.backlinkIndex.set(stem, new Set());
    state.backlinkIndex.get(stem).add(selfStem);
  }

  state.fileMentions.set(filePath, newMentions);

  // Return stems whose backlink sets changed (need related-notes update)
  const changed = new Set();
  for (const s of prevMentions) if (!newMentions.has(s)) changed.add(s);
  for (const s of newMentions) if (!prevMentions.has(s)) changed.add(s);
  return changed;
}

// ── Parse note into frontmatter + body (strips existing Related Notes) ─────────
function parseNote(content) {
  let frontmatter = '';
  let body = content;
  const fmMatch = content.match(/^(---[\s\S]*?---\n)([\s\S]*)$/);
  if (fmMatch) { frontmatter = fmMatch[1]; body = fmMatch[2]; }
  const relIdx = body.search(/\n---\n## Related Notes[\s\S]*$/);
  if (relIdx >= 0) body = body.slice(0, relIdx);
  return { frontmatter, body };
}

// ── Single regex that matches all protected regions in one pass ───────────────
// Segments: [[wiki]], `code`, [text](url), https?://...
const PROTECTED_RE = /\[\[[^\]]*(?:\][^\]])*\]\]|`[^`]+`|\[[^\]]*\]\([^)]*\)|https?:\/\/\S+/g;

function splitSegments(line) {
  const segs = [];
  let last = 0;
  PROTECTED_RE.lastIndex = 0;
  let m;
  while ((m = PROTECTED_RE.exec(line)) !== null) {
    if (m.index > last) segs.push({ text: line.slice(last, m.index), safe: true });
    segs.push({ text: m[0], safe: false });
    last = m.index + m[0].length;
  }
  if (last < line.length) segs.push({ text: line.slice(last), safe: true });
  return segs;
}

// ── Build a single combined alternation regex for ALL entities ────────────────
// One pass per line segment instead of 94 passes.
function buildCombinedPattern(selfStem) {
  // Exclude ALL forms of self (stem, normalized with spaces/underscores)
  const selfForms = new Set([
    selfStem,
    selfStem.replace(/-/g, ' '),
    selfStem.replace(/_/g, ' '),
  ]);

  const entries = [...state.entityMap.entries()]
    .filter(([key]) => !selfForms.has(key))
    .sort(([a], [b]) => b.length - a.length); // longest first — prevents partial matches

  if (entries.length === 0) return null;

  const lookup = new Map(entries.map(([key, { stem }]) => [key.toLowerCase(), stem]));
  const alts   = entries.map(([key]) => escRe(key)).join('|');
  const re     = new RegExp(`\\b(${alts})\\b`, 'gi');

  return { re, lookup };
}

// ── Inject [[wiki-links]] into body text ─────────────────────────────────────
function injectLinks(body, filePath) {
  const selfStem = path.basename(filePath, '.md').toLowerCase();
  let changed = false;

  const combined = buildCombinedPattern(selfStem);
  if (!combined) return { body, changed };

  const lines = body.split('\n');
  let inFence = false;

  const processed = lines.map(line => {
    if (/^```/.test(line.trimStart())) { inFence = !inFence; return line; }
    if (inFence) return line;
    if (/^\|[-:\s|]+\|$/.test(line)) return line; // table separator
    if (/^<!--/.test(line.trimStart())) return line; // html comment

    // Split into protected / plain segments (single regex pass)
    const segs = splitSegments(line);

    return segs.map(seg => {
      if (!seg.safe) return seg.text;

      combined.re.lastIndex = 0;
      return seg.text.replace(combined.re, (match) => {
        const stem = combined.lookup.get(match.toLowerCase());
        if (!stem) return match;
        changed = true;
        return match.toLowerCase() === stem.toLowerCase() ? `[[${stem}]]` : `[[${stem}|${match}]]`;
      });
    }).join('');
  });

  return { body: processed.join('\n'), changed };
}

// ── Build "## Related Notes" section using backlink index (O(1)) ──────────────
function buildRelatedSection(filePath) {
  const selfStem = path.basename(filePath, '.md');
  const backlinkers = state.backlinkIndex.get(selfStem);
  if (!backlinkers || backlinkers.size === 0) return '';
  const links = [...backlinkers].slice(0, MAX_RELATED).sort().map(s => `- [[${s}]]`).join('\n');
  return `\n---\n## Related Notes\n${links}\n`;
}

// ── Write only the Related Notes section of a file (no link injection) ─────────
function patchRelatedNotes(filePath) {
  if (filePath === ALIASES_FILE) return;
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); } catch { return; }
  const { frontmatter, body } = parseNote(content);
  const relatedSection = buildRelatedSection(filePath);
  const newContent = frontmatter + body + relatedSection;
  if (newContent === content) return;
  if (!DRY_RUN) {
    try { fs.writeFileSync(filePath, newContent, 'utf8'); } catch {}
  }
}

// ── Process a single file (full: links + related notes) ───────────────────────
function processFile(filePath) {
  if (!filePath.endsWith('.md')) return;
  if (filePath === ALIASES_FILE) return;

  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); } catch { return; }

  const { frontmatter, body } = parseNote(content);
  const { body: linkedBody, changed: linksChanged } = injectLinks(body, filePath);
  const relatedSection = buildRelatedSection(filePath);
  const newContent = frontmatter + linkedBody + relatedSection;

  if (newContent === content) return;

  const stem = path.basename(filePath, '.md');

  if (DRY_RUN) {
    const addedLinks = (newContent.match(/\[\[/g) || []).length - (content.match(/\[\[/g) || []).length;
    console.log(`[DRY-RUN] ${stem}: +${addedLinks} links, ${(relatedSection.match(/\[\[/g) || []).length} related`);
    return;
  }

  try {
    fs.writeFileSync(filePath, newContent, 'utf8');
    const addedLinks = (newContent.match(/\[\[/g) || []).length - (content.match(/\[\[/g) || []).length;
    log('interlinked', { file: stem, addedLinks, relatedCount: (relatedSection.match(/\[\[/g) || []).length });
    state.processedAt.set(filePath, Date.now());

    // Update backlink index + propagate to affected targets
    const affectedStems = updateBacklinkIndex(filePath, newContent);
    for (const targetStem of affectedStems) {
      const targetEntry = [...state.entityMap.values()].find(v => v.stem === targetStem);
      if (targetEntry && targetEntry.filePath !== filePath) {
        patchRelatedNotes(targetEntry.filePath);
      }
    }
  } catch (err) {
    log('write_error', { file: stem, error: err.message });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  rotateLog();
  loadProcessedState();
  log('startup', { vault: VAULT_DIR, dryRun: DRY_RUN, scanOnce: SCAN_ONCE });

  buildEntityMap();
  buildBacklinkIndex();
  log('ready', { entities: state.entityMap.size, files: state.allFiles.size });

  // ── One-shot scan mode ────────────────────────────────────────────────────
  if (SCAN_ONCE) {
    const cutoff = MAX_AGE_DAYS > 0 ? Date.now() - MAX_AGE_DAYS * 86400000 : 0;
    const files = [...state.allFiles];
    console.log(`\nScanning ${files.length} notes${MAX_AGE_DAYS ? ` (last ${MAX_AGE_DAYS} days)` : ''}...`);
    let updated = 0, skipped = 0;

    for (const fp of files) {
      if (cutoff > 0) {
        try {
          const mtime = fs.statSync(fp).mtimeMs;
          if (mtime < cutoff) { skipped++; continue; }
        } catch {}
      }
      const before = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : '';
      processFile(fp);
      const after = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : '';
      if (!DRY_RUN && after !== before) updated++;
    }

    if (!DRY_RUN) {
      console.log(`Done. ${updated} updated, ${skipped} skipped (age filter).`);
      saveProcessedState();
    }
    return;
  }

  // ── Daemon mode ───────────────────────────────────────────────────────────
  const pending = new Map();

  // Ignore dotfiles relative to vault root (vault itself is inside .memory — don't use regex)
  const ignoredFn = (fp) => {
    const rel = path.relative(VAULT_DIR, fp);
    return rel.split(path.sep).some(part => part.startsWith('.') && part.length > 1);
  };

  const watcher = chokidar.watch(VAULT_DIR, {
    ignored: ignoredFn,
    persistent: true,
    ignoreInitial: true,
    usePolling: true,
    interval: 2000,
    awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 200 },
  });

  function schedule(fp, isNew = false) {
    if (!fp.endsWith('.md')) return;
    if (pending.has(fp)) clearTimeout(pending.get(fp));
    pending.set(fp, setTimeout(() => {
      pending.delete(fp);
      if (isNew) {
        // New file: rebuild entity map so its stem becomes linkable
        buildEntityMap();
        buildBacklinkIndex();
      }
      processFile(fp);
      // Persist state periodically (debounced)
      saveProcessedState();
    }, DEBOUNCE_MS));
  }

  watcher
    .on('add',    fp => { log('file_added',   { file: path.basename(fp) }); state.allFiles.add(fp);     schedule(fp, true); })
    .on('change', fp => { log('file_changed', { file: path.basename(fp) }); schedule(fp, false); })
    .on('unlink', fp => {
      log('file_removed', { file: path.basename(fp) });
      state.allFiles.delete(fp);
      state.fileMentions.delete(fp);
      state.processedAt.delete(fp);
      // Clean up backlink index for deleted file
      const stem = path.basename(fp, '.md');
      for (const [, set] of state.backlinkIndex) set.delete(stem);
      state.backlinkIndex.delete(stem);
      buildEntityMap(); // stem is gone, rebuild
    })
    .on('error',  err => log('watcher_error', { message: err.message }))
    .on('ready',  () => log('watcher_ready', { message: 'Watching for changes' }));

  // Keepalive — prevents event loop draining
  const heartbeat = setInterval(() => {
    try { fs.utimesSync(LOG_FILE, new Date(), new Date()); } catch {}
  }, 30000);

  log('watching', { message: VAULT_DIR });
  console.log(`\nObsidian Interlinker v2 — ${VAULT_DIR}`);
  console.log(`Entities: ${state.entityMap.size} | Notes: ${state.allFiles.size}`);
  console.log('Ctrl+C to stop.\n');

  const shutdown = (sig) => {
    clearInterval(heartbeat);
    saveProcessedState();
    log('shutdown', { signal: sig });
    watcher.close();
    process.exit(0);
  };
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(err => { log('fatal', { message: err.message }); process.exit(1); });
