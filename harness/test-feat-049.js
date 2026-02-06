#!/usr/bin/env node

/**
 * Test script for feat-049: Parallel Feature Execution Mode
 * Tests all 3 acceptance criteria:
 * 1. Run multiple features simultaneously
 * 2. Resource limiting
 * 3. Conflict detection
 */

const API_BASE = 'http://localhost:3434';
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.log(`  ❌ FAIL: ${message}`);
  }
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  return res.json();
}

async function testAcceptanceCriteria1() {
  console.log('\n📋 AC1: Run multiple features simultaneously');

  // 1. Get config
  const configRes = await fetchJSON(`${API_BASE}/api/parallel-exec/config`);
  assert(configRes.success, 'Can retrieve parallel execution config');
  assert(configRes.data.maxConcurrent >= 1, 'Config has maxConcurrent setting');

  // 2. Save config with 3 concurrent slots
  const saveRes = await fetchJSON(`${API_BASE}/api/parallel-exec/config`, {
    method: 'POST',
    body: JSON.stringify({
      maxConcurrent: 3,
      cpuLimitPercent: 80,
      memoryLimitMb: 4096,
      enableConflictDetection: true,
      autoResolveConflicts: false,
      isolationMode: 'directory'
    })
  });
  assert(saveRes.success, 'Can save parallel execution config');

  // 3. Add features to queue
  const queueRes = await fetchJSON(`${API_BASE}/api/parallel-exec/queue`, {
    method: 'POST',
    body: JSON.stringify({
      features: [
        { featureId: 'feat-050', featureName: 'Custom notification rules', priority: 22 },
        { featureId: 'feat-051', featureName: 'Webhook integrations', priority: 23 },
        { featureId: 'feat-052', featureName: 'API rate limiting', priority: 24 },
        { featureId: 'feat-053', featureName: 'Plugin system', priority: 25 }
      ]
    })
  });
  assert(queueRes.success, 'Can add features to execution queue');
  assert(queueRes.data.queueLength === 4, 'Queue has 4 features');

  // 4. Start parallel execution
  const startRes = await fetchJSON(`${API_BASE}/api/parallel-exec/start`, {
    method: 'POST',
    body: JSON.stringify({
      config: {
        maxConcurrent: 3,
        cpuLimitPercent: 80,
        memoryLimitMb: 4096,
        enableConflictDetection: true,
        autoResolveConflicts: false,
        isolationMode: 'directory'
      }
    })
  });
  assert(startRes.success, 'Can start parallel execution');
  assert(startRes.data.slotsActivated >= 1, 'At least 1 slot activated');
  assert(startRes.data.slotsActivated <= 3, 'Respects max concurrent limit (<=3 activated)');

  // 5. Check status shows multiple running slots
  const statusRes = await fetchJSON(`${API_BASE}/api/parallel-exec/status`);
  assert(statusRes.success, 'Can get execution status');
  const runningSlots = statusRes.data.slots.filter(s => s.status === 'running');
  assert(runningSlots.length >= 2, `Multiple features running simultaneously (${runningSlots.length} running)`);
  assert(runningSlots.length <= 3, `Respects max concurrent (${runningSlots.length} <= 3)`);

  // 6. Verify each running slot has feature info
  for (const slot of runningSlots) {
    assert(!!slot.featureId, `Slot has featureId: ${slot.featureId}`);
    assert(!!slot.startTime, `Slot has startTime`);
    assert(!!slot.pid, `Slot has PID: ${slot.pid}`);
  }

  // 7. Verify queue has remaining items
  const remainingQueue = statusRes.data.queue;
  assert(remainingQueue.length >= 1, `Queue has remaining items (${remainingQueue.length})`);

  // 8. Stop a specific slot
  const stopSlotRes = await fetchJSON(`${API_BASE}/api/parallel-exec/stop-slot`, {
    method: 'POST',
    body: JSON.stringify({ slotIndex: 0 })
  });
  assert(stopSlotRes.success, 'Can stop a specific slot');

  // 9. Verify slot was stopped
  const statusAfterStop = await fetchJSON(`${API_BASE}/api/parallel-exec/status`);
  const stoppedSlot = statusAfterStop.data.slots[0];
  assert(stoppedSlot.status === 'stopped', 'Slot was stopped successfully');

  // 10. Stop all
  const stopAllRes = await fetchJSON(`${API_BASE}/api/parallel-exec/stop`, { method: 'POST' });
  assert(stopAllRes.success, 'Can stop all execution');
}

async function testAcceptanceCriteria2() {
  console.log('\n📋 AC2: Resource limiting');

  // Reset state
  await fetchJSON(`${API_BASE}/api/parallel-exec/queue`, { method: 'DELETE' });

  // 1. Config has resource limits
  const configRes = await fetchJSON(`${API_BASE}/api/parallel-exec/config`);
  assert(configRes.data.cpuLimitPercent > 0, `CPU limit configured: ${configRes.data.cpuLimitPercent}%`);
  assert(configRes.data.memoryLimitMb > 0, `Memory limit configured: ${configRes.data.memoryLimitMb}MB`);
  assert(configRes.data.maxConcurrent >= 1, `Max concurrent slots: ${configRes.data.maxConcurrent}`);

  // 2. Update resource limits
  const newConfig = {
    ...configRes.data,
    maxConcurrent: 2,
    cpuLimitPercent: 60,
    memoryLimitMb: 2048
  };
  const saveRes = await fetchJSON(`${API_BASE}/api/parallel-exec/config`, {
    method: 'POST',
    body: JSON.stringify(newConfig)
  });
  assert(saveRes.success, 'Can update resource limits');

  // 3. Verify limits are enforced in status
  const statusRes = await fetchJSON(`${API_BASE}/api/parallel-exec/status`);
  assert(statusRes.data.resources !== undefined, 'Status includes resource usage data');
  assert(typeof statusRes.data.resources.cpu === 'number', 'CPU usage is tracked');
  assert(typeof statusRes.data.resources.memory === 'number', 'Memory usage is tracked');
  assert(typeof statusRes.data.resources.activeSlots === 'number', 'Active slots tracked');

  // 4. Generate demo data with resource warning
  const demoRes = await fetchJSON(`${API_BASE}/api/parallel-exec/demo`, { method: 'POST' });
  assert(demoRes.success, 'Demo data generated');

  const demoStatus = await fetchJSON(`${API_BASE}/api/parallel-exec/status`);
  assert(demoStatus.data.resources.cpu > 0, `CPU usage reported: ${demoStatus.data.resources.cpu}%`);
  assert(demoStatus.data.resources.memory > 0, `Memory usage reported: ${demoStatus.data.resources.memory}MB`);

  // 5. Check that log contains resource_limit events
  const hasResourceEvent = demoStatus.data.log.some(e => e.type === 'resource_limit');
  assert(hasResourceEvent, 'Log contains resource_limit events');

  // 6. Verify maxConcurrent is enforced during start
  // Clear state and set maxConcurrent to 2
  await fetchJSON(`${API_BASE}/api/parallel-exec/queue`, { method: 'DELETE' });
  await fetchJSON(`${API_BASE}/api/parallel-exec/stop`, { method: 'POST' });

  // Reset state file
  const resetState = {
    slots: [],
    queue: [],
    conflicts: [],
    log: [],
    resources: { cpu: 0, memory: 0, activeSlots: 0 }
  };
  // Set via demo clear and re-add
  await fetch(`${API_BASE}/api/parallel-exec/log`, { method: 'DELETE' });

  // Add 5 features to queue
  await fetchJSON(`${API_BASE}/api/parallel-exec/queue`, {
    method: 'POST',
    body: JSON.stringify({
      features: [
        { featureId: 'feat-060', featureName: 'Feature A', priority: 1 },
        { featureId: 'feat-061', featureName: 'Feature B', priority: 2 },
        { featureId: 'feat-062', featureName: 'Feature C', priority: 3 },
        { featureId: 'feat-063', featureName: 'Feature D', priority: 4 },
        { featureId: 'feat-064', featureName: 'Feature E', priority: 5 }
      ]
    })
  });

  // Start with maxConcurrent=2
  const limitedStart = await fetchJSON(`${API_BASE}/api/parallel-exec/start`, {
    method: 'POST',
    body: JSON.stringify({
      config: { ...newConfig, maxConcurrent: 2 }
    })
  });
  assert(limitedStart.success, 'Started with limited slots');
  assert(limitedStart.data.slotsActivated <= 2, `Max concurrent enforced: ${limitedStart.data.slotsActivated} <= 2`);

  // Clean up
  await fetchJSON(`${API_BASE}/api/parallel-exec/stop`, { method: 'POST' });
}

async function testAcceptanceCriteria3() {
  console.log('\n📋 AC3: Conflict detection');

  // 1. Generate demo data which includes conflicts
  const demoRes = await fetchJSON(`${API_BASE}/api/parallel-exec/demo`, { method: 'POST' });
  assert(demoRes.success, 'Demo data with conflicts generated');

  // 2. Get status and check for conflicts
  const statusRes = await fetchJSON(`${API_BASE}/api/parallel-exec/status`);
  assert(statusRes.data.conflicts.length > 0, `Conflicts detected: ${statusRes.data.conflicts.length}`);

  const conflict = statusRes.data.conflicts[0];
  assert(!!conflict.id, 'Conflict has ID');
  assert(!!conflict.type, `Conflict has type: ${conflict.type}`);
  assert(!!conflict.severity, `Conflict has severity: ${conflict.severity}`);
  assert(Array.isArray(conflict.features) && conflict.features.length >= 2, `Conflict involves multiple features: ${conflict.features.join(', ')}`);
  assert(Array.isArray(conflict.files) && conflict.files.length > 0, `Conflict lists affected files: ${conflict.files.join(', ')}`);
  assert(!!conflict.detectedAt, 'Conflict has detection timestamp');

  // 3. Resolve a conflict
  const resolveRes = await fetchJSON(`${API_BASE}/api/parallel-exec/resolve-conflict`, {
    method: 'POST',
    body: JSON.stringify({
      conflictId: conflict.id,
      resolution: 'merge'
    })
  });
  assert(resolveRes.success, 'Can resolve conflict');

  // 4. Verify conflict was resolved
  const afterResolve = await fetchJSON(`${API_BASE}/api/parallel-exec/status`);
  const stillUnresolved = afterResolve.data.conflicts.filter(c => c.id === conflict.id);
  assert(stillUnresolved.length === 0, 'Resolved conflict removed from active list');

  // 5. Check log has conflict-related events
  const conflictEvents = afterResolve.data.log.filter(e => e.type === 'conflict' || e.type === 'resolved');
  assert(conflictEvents.length > 0, `Log contains conflict events (${conflictEvents.length})`);

  // 6. Test conflict detection is configurable
  const configOff = await fetchJSON(`${API_BASE}/api/parallel-exec/config`, {
    method: 'POST',
    body: JSON.stringify({
      maxConcurrent: 3,
      cpuLimitPercent: 80,
      memoryLimitMb: 4096,
      enableConflictDetection: false,
      autoResolveConflicts: false,
      isolationMode: 'directory'
    })
  });
  assert(configOff.success, 'Can disable conflict detection');

  // Re-enable
  await fetchJSON(`${API_BASE}/api/parallel-exec/config`, {
    method: 'POST',
    body: JSON.stringify({
      maxConcurrent: 3,
      cpuLimitPercent: 80,
      memoryLimitMb: 4096,
      enableConflictDetection: true,
      autoResolveConflicts: false,
      isolationMode: 'directory'
    })
  });

  // 7. Test auto-resolve config
  const configAuto = await fetchJSON(`${API_BASE}/api/parallel-exec/config`, {
    method: 'POST',
    body: JSON.stringify({
      maxConcurrent: 3,
      cpuLimitPercent: 80,
      memoryLimitMb: 4096,
      enableConflictDetection: true,
      autoResolveConflicts: true,
      isolationMode: 'directory'
    })
  });
  assert(configAuto.success, 'Can enable auto-resolve conflicts');

  // 8. Test different resolution strategies
  // Generate fresh demo
  await fetchJSON(`${API_BASE}/api/parallel-exec/demo`, { method: 'POST' });
  const freshStatus = await fetchJSON(`${API_BASE}/api/parallel-exec/status`);

  if (freshStatus.data.conflicts.length > 0) {
    const testConflict = freshStatus.data.conflicts[0];

    // Test 'pause' resolution
    const pauseRes = await fetchJSON(`${API_BASE}/api/parallel-exec/resolve-conflict`, {
      method: 'POST',
      body: JSON.stringify({ conflictId: testConflict.id, resolution: 'pause' })
    });
    assert(pauseRes.success, 'Can resolve with pause strategy');
  }

  // 9. Verify isolation mode options
  for (const mode of ['directory', 'branch', 'container']) {
    const modeRes = await fetchJSON(`${API_BASE}/api/parallel-exec/config`, {
      method: 'POST',
      body: JSON.stringify({
        maxConcurrent: 3,
        cpuLimitPercent: 80,
        memoryLimitMb: 4096,
        enableConflictDetection: true,
        autoResolveConflicts: false,
        isolationMode: mode
      })
    });
    assert(modeRes.success, `Isolation mode '${mode}' configurable`);
  }
}

async function testDashboardWidget() {
  console.log('\n📋 Dashboard Widget Tests');

  // Test that the frontend serves the widget files
  const htmlRes = await fetch('http://localhost:3000/index.html');
  const html = await htmlRes.text();
  assert(html.includes('parallel-exec-widget'), 'Widget container in index.html');
  assert(html.includes('parallel-exec.js'), 'Widget script tag in index.html');

  // Test that the JS file is accessible
  const jsRes = await fetch('http://localhost:3000/parallel-exec.js');
  assert(jsRes.ok, 'parallel-exec.js is accessible');
  const jsContent = await jsRes.text();
  assert(jsContent.includes('class ParallelExec'), 'Widget class defined');
  assert(jsContent.includes('parallel-exec-widget'), 'Widget targets correct container');
  assert(jsContent.includes('startParallel'), 'Has startParallel method');
  assert(jsContent.includes('stopAll'), 'Has stopAll method');
  assert(jsContent.includes('loadStatus'), 'Has loadStatus method');
  assert(jsContent.includes('detectConflict') || jsContent.includes('resolveConflict'), 'Has conflict handling');
  assert(jsContent.includes('loadConfig'), 'Has loadConfig method');
  assert(jsContent.includes('saveConfig'), 'Has saveConfig method');

  // Test CSS is included
  const cssRes = await fetch('http://localhost:3000/index.css');
  const css = await cssRes.text();
  assert(css.includes('.pe-widget'), 'CSS has pe-widget class');
  assert(css.includes('.pe-slot-card'), 'CSS has slot card styles');
  assert(css.includes('.pe-conflict-item'), 'CSS has conflict item styles');
  assert(css.includes('.pe-progress-bar'), 'CSS has progress bar styles');
  assert(css.includes('.pe-resource-bars'), 'CSS has resource bars styles');
}

async function runTests() {
  console.log('🧪 Testing feat-049: Parallel Feature Execution Mode');
  console.log('====================================================\n');

  try {
    await testAcceptanceCriteria1();
    await testAcceptanceCriteria2();
    await testAcceptanceCriteria3();
    await testDashboardWidget();
  } catch (e) {
    console.error(`\n❌ Test error: ${e.message}`);
    console.error(e.stack);
    failed++;
  }

  console.log(`\n====================================================`);
  console.log(`Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log(`====================================================`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
