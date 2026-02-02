#!/usr/bin/env node

/**
 * Model Configuration Tests
 * =========================
 * 
 * Tests for the target-independent model complexity system.
 * Run: node test-model-config.js
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let testsPassed = 0;
let testsFailed = 0;

function log(message, type = 'info') {
  const prefix = {
    info: '📋',
    pass: '✅',
    fail: '❌',
    test: '🧪',
  }[type] || '•';
  console.log(`${prefix} ${message}`);
}

async function runTest(name, fn) {
  log(`Testing: ${name}`, 'test');
  try {
    await fn();
    log(`PASS: ${name}`, 'pass');
    testsPassed++;
  } catch (error) {
    log(`FAIL: ${name} - ${error.message}`, 'fail');
    testsFailed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertTruthy(value, message) {
  if (!value) {
    throw new Error(`${message}: expected truthy value, got ${value}`);
  }
}

function assertIncludes(arr, value, message) {
  if (!arr.includes(value)) {
    throw new Error(`${message}: ${value} not in [${arr.join(', ')}]`);
  }
}

// Load queue config
function loadQueueConfig() {
  const queuePath = path.join(__dirname, 'repo-queue.json');
  return JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
}

// Simulate getModelForComplexity from run-queue.js
function getModelForComplexity(queue, complexity, taskType = null) {
  const config = queue.modelConfig || {};
  const levels = config.complexityLevels || {
    critical: { models: ['opus', 'sonnet'], fallback: 'sonnet' },
    high: { models: ['sonnet', 'opus'], fallback: 'haiku' },
    medium: { models: ['sonnet', 'haiku'], fallback: 'haiku' },
    low: { models: ['haiku'], fallback: 'haiku' },
    trivial: { models: ['haiku'], fallback: 'haiku' }
  };
  
  let effectiveComplexity = complexity;
  if (taskType && config.taskTypeMapping) {
    effectiveComplexity = config.taskTypeMapping[taskType] || complexity;
  }
  
  if (!effectiveComplexity) {
    effectiveComplexity = config.defaultComplexity || 'medium';
  }
  
  const level = levels[effectiveComplexity] || levels.medium;
  return { 
    model: level.models[0] || 'haiku',
    complexity: effectiveComplexity,
    maxRetries: level.maxRetries || 3,
    fallback: level.fallback || 'haiku'
  };
}

// Simulate detectTaskType from run-queue.js
function detectTaskType(feature, focus) {
  const text = `${feature || ''} ${focus || ''}`.toLowerCase();
  
  if (text.includes('architect') || text.includes('system design')) return 'architecture';
  if (text.includes('security') || text.includes('auth')) return 'security';
  if (text.includes('api') || text.includes('integration')) return 'api_integration';
  if (text.includes('database') || text.includes('migration') || text.includes('schema')) return 'database';
  if (text.includes('new feature') || text.includes('implement')) return 'new_feature';
  if (text.includes('ui') || text.includes('component') || text.includes('frontend')) return 'ui_component';
  if (text.includes('refactor') || text.includes('cleanup')) return 'refactor';
  if (text.includes('test') || text.includes('spec')) return 'test';
  if (text.includes('bug') || text.includes('fix')) return 'bug_fix';
  if (text.includes('doc') || text.includes('readme')) return 'documentation';
  
  return null;
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('Model Configuration Tests');
  console.log('========================================\n');

  const queue = loadQueueConfig();

  // Test 1: Config structure
  await runTest('Queue config has modelConfig', async () => {
    assertTruthy(queue.modelConfig, 'modelConfig should exist');
    assertTruthy(queue.modelConfig.availableModels, 'availableModels should exist');
    assertTruthy(queue.modelConfig.complexityLevels, 'complexityLevels should exist');
    assertTruthy(queue.modelConfig.taskTypeMapping, 'taskTypeMapping should exist');
  });

  // Test 2: Available models
  await runTest('All Claude models defined', async () => {
    const models = queue.modelConfig.availableModels;
    assertTruthy(models.opus, 'opus should exist');
    assertTruthy(models.sonnet, 'sonnet should exist');
    assertTruthy(models.haiku, 'haiku should exist');
    assertEqual(models.opus.tier, 1, 'opus should be tier 1');
    assertEqual(models.sonnet.tier, 2, 'sonnet should be tier 2');
    assertEqual(models.haiku.tier, 3, 'haiku should be tier 3');
  });

  // Test 3: All complexity levels exist
  await runTest('All 5 complexity levels defined', async () => {
    const levels = queue.modelConfig.complexityLevels;
    assertTruthy(levels.critical, 'critical level should exist');
    assertTruthy(levels.high, 'high level should exist');
    assertTruthy(levels.medium, 'medium level should exist');
    assertTruthy(levels.low, 'low level should exist');
    assertTruthy(levels.trivial, 'trivial level should exist');
  });

  // Test 4: Critical complexity uses opus
  await runTest('Critical complexity selects opus', async () => {
    const result = getModelForComplexity(queue, 'critical');
    assertEqual(result.model, 'opus', 'Critical should use opus');
    assertEqual(result.fallback, 'sonnet', 'Critical fallback should be sonnet');
    assertEqual(result.maxRetries, 5, 'Critical should have 5 retries');
  });

  // Test 5: High complexity uses sonnet
  await runTest('High complexity selects sonnet', async () => {
    const result = getModelForComplexity(queue, 'high');
    assertEqual(result.model, 'sonnet', 'High should use sonnet');
    assertEqual(result.fallback, 'haiku', 'High fallback should be haiku');
  });

  // Test 6: Low complexity uses haiku
  await runTest('Low complexity selects haiku', async () => {
    const result = getModelForComplexity(queue, 'low');
    assertEqual(result.model, 'haiku', 'Low should use haiku');
    assertEqual(result.maxRetries, 2, 'Low should have 2 retries');
  });

  // Test 7: Task type detection - architecture
  await runTest('Task type detection - architecture', async () => {
    const taskType = detectTaskType(null, 'system architecture design');
    assertEqual(taskType, 'architecture', 'Should detect architecture');
    
    const result = getModelForComplexity(queue, null, taskType);
    assertEqual(result.complexity, 'critical', 'Architecture should map to critical');
    assertEqual(result.model, 'opus', 'Architecture should use opus');
  });

  // Test 8: Task type detection - security
  await runTest('Task type detection - security', async () => {
    const taskType = detectTaskType('Implement auth system', null);
    assertEqual(taskType, 'security', 'Should detect security');
    
    const result = getModelForComplexity(queue, null, taskType);
    assertEqual(result.complexity, 'critical', 'Security should map to critical');
  });

  // Test 9: Task type detection - bug fix
  await runTest('Task type detection - bug fix', async () => {
    const taskType = detectTaskType('Fix login bug', null);
    assertEqual(taskType, 'bug_fix', 'Should detect bug_fix');
    
    const result = getModelForComplexity(queue, null, taskType);
    assertEqual(result.complexity, 'low', 'Bug fix should map to low');
    assertEqual(result.model, 'haiku', 'Bug fix should use haiku');
  });

  // Test 10: Task type detection - documentation
  await runTest('Task type detection - documentation', async () => {
    const taskType = detectTaskType('Update README', null);
    assertEqual(taskType, 'documentation', 'Should detect documentation');
    
    const result = getModelForComplexity(queue, null, taskType);
    assertEqual(result.complexity, 'low', 'Documentation should map to low');
  });

  // Test 11: Task type detection - API integration
  await runTest('Task type detection - API integration', async () => {
    const taskType = detectTaskType('API integration with Stripe', null);
    assertEqual(taskType, 'api_integration', 'Should detect api_integration');
    
    const result = getModelForComplexity(queue, null, taskType);
    assertEqual(result.complexity, 'high', 'API integration should map to high');
  });

  // Test 12: Default complexity
  await runTest('Default complexity is medium', async () => {
    assertEqual(queue.modelConfig.defaultComplexity, 'medium', 'Default should be medium');
    
    const result = getModelForComplexity(queue, null, null);
    assertEqual(result.complexity, 'medium', 'No complexity should default to medium');
    assertEqual(result.model, 'sonnet', 'Medium should use sonnet');
  });

  // Test 13: Task type mapping completeness
  await runTest('Task type mapping covers all types', async () => {
    const mapping = queue.modelConfig.taskTypeMapping;
    const expectedTypes = [
      'architecture', 'security', 'api_integration', 'database',
      'new_feature', 'ui_component', 'refactor', 'test',
      'bug_fix', 'documentation', 'formatting', 'comments'
    ];
    
    for (const type of expectedTypes) {
      assertTruthy(mapping[type], `Mapping for ${type} should exist`);
    }
  });

  // Test 14: Repos have complexity defined
  await runTest('Repos have complexity field', async () => {
    const reposWithComplexity = queue.repos.filter(r => r.complexity);
    assertTruthy(reposWithComplexity.length > 0, 'At least some repos should have complexity');
    log(`  ${reposWithComplexity.length}/${queue.repos.length} repos have complexity defined`, 'info');
  });

  // Results
  console.log('\n========================================');
  console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('========================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
