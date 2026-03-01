/**
 * CF-WC-019: Load test - concurrent users
 *
 * Simulates 50+ concurrent users to verify system stability
 */

import { test, expect } from '@playwright/test';

test.describe('CF-WC-019: Concurrent User Load Testing', () => {
  test('System handles 50 concurrent read requests without errors', async ({ request }) => {
    const concurrentRequests = 50;
    const promises: Promise<any>[] = [];

    const startTime = Date.now();

    // Create 50 concurrent GET requests
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        request.get('/api/cf/dossiers').then((response) => ({
          status: response.status(),
          time: Date.now() - startTime,
        }))
      );
    }

    const results = await Promise.all(promises);
    const endTime = Date.now() - startTime;

    console.log(`\n50 concurrent requests completed in ${endTime}ms`);

    // CF-WC-019 Criteria: No errors
    const successCount = results.filter((r) => r.status === 200).length;
    const errorCount = results.filter((r) => r.status !== 200).length;

    console.log(`  Success: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);

    expect(errorCount, 'All requests should succeed').toBe(0);
    expect(successCount, 'All 50 requests should return 200').toBe(concurrentRequests);
  });

  test('Response times under load are < 2x normal response time', async ({ request }) => {
    // First, get baseline response time
    const baselineStart = Date.now();
    await request.get('/api/cf/dossiers');
    const baselineTime = Date.now() - baselineStart;

    console.log(`\nBaseline response time: ${baselineTime}ms`);

    // Now test under load
    const concurrentRequests = 50;
    const promises: Promise<any>[] = [];
    const loadStartTime = Date.now();

    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        request.get('/api/cf/dossiers').then((response) => {
          const requestTime = Date.now() - loadStartTime;
          return {
            status: response.status(),
            time: requestTime,
          };
        })
      );
    }

    const results = await Promise.all(promises);

    // Calculate average response time under load
    const avgLoadTime =
      results.reduce((sum, r) => sum + r.time, 0) / results.length;

    console.log(`Average response time under load: ${avgLoadTime.toFixed(2)}ms`);
    console.log(`Allowed max (2x baseline): ${(baselineTime * 2).toFixed(2)}ms`);

    // CF-WC-019 Criteria: Response < 2x baseline
    expect(
      avgLoadTime,
      'Average response time should be < 2x baseline'
    ).toBeLessThan(baselineTime * 2);
  });

  test('System handles mixed read/write operations concurrently', async ({ request }) => {
    const concurrentRequests = 30;
    const promises: Promise<any>[] = [];

    const startTime = Date.now();

    // Mix of reads (20) and writes (10)
    for (let i = 0; i < 20; i++) {
      promises.push(
        request.get('/api/cf/dossiers').then((response) => ({
          type: 'read',
          status: response.status(),
        }))
      );
    }

    for (let i = 0; i < 10; i++) {
      promises.push(
        request
          .post('/api/cf/dossiers', {
            data: {
              name: `Load Test Product ${i}`,
              slug: `load-test-${Date.now()}-${i}`,
              category: 'test',
            },
          })
          .then((response) => ({
            type: 'write',
            status: response.status(),
          }))
      );
    }

    const results = await Promise.all(promises);
    const endTime = Date.now() - startTime;

    console.log(`\n30 mixed requests completed in ${endTime}ms`);

    const reads = results.filter((r) => r.type === 'read');
    const writes = results.filter((r) => r.type === 'write');

    const readSuccess = reads.filter((r) => r.status === 200).length;
    const writeSuccess = writes.filter((r) => r.status === 200 || r.status === 201).length;

    console.log(`  Read success: ${readSuccess}/${reads.length}`);
    console.log(`  Write success: ${writeSuccess}/${writes.length}`);

    expect(readSuccess, 'All read requests should succeed').toBe(reads.length);
    expect(writeSuccess, 'Most write requests should succeed').toBeGreaterThanOrEqual(writes.length * 0.9);

    // Clean up test data
    const cleanupPromises = results
      .filter((r) => r.type === 'write' && (r.status === 200 || r.status === 201))
      .map((r, i) =>
        request.delete(`/api/cf/dossiers/load-test-${Date.now()}-${i}`).catch(() => {
          // Ignore cleanup errors
        })
      );

    await Promise.allSettled(cleanupPromises);
  });

  test('No memory leaks under sustained load', async ({ request }) => {
    const iterations = 5;
    const requestsPerIteration = 20;
    const memoryReadings: number[] = [];

    // Get initial memory usage
    const initialMemory = await request.get('/api/health/memory');
    if (initialMemory.status() === 200) {
      const initialData = await initialMemory.json();
      memoryReadings.push(initialData.heapUsed || 0);
    }

    // Run multiple iterations of load
    for (let i = 0; i < iterations; i++) {
      const promises: Promise<any>[] = [];

      for (let j = 0; j < requestsPerIteration; j++) {
        promises.push(request.get('/api/cf/dossiers'));
      }

      await Promise.all(promises);

      // Wait a bit for GC
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check memory
      const memoryResponse = await request.get('/api/health/memory');
      if (memoryResponse.status() === 200) {
        const memoryData = await memoryResponse.json();
        memoryReadings.push(memoryData.heapUsed || 0);
      }
    }

    console.log('\nMemory readings:', memoryReadings);

    if (memoryReadings.length > 1) {
      const initialMem = memoryReadings[0];
      const finalMem = memoryReadings[memoryReadings.length - 1];
      const memoryGrowth = ((finalMem - initialMem) / initialMem) * 100;

      console.log(`Memory growth: ${memoryGrowth.toFixed(2)}%`);

      // CF-WC-019 Criteria: No leaks (< 50% growth is acceptable for cache/buffers)
      expect(
        memoryGrowth,
        'Memory should not grow excessively (indicates no major leaks)'
      ).toBeLessThan(50);
    } else {
      console.log('Health endpoint not available, skipping memory leak check');
    }
  });

  test('System recovers from load spike', async ({ request }) => {
    // Create a sudden spike of 100 requests
    const spikeSize = 100;
    const promises: Promise<any>[] = [];

    console.log(`\nSimulating load spike of ${spikeSize} requests...`);

    const spikeStart = Date.now();

    for (let i = 0; i < spikeSize; i++) {
      promises.push(request.get('/api/cf/dossiers'));
    }

    await Promise.all(promises);

    const spikeEnd = Date.now() - spikeStart;
    console.log(`Spike completed in ${spikeEnd}ms`);

    // Wait for system to settle
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test that normal requests work fine after the spike
    const postSpikeStart = Date.now();
    const postSpikeResponse = await request.get('/api/cf/dossiers');
    const postSpikeTime = Date.now() - postSpikeStart;

    console.log(`Post-spike response time: ${postSpikeTime}ms`);

    expect(postSpikeResponse.status(), 'System should recover after spike').toBe(200);
    expect(
      postSpikeTime,
      'Post-spike response should be reasonable'
    ).toBeLessThan(1000);
  });
});
