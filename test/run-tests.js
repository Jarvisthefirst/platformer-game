#!/usr/bin/env node
/**
 * run-tests.js — Run all Chronos Edge QA tests
 * 
 * Usage: node test/run-tests.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('');
console.log('╔════════════════════════════════════════════════╗');
console.log('║      Chronos Edge — QA Test Runner            ║');
console.log('╚════════════════════════════════════════════════╝');
console.log('');

// Run tests sequentially so output is readable
const testSuites = [
    { name: 'Physics', file: 'test-physics.js' },
    { name: 'Player',  file: 'test-player.js' },
    { name: 'Levels',  file: 'test-levels.js' },
    { name: 'Save',    file: 'test-save.js' },
];

let allPassed = true;

for (const suite of testSuites) {
    const testPath = path.join(__dirname, suite.file);
    console.log(`\n────────── Running: ${suite.name} Tests ──────────`);
    
    try {
        const { runAll } = await import(testPath);
        if (typeof runAll === 'function') {
            // runAll calls process.exit internally, so we wrap in a child process
            // Actually, let's just execute them as scripts directly
        }
    } catch (err) {
        console.error(`Failed to load ${suite.file}:`, err.message);
        allPassed = false;
    }
}

// Actually, let's just run them as separate processes for proper exit handling
console.log('\n');
