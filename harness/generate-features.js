#!/usr/bin/env node

/**
 * PRD to Feature List Generator
 * ==============================
 * 
 * Uses OpenAI to parse a PRD and generate a structured feature_list.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are a technical product manager who converts PRD documents into structured feature lists.

Given a PRD, extract ALL features and output a JSON object with this exact structure:

{
  "project": "Project Name",
  "description": "Brief project description",
  "version": "1.0",
  "totalFeatures": <number>,
  "completedFeatures": 0,
  "phases": {
    "phase1_name": "Description",
    "phase2_name": "Description"
  },
  "features": [
    {
      "id": "PREFIX-001",
      "name": "Feature Name",
      "description": "What this feature does",
      "priority": "P0|P1|P2",
      "phase": 1,
      "effort": "2h|4h|8h|16h",
      "passes": false,
      "category": "category_name",
      "files": ["suggested/file/paths.ts"],
      "acceptance": ["Acceptance criterion 1", "Acceptance criterion 2"],
      "dependencies": ["OTHER-001"]
    }
  ]
}

Rules:
1. Use consistent ID prefixes based on feature category (e.g., AUTH-, API-, UI-, DB-)
2. Number IDs sequentially within each prefix (001, 002, etc.)
3. Priority: P0 = MVP/Critical, P1 = Important, P2 = Nice to have
4. Estimate effort realistically (2h for simple, 4-8h for medium, 16h+ for complex)
5. Include ALL features mentioned in the PRD, even implied ones
6. Group features into logical phases
7. Add dependencies where features depend on others
8. Be thorough - extract 20-100+ features from a typical PRD

Output ONLY valid JSON, no markdown or explanation.`;

async function generateFeatureList(prdPath, outputPath, projectName) {
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable not set');
    process.exit(1);
  }

  if (!fs.existsSync(prdPath)) {
    console.error(`❌ PRD file not found: ${prdPath}`);
    process.exit(1);
  }

  console.log(`📄 Reading PRD: ${prdPath}`);
  const prdContent = fs.readFileSync(prdPath, 'utf-8');

  console.log(`🤖 Generating feature list with OpenAI...`);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { 
          role: 'user', 
          content: `Project name: ${projectName}\n\nPRD Content:\n\n${prdContent}` 
        }
      ],
      temperature: 0.2,
      max_tokens: 16000,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ OpenAI API error: ${error}`);
    process.exit(1);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  let featureList;
  try {
    featureList = JSON.parse(content);
  } catch (e) {
    console.error('❌ Failed to parse OpenAI response as JSON');
    console.error(content);
    process.exit(1);
  }

  // Validate structure
  if (!featureList.features || !Array.isArray(featureList.features)) {
    console.error('❌ Invalid feature list structure');
    process.exit(1);
  }

  // Update counts
  featureList.totalFeatures = featureList.features.length;
  featureList.completedFeatures = featureList.features.filter(f => f.passes).length;

  // Write output
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(featureList, null, 2));

  console.log(`✅ Generated ${featureList.totalFeatures} features`);
  console.log(`📁 Saved to: ${outputPath}`);

  // Print summary
  const phases = {};
  for (const feature of featureList.features) {
    const phase = `Phase ${feature.phase}`;
    phases[phase] = (phases[phase] || 0) + 1;
  }

  console.log('\n📊 Feature breakdown:');
  for (const [phase, count] of Object.entries(phases).sort()) {
    console.log(`   ${phase}: ${count} features`);
  }

  return featureList;
}

async function generateFromQueue(queuePath) {
  if (!fs.existsSync(queuePath)) {
    console.error(`❌ Queue file not found: ${queuePath}`);
    process.exit(1);
  }

  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
  const results = [];

  for (const repo of queue.repos) {
    if (!repo.enabled) {
      console.log(`⏭️  Skipping disabled repo: ${repo.name}`);
      continue;
    }

    if (!repo.prd || !fs.existsSync(repo.prd)) {
      console.log(`⚠️  No PRD found for ${repo.name}, skipping feature generation`);
      continue;
    }

    // Check if feature list already exists and has features
    if (fs.existsSync(repo.featureList)) {
      try {
        const existing = JSON.parse(fs.readFileSync(repo.featureList, 'utf-8'));
        if (existing.features && existing.features.length > 0) {
          console.log(`📋 Feature list exists for ${repo.name} (${existing.features.length} features)`);
          results.push({ repo: repo.name, status: 'exists', count: existing.features.length });
          continue;
        }
      } catch (e) {
        // Continue to generate
      }
    }

    try {
      console.log(`\n🔧 Generating features for: ${repo.name}`);
      const featureList = await generateFeatureList(repo.prd, repo.featureList, repo.name);
      results.push({ repo: repo.name, status: 'generated', count: featureList.totalFeatures });
    } catch (e) {
      console.error(`❌ Failed to generate features for ${repo.name}: ${e.message}`);
      results.push({ repo: repo.name, status: 'error', error: e.message });
    }
  }

  console.log('\n📊 Summary:');
  for (const result of results) {
    const icon = result.status === 'error' ? '❌' : '✅';
    console.log(`   ${icon} ${result.repo}: ${result.status} ${result.count ? `(${result.count} features)` : ''}`);
  }

  return results;
}

// CLI
const args = process.argv.slice(2);

function getArgValue(name) {
  const eq = args.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.split('=')[1];
  const idx = args.indexOf(name);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return null;
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
PRD to Feature List Generator
==============================

Converts PRD documents into structured feature_list.json using OpenAI.

Usage:
  node generate-features.js --prd=<path> --output=<path> --name=<project>
  node generate-features.js --queue=<path>

Options:
  --prd PATH       Path to PRD markdown file
  --output PATH    Output path for feature_list.json
  --name NAME      Project name
  --queue PATH     Process all repos in queue file
  --help, -h       Show this help

Environment:
  OPENAI_API_KEY   Required - OpenAI API key

Examples:
  node generate-features.js --prd=./docs/PRD.md --output=./feature_list.json --name="MyProject"
  node generate-features.js --queue=./repo-queue.json
`);
  process.exit(0);
}

const queuePath = getArgValue('--queue');
const prdPath = getArgValue('--prd');
const outputPath = getArgValue('--output');
const projectName = getArgValue('--name');

if (queuePath) {
  generateFromQueue(path.resolve(queuePath)).catch(e => {
    console.error(`Fatal error: ${e.message}`);
    process.exit(1);
  });
} else if (prdPath && outputPath && projectName) {
  generateFeatureList(
    path.resolve(prdPath),
    path.resolve(outputPath),
    projectName
  ).catch(e => {
    console.error(`Fatal error: ${e.message}`);
    process.exit(1);
  });
} else {
  console.error('❌ Missing required arguments. Use --help for usage.');
  process.exit(1);
}
