#!/usr/bin/env node
/**
 * run-tests.js — Run all Chronos Edge QA tests
 * 
 * Usage: node test/run-tests.js
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('');
console.log('╔════════════════════════════════════════════════╗');
console.log('║      Chronos Edge — QA Test Runner            ║');
console.log('╚════════════════════════════════════════════════╝');
console.log('');

const testSuites = [
    { name: 'Physics', file: 'test-physics.js' },
    { name: 'Player',  file: 'test-player.js' },
    { name: 'Levels',  file: 'test-levels.js' },
    { name: 'Save',    file: 'test-save.js' },
];

let totalPassed = 0;
let totalFailed = 0;

for (const suite of testSuites) {
    const testPath = path.join(__dirname, suite.file);
    console.log(`────────── Running: ${suite.name} Tests ──────────`);
    
    try {
        const output = execSync(`node "${testPath}"`, { encoding: 'utf8', cwd: __dirname });
        // Print output line by line (skip ANSI for summary)
        const lines = output.split('\n').filter(l => l.trim());
        for (const line of lines) {
            // Show test lines (non-empty, non-ansi-heavy)
            if (line.includes('✓') || line.includes('✗') || line.includes('═══') || line.includes('Results')) {
                console.log(line);
            }
        }
        // Parse results
        const resultsMatch = output.match(/Results:\s+\d+\s+passed,\s+(\d+)\s+failed/);
        if (resultsMatch) {
            totalFailed += parseInt(resultsMatch[1]);
        }
    } catch (err) {
        console.error(`\n  FAILED: ${suite.name} — ${err.message}`);
        totalFailed++;
    }
}

console.log('\n');
console.log('═══════════════════════════════════════════════════');
if (totalFailed === 0) {
    console.log(`  All tests passed ✓`);
} else {
    console.log(`  ${totalFailed} test suite(s) failed ✗`);
}
console.log('═══════════════════════════════════════════════════');
console.log('');

process.exit(totalFailed > 0 ? 1 : 0);
