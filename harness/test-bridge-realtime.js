#!/usr/bin/env node
/**
 * Quick smoke test: insert a 'instagram:status' command into safari_command_queue,
 * then poll for up to 5s to see if cloud-bridge picks it up via Realtime.
 * Run this WHILE cloud-bridge.js is running in another terminal.
 */

import fs from 'fs';

const ACTP_ENV = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const env = fs.readFileSync(ACTP_ENV, 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const SB_URL = 'https://ivhfuhxorppptyuofbgq.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HEADERS = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function sbRest(method, path, body) {
  const res = await fetch(`${SB_URL}/rest/v1${path}`, {
    method, headers: HEADERS,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

// Insert a test command
const [row] = await sbRest('POST', '/safari_command_queue', {
  platform: 'instagram', action: 'status', params: {}, status: 'pending', priority: 1,
});

if (!row?.id) { console.error('INSERT failed'); process.exit(1); }
console.log(`Inserted test command id=${row.id} — waiting up to 5s for bridge to process...`);
const start = Date.now();

while (Date.now() - start < 5000) {
  await new Promise(r => setTimeout(r, 300));
  const [check] = await sbRest('GET', `/safari_command_queue?id=eq.${row.id}&select=status,result,error`);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  if (check?.status !== 'pending' && check?.status !== 'processing') {
    console.log(`\nDone in ${elapsed}s! status=${check.status} result=${check.result ? 'present' : 'empty'}`);
    process.exit(0);
  }
  process.stdout.write(`\r${elapsed}s — status: ${check?.status || '?'}   `);
}

console.log('\nTimeout: bridge did not process in 5s (is cloud-bridge.js running?)');
process.exit(1);
