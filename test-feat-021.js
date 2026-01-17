/**
 * Test feat-021: Custom prompt editor
 *
 * Acceptance Criteria:
 * 1. Can view current prompts
 * 2. Can edit initializer and coding prompts
 * 3. Changes are saved to prompt files
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testFeature() {
    console.log('🧪 Testing feat-021: Custom prompt editor\n');

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1440, height: 900 }
        });

        const page = await browser.newPage();

        // Navigate to dashboard
        console.log('📝 Step 1: Navigate to dashboard...');
        await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle2' });
        await page.waitForSelector('#prompts-btn', { timeout: 5000 });
        console.log('✓ Dashboard loaded\n');

        // ===== Test 1: Can view current prompts =====
        console.log('🔍 Test 1: Viewing current prompts...');

        // Click prompts button
        await page.click('#prompts-btn');
        await page.waitForSelector('#prompts-modal', { visible: true, timeout: 3000 });
        console.log('✓ Prompts modal opened');

        // Wait for prompts to load
        await page.waitForTimeout(1000);

        // Check that initializer prompt is loaded
        const initializerPrompt = await page.$eval('#initializer-prompt', el => el.value);
        if (initializerPrompt.length > 0 && initializerPrompt.includes('INITIALIZER AGENT')) {
            console.log('✓ Initializer prompt loaded successfully');
        } else {
            throw new Error('Initializer prompt not loaded properly');
        }

        // Switch to coding tab
        console.log('📝 Switching to coding tab...');
        const codingTab = await page.waitForSelector('.prompt-tab:nth-child(2)', { visible: true });
        await codingTab.click();
        await page.waitForTimeout(500);

        // Check that coding prompt is loaded
        const codingPromptPanel = await page.$('#coding-prompt-panel');
        const isVisible = await page.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none';
        }, codingPromptPanel);

        if (isVisible) {
            console.log('✓ Coding tab switched successfully');
        }

        const codingPrompt = await page.$eval('#coding-prompt', el => el.value);
        if (codingPrompt.length > 0 && codingPrompt.includes('CODING AGENT')) {
            console.log('✓ Coding prompt loaded successfully');
        } else {
            throw new Error('Coding prompt not loaded properly');
        }

        console.log('✅ Test 1 PASSED: Can view current prompts\n');

        // ===== Test 2: Can edit prompts =====
        console.log('🔍 Test 2: Editing prompts...');

        // Edit coding prompt by adding a custom line
        await page.evaluate(() => {
            const textarea = document.getElementById('coding-prompt');
            textarea.value += '\n\n## Custom Note\nThis is a test edit to verify prompt editing works.';
        });

        console.log('✓ Coding prompt edited');

        // Switch back to initializer tab and edit
        const initTab = await page.waitForSelector('.prompt-tab:nth-child(1)', { visible: true });
        await initTab.click();
        await page.waitForTimeout(500);

        await page.evaluate(() => {
            const textarea = document.getElementById('initializer-prompt');
            textarea.value += '\n\n## Test Edit\nThis prompt was edited during testing.';
        });

        console.log('✓ Initializer prompt edited');
        console.log('✅ Test 2 PASSED: Can edit prompts\n');

        // ===== Test 3: Changes are saved to files =====
        console.log('🔍 Test 3: Saving changes to prompt files...');

        // Click save button
        await page.click('#save-prompts-btn');
        await page.waitForTimeout(1500); // Wait for save to complete

        // Check for success message
        const successMsg = await page.$eval('#prompts-validation-message', el => ({
            text: el.textContent,
            visible: el.style.display !== 'none',
            isSuccess: el.classList.contains('success')
        }));

        if (successMsg.visible && successMsg.isSuccess) {
            console.log(`✓ Success message shown: "${successMsg.text}"`);
        }

        // Wait for modal to close
        await page.waitForTimeout(1500);

        // Verify files were saved by checking with backend API
        const initResponse = await page.evaluate(async () => {
            const res = await fetch('http://localhost:3434/api/prompts/initializer');
            return await res.text();
        });

        if (initResponse.includes('Test Edit')) {
            console.log('✓ Initializer prompt saved to file');
        } else {
            throw new Error('Initializer prompt was not saved properly');
        }

        const codingResponse = await page.evaluate(async () => {
            const res = await fetch('http://localhost:3434/api/prompts/coding');
            return await res.text();
        });

        if (codingResponse.includes('Custom Note')) {
            console.log('✓ Coding prompt saved to file');
        } else {
            throw new Error('Coding prompt was not saved properly');
        }

        console.log('✅ Test 3 PASSED: Changes are saved to prompt files\n');

        // Take screenshot
        await page.screenshot({ path: 'test-feat-021-screenshot.png', fullPage: true });
        console.log('📸 Screenshot saved: test-feat-021-screenshot.png\n');

        console.log('🎉 ALL TESTS PASSED! feat-021 is working correctly.\n');
        console.log('Summary:');
        console.log('✅ Can view current prompts');
        console.log('✅ Can edit initializer and coding prompts');
        console.log('✅ Changes are saved to prompt files');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (browser) {
            const page = (await browser.pages())[0];
            if (page) {
                await page.screenshot({ path: 'test-feat-021-error.png', fullPage: true });
                console.log('📸 Error screenshot saved: test-feat-021-error.png');
            }
        }
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
testFeature()
    .then(() => {
        console.log('\n✅ Test completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });
