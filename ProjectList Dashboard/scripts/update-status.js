#!/usr/bin/env node
/**
 * CLI tool to update project status from automation scripts
 * 
 * Usage:
 *   node update-status.js <project-id> --status running --action "Fetching data..."
 *   node update-status.js sasshot --status idle --action "Review results"
 *   node update-status.js --list  (show all project IDs)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECTS_FILE = path.join(__dirname, '..', 'public', 'projects.json')

function loadProjects() {
  return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'))
}

function saveProjects(projects) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2))
}

function parseArgs() {
  const args = process.argv.slice(2)
  const result = { projectId: null, options: {} }
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--list') {
      result.options.list = true
    } else if (arg === '--status' && args[i + 1]) {
      result.options.status = args[++i]
    } else if (arg === '--action' && args[i + 1]) {
      result.options.next_action = args[++i]
    } else if (arg === '--stage' && args[i + 1]) {
      result.options.progress_stage = args[++i]
    } else if (!arg.startsWith('--')) {
      result.projectId = arg
    }
  }
  
  return result
}

function main() {
  const { projectId, options } = parseArgs()
  const projects = loadProjects()
  
  if (options.list) {
    console.log('\nAvailable Projects:\n')
    projects.forEach(p => {
      const statusEmoji = {
        'running': '🟢',
        'in-progress': '🔵',
        'planning': '🟡',
        'idle': '⚪',
        'failed': '🔴',
        'done': '✅'
      }[p.status] || '⚪'
      console.log(`  ${statusEmoji} ${p.id.padEnd(25)} ${p.name}`)
    })
    console.log(`\nTotal: ${projects.length} projects\n`)
    return
  }
  
  if (!projectId) {
    console.error('Usage: update-status.js <project-id> [--status <status>] [--action <text>] [--stage <stage>]')
    console.error('       update-status.js --list')
    process.exit(1)
  }
  
  const idx = projects.findIndex(p => p.id === projectId)
  if (idx === -1) {
    console.error(`Project not found: ${projectId}`)
    console.error('Run with --list to see available projects')
    process.exit(1)
  }
  
  // Update project
  const updates = {
    last_update: new Date().toISOString()
  }
  
  if (options.status) updates.status = options.status
  if (options.next_action) updates.next_action = options.next_action
  if (options.progress_stage) updates.progress_stage = options.progress_stage
  
  projects[idx] = { ...projects[idx], ...updates }
  saveProjects(projects)
  
  console.log(`✓ Updated ${projects[idx].name}`)
  console.log(`  Status: ${projects[idx].status}`)
  console.log(`  Next action: ${projects[idx].next_action}`)
}

main()
