#!/usr/bin/env node
/**
 * Test script to verify feature tracking is working correctly.
 * Validates that the harness can read and the agent can update feature_list.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPOS = [
  {
    name: 'GapRadar',
    featureList: '/Users/isaiahdupree/Documents/Software/WhatsCurrentlyInTheMarket/gap-radar/feature_list.json',
    prompt: path.join(__dirname, 'prompts/gapradar.md'),
  },
  {
    name: 'MediaPoster',
    featureList: '/Users/isaiahdupree/Documents/Software/MediaPoster/feature_list.json',
    prompt: path.join(__dirname, 'prompts/mediaposter.md'),
  },
  {
    name: 'CanvasCast',
    featureList: '/Users/isaiahdupree/Documents/Software/YoutubeNewb-CanvasCast_2/CanvasCast-Target/feature_list.json',
    prompt: path.join(__dirname, 'prompts/canvascast.md'),
  },
  {
    name: 'EverReach App Kit',
    featureList: '/Users/isaiahdupree/Documents/Software/EverReachOrganized/app-kit/feature_list.json',
    prompt: path.join(__dirname, 'prompts/everreach-appkit.md'),
  },
];

function log(msg, type = 'info') {
  const icons = { pass: '✅', fail: '❌', info: '📋', warn: '⚠️' };
  console.log(`${icons[type] || '•'} ${msg}`);
}

function validateFeatureList(filePath) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: 'File not found' };
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    if (!data.features || !Array.isArray(data.features)) {
      return { valid: false, error: 'Missing features array' };
    }
    
    if (data.features.length === 0) {
      return { valid: false, error: 'Features array is empty' };
    }
    
    // Check structure
    const sample = data.features[0];
    if (!sample.id) return { valid: false, error: 'Features missing id field' };
    if (!sample.name) return { valid: false, error: 'Features missing name field' };
    if (typeof sample.passes !== 'boolean') {
      return { valid: false, error: 'Features missing passes boolean field' };
    }
    
    const total = data.features.length;
    const passing = data.features.filter(f => f.passes === true).length;
    
    return {
      valid: true,
      total,
      passing,
      pending: total - passing,
      percent: ((passing / total) * 100).toFixed(1),
    };
  } catch (e) {
    return { valid: false, error: `Parse error: ${e.message}` };
  }
}

function validatePrompt(promptPath, expectedFeatureList) {
  if (!fs.existsSync(promptPath)) {
    return { valid: false, error: 'Prompt file not found' };
  }
  
  const content = fs.readFileSync(promptPath, 'utf-8');
  
  // Check if prompt mentions the correct feature list
  if (!content.includes(expectedFeatureList)) {
    return { valid: false, error: `Prompt does not reference ${expectedFeatureList}` };
  }
  
  // Check for explicit update instructions
  if (!content.includes('passes": true') && !content.includes('passes: true')) {
    return { valid: false, error: 'Prompt missing explicit passes: true instruction' };
  }
  
  return { valid: true };
}

function checkForConflictingFiles(dir) {
  const conflicts = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    if (file.startsWith('feature_list') && file.endsWith('.json') && file !== 'feature_list.json') {
      conflicts.push(file);
    }
  }
  
  return conflicts;
}

// Run tests
console.log('\n🔍 Feature Tracking Validation\n');
console.log('='.repeat(50));

let allPassed = true;

for (const repo of REPOS) {
  console.log(`\n📁 ${repo.name}`);
  console.log('-'.repeat(40));
  
  // Test 1: Feature list exists and is valid
  const featureResult = validateFeatureList(repo.featureList);
  if (featureResult.valid) {
    log(`Feature list valid: ${featureResult.passing}/${featureResult.total} (${featureResult.percent}%)`, 'pass');
  } else {
    log(`Feature list invalid: ${featureResult.error}`, 'fail');
    allPassed = false;
    continue;
  }
  
  // Test 2: Prompt references correct file
  if (fs.existsSync(repo.prompt)) {
    const promptResult = validatePrompt(repo.prompt, repo.featureList);
    if (promptResult.valid) {
      log(`Prompt references correct file`, 'pass');
    } else {
      log(`Prompt issue: ${promptResult.error}`, 'fail');
      allPassed = false;
    }
  } else {
    log(`Prompt file not found: ${repo.prompt}`, 'warn');
  }
  
  // Test 3: Check for conflicting feature list files
  const dir = path.dirname(repo.featureList);
  const conflicts = checkForConflictingFiles(dir);
  if (conflicts.length === 0) {
    log(`No conflicting feature list files`, 'pass');
  } else {
    log(`Conflicting files found: ${conflicts.join(', ')}`, 'warn');
  }
}

console.log('\n' + '='.repeat(50));
if (allPassed) {
  log('All validation checks passed!', 'pass');
  process.exit(0);
} else {
  log('Some validation checks failed', 'fail');
  process.exit(1);
}
