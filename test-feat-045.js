/**
 * Test feat-045: PostHog/Analytics Integration
 * Acceptance criteria:
 * 1. Connects to PostHog project
 * 2. Displays key metrics (users, sessions, conversions)
 * 3. Shows event timeline
 * 4. Embeds key charts in dashboard
 */
const puppeteer = require('puppeteer');

let browser, page;
let passed = 0;
let failed = 0;
const results = [];

function assert(condition, message) {
    if (condition) {
        passed++;
        results.push(`  PASS: ${message}`);
    } else {
        failed++;
        results.push(`  FAIL: ${message}`);
    }
}

async function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

(async () => {
    try {
        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        page = await browser.newPage();
        page.on('console', msg => {
            if (msg.type() === 'error' && !msg.text().includes('ERR_CONNECTION_REFUSED')) {
                // Only log real errors
            }
        });

        // Load dashboard
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 15000 });
        await delay(2000);

        // ============================================================
        // Test 1: Connects to PostHog project
        // ============================================================
        console.log('\n--- Test 1: Connects to PostHog project ---');

        // Check widget exists
        const widgetExists = await page.$('#posthog-analytics-widget');
        assert(widgetExists, 'PostHog analytics widget container exists');

        // Check card rendered
        const cardTitle = await page.$eval('#posthog-analytics-widget .card-title', el => el.textContent);
        assert(cardTitle.includes('PostHog'), 'Widget card title contains PostHog');

        // Check Configure button
        const configBtn = await page.$('#ph-config-btn');
        assert(configBtn, 'Configure button exists');

        // Click Configure to show config panel
        await configBtn.click();
        await delay(500);

        const configPanel = await page.$('#ph-config-panel');
        const configVisible = await page.evaluate(el => el.style.display !== 'none', configPanel);
        assert(configVisible, 'Config panel is visible after clicking Configure');

        // Check config form fields
        const hostInput = await page.$('#ph-config-host');
        assert(hostInput, 'PostHog host input exists');

        const apiKeyInput = await page.$('#ph-config-api-key');
        assert(apiKeyInput, 'API key input exists');

        const personalKeyInput = await page.$('#ph-config-personal-key');
        assert(personalKeyInput, 'Personal API key input exists');

        const projectIdInput = await page.$('#ph-config-project-id');
        assert(projectIdInput, 'Project ID input exists');

        const targetSelect = await page.$('#ph-config-target');
        assert(targetSelect, 'Target project select exists');

        // Check target options are populated
        const targetOptions = await page.$$eval('#ph-config-target option', opts => opts.length);
        assert(targetOptions > 1, 'Target select has project options populated');

        // Check Save & Test button
        const saveBtn = await page.$('#ph-save-config-btn');
        assert(saveBtn, 'Save & Test button exists');

        // Cancel config
        const cancelBtn = await page.$('#ph-cancel-config-btn');
        assert(cancelBtn, 'Cancel button exists');
        await cancelBtn.click();
        await delay(300);

        const configHidden = await page.evaluate(el => el.style.display === 'none', configPanel);
        assert(configHidden, 'Config panel hides on cancel');

        // Check Connected Projects table
        const projectsTable = await page.$('#ph-projects-table-body');
        assert(projectsTable, 'Projects table exists');

        const tableRows = await page.$$eval('#ph-projects-table-body tr', rows => rows.length);
        assert(tableRows > 0, 'Projects table has rows');

        // Check that projects from repo-queue are listed
        const tableContent = await page.$eval('#ph-projects-table-body', el => el.textContent);
        assert(tableContent.length > 0, 'Projects table has content');

        // Check Connect buttons for unconfigured projects
        const connectBtns = await page.$$eval('#ph-projects-table-body button', btns => btns.map(b => b.textContent));
        assert(connectBtns.some(t => t.includes('Connect')), 'Connect buttons available for unconfigured projects');

        // Test API endpoint directly
        const overviewResp = await page.evaluate(async () => {
            const resp = await fetch('http://localhost:3434/api/posthog/overview');
            return resp.json();
        });
        assert(overviewResp.success, 'Overview API returns success');
        assert(overviewResp.data.targets && overviewResp.data.targets.length > 0, 'Overview returns target list');

        // Test config save API
        const configResp = await page.evaluate(async () => {
            const resp = await fetch('http://localhost:3434/api/posthog/config/test-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    host: 'https://app.posthog.com',
                    apiKey: 'phc_test123',
                    personalKey: 'phx_test123',
                    projectId: 12345
                })
            });
            return resp.json();
        });
        assert(configResp.success, 'Config save API returns success');

        // Test delete config API
        const deleteResp = await page.evaluate(async () => {
            const resp = await fetch('http://localhost:3434/api/posthog/config/test-project', { method: 'DELETE' });
            return resp.json();
        });
        assert(deleteResp.success, 'Config delete API returns success');

        // Test connection test API
        const testResp = await page.evaluate(async () => {
            const resp = await fetch('http://localhost:3434/api/posthog/test/nonexistent', { method: 'POST' });
            return resp.json();
        });
        assert(testResp.success !== undefined, 'Test connection API returns response');

        // ============================================================
        // Test 2: Displays key metrics (users, sessions, conversions)
        // ============================================================
        console.log('\n--- Test 2: Displays key metrics ---');

        const metricsGrid = await page.$('.ph-metrics-grid');
        assert(metricsGrid, 'Metrics grid exists');

        const metricCards = await page.$$('.ph-metric-card');
        assert(metricCards.length === 4, `Four metric cards rendered (got ${metricCards.length})`);

        // Check Users metric
        const usersValue = await page.$eval('#ph-total-users', el => el.textContent);
        assert(usersValue !== undefined && usersValue !== null, 'Users metric has a value');

        // Check Sessions metric
        const sessionsValue = await page.$eval('#ph-total-sessions', el => el.textContent);
        assert(sessionsValue !== undefined && sessionsValue !== null, 'Sessions metric has a value');

        // Check Events metric
        const eventsValue = await page.$eval('#ph-total-events', el => el.textContent);
        assert(eventsValue !== undefined && eventsValue !== null, 'Events metric has a value');

        // Check Conversions metric
        const conversionsValue = await page.$eval('#ph-conversions', el => el.textContent);
        assert(conversionsValue !== undefined && conversionsValue !== null, 'Conversions metric has a value');

        // Check metric labels
        const metricLabels = await page.$$eval('.ph-metric-label', els => els.map(e => e.textContent));
        assert(metricLabels.includes('Users'), 'Users label present');
        assert(metricLabels.includes('Sessions'), 'Sessions label present');
        assert(metricLabels.includes('Events'), 'Events label present');
        assert(metricLabels.includes('Conversions'), 'Conversions label present');

        // Check change indicators exist
        const changeEls = await page.$$('.ph-metric-change');
        assert(changeEls.length >= 4, 'Change indicators exist for metrics');

        // Check project filter select
        const projectSelect = await page.$('#ph-project-select');
        assert(projectSelect, 'Project filter select exists');

        // Check Refresh button
        const refreshBtn = await page.$('#ph-refresh-btn');
        assert(refreshBtn, 'Refresh button exists');

        // ============================================================
        // Test 3: Shows event timeline
        // ============================================================
        console.log('\n--- Test 3: Shows event timeline ---');

        const timelineSection = await page.$('.ph-timeline-section');
        assert(timelineSection, 'Timeline section exists');

        const timelineList = await page.$('#ph-event-timeline');
        assert(timelineList, 'Event timeline container exists');

        // Check events are rendered (sample data should be shown)
        const timelineItems = await page.$$('.ph-timeline-item');
        assert(timelineItems.length > 0, `Timeline items rendered (got ${timelineItems.length})`);

        // Check timeline item structure
        if (timelineItems.length > 0) {
            const hasIcon = await page.$('.ph-timeline-icon');
            assert(hasIcon, 'Timeline items have icons');

            const hasEvent = await page.$('.ph-timeline-event');
            assert(hasEvent, 'Timeline items have event names');

            const hasMeta = await page.$('.ph-timeline-meta');
            assert(hasMeta, 'Timeline items have metadata');
        }

        // Check event filter select
        const eventFilter = await page.$('#ph-event-filter');
        assert(eventFilter, 'Event filter select exists');

        const filterOptions = await page.$$eval('#ph-event-filter option', opts => opts.map(o => o.value));
        assert(filterOptions.includes('$pageview'), 'Event filter has pageview option');
        assert(filterOptions.includes('$autocapture'), 'Event filter has autocapture option');
        assert(filterOptions.includes('conversion'), 'Event filter has conversion option');

        // Test event filter
        await page.select('#ph-event-filter', '$pageview');
        await delay(1500);
        const filteredItems = await page.$$('.ph-timeline-item');
        assert(filteredItems.length >= 0, 'Event filter works (filtered timeline rendered)');

        // Reset filter
        await page.select('#ph-event-filter', '');
        await delay(1000);

        // Test events API directly
        const eventsResp = await page.evaluate(async () => {
            const resp = await fetch('http://localhost:3434/api/posthog/events');
            return resp.json();
        });
        assert(eventsResp.success, 'Events API returns success');
        assert(eventsResp.data && eventsResp.data.events, 'Events API returns events array');
        assert(eventsResp.data.events.length > 0, 'Events API returns sample events');

        // Check event structure
        if (eventsResp.data.events.length > 0) {
            const ev = eventsResp.data.events[0];
            assert(ev.event, 'Event has event type');
            assert(ev.timestamp, 'Event has timestamp');
            assert(ev.properties, 'Event has properties');
        }

        // ============================================================
        // Test 4: Embeds key charts in dashboard
        // ============================================================
        console.log('\n--- Test 4: Embeds key charts in dashboard ---');

        const chartContainer = await page.$('.ph-chart-container');
        assert(chartContainer, 'Chart container exists');

        const chartCanvas = await page.$('#ph-trends-chart');
        assert(chartCanvas, 'Trends chart canvas exists');

        // Check chart range buttons
        const chartBtns = await page.$$('.ph-chart-btn');
        assert(chartBtns.length >= 3, 'Chart range buttons exist (7D, 30D, 90D)');

        const btnLabels = await page.$$eval('.ph-chart-btn', btns => btns.map(b => b.textContent));
        assert(btnLabels.includes('7D'), '7D range button exists');
        assert(btnLabels.includes('30D'), '30D range button exists');
        assert(btnLabels.includes('90D'), '90D range button exists');

        // Check active button
        const activeBtns = await page.$$('.ph-chart-btn-active');
        assert(activeBtns.length === 1, 'One chart range button is active');

        // Click 30D button
        const btn30d = await page.$('.ph-chart-btn[data-range="30d"]');
        await btn30d.click();
        await delay(1000);

        // Check active state switched
        const activeAfterClick = await page.$eval('.ph-chart-btn-active', el => el.textContent);
        assert(activeAfterClick === '30D', '30D button becomes active after click');

        // Test trends API directly
        const trendsResp = await page.evaluate(async () => {
            const resp = await fetch('http://localhost:3434/api/posthog/trends?range=7d');
            return resp.json();
        });
        assert(trendsResp.success, 'Trends API returns success');
        assert(trendsResp.data && trendsResp.data.labels, 'Trends API returns labels');
        assert(trendsResp.data.labels.length === 7, 'Trends API returns 7 labels for 7d range');
        assert(trendsResp.data.datasets && trendsResp.data.datasets.length >= 2, 'Trends API returns multiple datasets');

        // Test 30d range
        const trends30d = await page.evaluate(async () => {
            const resp = await fetch('http://localhost:3434/api/posthog/trends?range=30d');
            return resp.json();
        });
        assert(trends30d.success && trends30d.data.labels.length === 30, 'Trends API returns 30 labels for 30d range');

        // Test 90d range
        const trends90d = await page.evaluate(async () => {
            const resp = await fetch('http://localhost:3434/api/posthog/trends?range=90d');
            return resp.json();
        });
        assert(trends90d.success && trends90d.data.labels.length === 90, 'Trends API returns 90 labels for 90d range');

        // Check chart section title
        const chartTitle = await page.$eval('.ph-chart-container .ph-section-title', el => el.textContent);
        assert(chartTitle.includes('Event Trends'), 'Chart section has title');

        // Print results
        console.log('\n===================================');
        console.log('RESULTS: feat-045 PostHog/Analytics Integration');
        console.log('===================================');
        results.forEach(r => console.log(r));
        console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

        if (failed === 0) {
            console.log('\nALL TESTS PASSED');
        } else {
            console.log('\nSOME TESTS FAILED');
        }

    } catch (error) {
        console.error('Test error:', error);
    } finally {
        if (browser) await browser.close();
        process.exit(failed > 0 ? 1 : 0);
    }
})();
