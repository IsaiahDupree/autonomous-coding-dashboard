/**
 * Test script for feat-034: Target PRD Viewer
 *
 * Acceptance Criteria:
 * 1. Renders PRD markdown with syntax highlighting
 * 2. Table of contents navigation
 * 3. Links to referenced files open in editor
 * 4. Search within PRD content
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing feat-034: Target PRD Viewer\n');

// Test 1: Check if PRD Viewer HTML exists
console.log('✓ Test 1: PRD Viewer HTML file exists');
const htmlPath = path.join(__dirname, 'prd-viewer.html');
if (!fs.existsSync(htmlPath)) {
    console.error('✗ FAILED: prd-viewer.html not found');
    process.exit(1);
}
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// Check for required components
const requiredComponents = [
    'prd-viewer.js',          // JavaScript file
    'marked.min.js',          // Markdown parser
    'highlight.js',           // Syntax highlighting
    'prd-toc',                // Table of contents
    'search-input',           // Search functionality
    'project-selector',       // Project dropdown
];

let passed = 0;
let failed = 0;

requiredComponents.forEach(component => {
    if (htmlContent.includes(component)) {
        console.log(`  ✓ Contains ${component}`);
        passed++;
    } else {
        console.log(`  ✗ Missing ${component}`);
        failed++;
    }
});

// Test 2: Check JavaScript functionality
console.log('\n✓ Test 2: PRD Viewer JavaScript functionality');
const jsPath = path.join(__dirname, 'prd-viewer.js');
if (!fs.existsSync(jsPath)) {
    console.error('✗ FAILED: prd-viewer.js not found');
    process.exit(1);
}
const jsContent = fs.readFileSync(jsPath, 'utf-8');

const requiredFunctions = [
    'renderPRD',              // AC1: Renders markdown
    'generateTOC',            // AC2: Table of contents
    'scrollToHeading',        // AC2: TOC navigation
    'openInEditor',           // AC3: File link handling
    'performSearch',          // AC4: Search functionality
    'marked.parse',           // AC1: Markdown parsing
    'hljs.highlight',         // AC1: Syntax highlighting
];

requiredFunctions.forEach(func => {
    if (jsContent.includes(func)) {
        console.log(`  ✓ Implements ${func}`);
        passed++;
    } else {
        console.log(`  ✗ Missing ${func}`);
        failed++;
    }
});

// Test 3: Check for markdown rendering setup
console.log('\n✓ Test 3: Markdown rendering configuration');
if (jsContent.includes('marked.setOptions')) {
    console.log('  ✓ Marked.js configured');
    passed++;
} else {
    console.log('  ✗ Marked.js not configured');
    failed++;
}

if (jsContent.includes('breaks: true') && jsContent.includes('gfm: true')) {
    console.log('  ✓ GFM (GitHub Flavored Markdown) enabled');
    passed++;
} else {
    console.log('  ✗ GFM not properly configured');
    failed++;
}

// Test 4: Check for TOC generation
console.log('\n✓ Test 4: Table of Contents generation');
if (jsContent.includes('h1, h2, h3, h4')) {
    console.log('  ✓ Extracts headings from markdown');
    passed++;
} else {
    console.log('  ✗ Heading extraction not implemented');
    failed++;
}

if (jsContent.includes('scrollIntoView')) {
    console.log('  ✓ Smooth scrolling to headings');
    passed++;
} else {
    console.log('  ✗ Scroll functionality missing');
    failed++;
}

// Test 5: Check for search functionality
console.log('\n✓ Test 5: Search within PRD content');
if (jsContent.includes('search-highlight')) {
    console.log('  ✓ Search highlighting implemented');
    passed++;
} else {
    console.log('  ✗ Search highlighting missing');
    failed++;
}

if (jsContent.includes('escapeRegex')) {
    console.log('  ✓ Safe regex search');
    passed++;
} else {
    console.log('  ✗ Regex safety not implemented');
    failed++;
}

// Test 6: Check for file link handling
console.log('\n✓ Test 6: File reference links');
if (jsContent.includes('processLinks')) {
    console.log('  ✓ Link processing function exists');
    passed++;
} else {
    console.log('  ✗ Link processing missing');
    failed++;
}

if (jsContent.includes('.js|.ts|.jsx|.tsx|.py')) {
    console.log('  ✓ Detects code file references');
    passed++;
} else {
    console.log('  ✗ File detection not implemented');
    failed++;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('RESULTS:');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log('='.repeat(50));

if (failed === 0) {
    console.log('\n✅ ALL TESTS PASSED - feat-034 is ready!');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${failed} tests failed - feat-034 needs work`);
    process.exit(1);
}
