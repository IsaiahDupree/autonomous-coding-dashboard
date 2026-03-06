#!/usr/bin/env node
// Enable Supabase Realtime for safari_command_queue via direct pg connection
import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const env = fs.readFileSync('/Users/isaiahdupree/Documents/Software/actp-worker/.env', 'utf8');
for (const l of env.split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.+)/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

// Supabase connection string — project ID ivhfuhxorppptyuofbgq
// Password = service role key (Supabase uses this as the postgres password for the API user)
// Actually Supabase uses a different DB password. Let's check env.
const dbPass = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD || '';
if (!dbPass) {
  console.log('No SUPABASE_DB_PASSWORD in env — skipping direct pg approach');
  console.log('You need to enable Realtime manually in Supabase dashboard:');
  console.log('  1. Go to https://supabase.com/dashboard/project/ivhfuhxorppptyuofbgq/database/replication');
  console.log('  2. Enable safari_command_queue under supabase_realtime publication');
  process.exit(0);
}

const client = new Client({
  host: 'db.ivhfuhxorppptyuofbgq.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: dbPass,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log('Connected to Supabase Postgres');

// Check current publication
const { rows: before } = await client.query(
  "SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'safari_command_queue'"
);
if (before.length > 0) {
  console.log('safari_command_queue already in supabase_realtime publication — realtime is ON');
} else {
  console.log('Adding safari_command_queue to supabase_realtime publication...');
  await client.query('ALTER PUBLICATION supabase_realtime ADD TABLE safari_command_queue');
  const { rows: after } = await client.query(
    "SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'safari_command_queue'"
  );
  if (after.length > 0) {
    console.log('Done! Realtime is now enabled for safari_command_queue');
  } else {
    console.log('ERROR: Still not in publication after ALTER');
  }
}

await client.end();
