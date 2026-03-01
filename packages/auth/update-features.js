#!/usr/bin/env node
/**
 * Script to mark completed AUTH-WC features as passing
 */

const fs = require('fs');
const path = require('path');

const featureFile = '/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/feature_list_cross_system_integration.json';

// Feature IDs that have passing tests
const completedFeatures = [
  'AUTH-WC-001', // Unit tests for sign-in, sign-up, password reset
  'AUTH-WC-002', // Unit tests for all API routes
  'AUTH-WC-003', // Unit tests for CRUD helpers
  'AUTH-WC-004', // Unit tests for validation rules
  'AUTH-WC-005', // Unit tests for formatting and helpers
  'AUTH-WC-006', // Unit tests for stores/context
  'AUTH-WC-007', // Full workflow: sign-up through core action
  'AUTH-WC-008', // Stripe checkout and webhook test
  'AUTH-WC-009', // CSV/JSON import and export
  'AUTH-WC-010', // Search, filter, and pagination
  'AUTH-WC-022', // Response shape validation
  'AUTH-WC-023', // Unauthenticated rejection
  'AUTH-WC-024', // XSS and SQL injection tests
];

// Read the feature list
const data = JSON.parse(fs.readFileSync(featureFile, 'utf8'));

// Update the features
let updateCount = 0;
for (const feature of data.features) {
  if (completedFeatures.includes(feature.id)) {
    feature.passes = true;
    feature.status = 'completed';
    updateCount++;
    console.log(`✓ Marked ${feature.id} as passing: ${feature.description}`);
  }
}

// Write back
fs.writeFileSync(featureFile, JSON.stringify(data, null, 2));

console.log(`\n✅ Updated ${updateCount} features in ${featureFile}`);
console.log(`   Total features: ${data.features.length}`);
console.log(`   Passing: ${data.features.filter(f => f.passes).length}`);
console.log(`   Remaining: ${data.features.filter(f => !f.passes).length}`);
