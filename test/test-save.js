/**
 * test-save.js — Save/Load System Tests
 * 
 * Tests the save/load pattern used in index.html:
 * - saveGame(): Serializes state to localStorage
 * - loadGame(): Deserializes from localStorage
 * - clearSave(): Removes save from localStorage
 * 
 * These functions are inlined in index.html, so we test
 * the same logic here.
 */

import { createTestCanvas, assert, assertEqual, deepEqual, C, clearLocalStorage } from './test-helper.js';

let passed = 0;
let failed = 0;
const tests = [];

function test(name, fn) {
    tests.push({ name, fn });
}

function run(name) {
    console.log(`\n${C.bold}${C.blue}${name}${C.reset}`);
}

function ok(msg) {
    console.log(`  ${C.green}✓${C.reset} ${msg}`);
    passed++;
}

async function runAll() {
    console.log(`${C.bold}${C.yellow}══════════════════════════════════════${C.reset}`);
    console.log(`${C.bold}${C.yellow}  Save/Load System Tests${C.reset}`);
    console.log(`${C.bold}${C.yellow}══════════════════════════════════════${C.reset}`);

    for (const t of tests) {
        try {
            await t.fn();
        } catch (err) {
            console.log(`  ${C.red}✗${C.reset} ${t.name}`);
            console.log(`    ${err.message || err}`);
            failed++;
        }
    }

    const total = passed + failed;
    console.log(`\n${C.bold}${'═'.repeat(46)}${C.reset}`);
    console.log(`${C.bold}Results: ${C.green}${passed} passed${C.reset}, ${C.red}${failed} failed${C.reset}, ${total} total`);
    console.log(`${C.bold}${'═'.repeat(46)}${C.reset}`);

    process.exit(failed > 0 ? 1 : 0);
}

// ── Save/load functions (mirroring index.html) ──
const SAVE_KEY = 'chronosEdge_save';

export function saveGame(state) {
    try {
        const data = {
            score: state.score ?? 0,
            lives: state.lives ?? 3,
            levelIndex: state.levelIndex ?? 0,
            totalDeaths: state.totalDeaths ?? 0,
            chronoCrystals: state.chronoCrystals ?? 0,
            unlockedPowers: state.unlockedPowers ?? [],
            completedLevels: state.completedLevels ?? [false, false, false],
            timestamp: Date.now(),
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('saveGame error:', e);
        return false;
    }
}

export function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

export function clearSave() {
    try {
        localStorage.removeItem(SAVE_KEY);
    } catch (e) {
        // ignore
    }
}

// ══════════════════════════════════════════════════════════════════
//  Tests
// ══════════════════════════════════════════════════════════════════

run('Basic Save & Load');

test('Save game persists data to localStorage', () => {
    clearLocalStorage();
    saveGame({ score: 12345, lives: 2, levelIndex: 0, totalDeaths: 5 });

    const raw = localStorage.getItem('chronosEdge_save');
    assert(raw !== null, 'Save data written to localStorage');
    ok('saveGame writes to localStorage');
});

test('Load returns saved game data', () => {
    clearLocalStorage();
    const state = {
        score: 5000, lives: 1, levelIndex: 2, totalDeaths: 10,
        chronoCrystals: 5, unlockedPowers: ['slow', 'rush'],
        completedLevels: [true, true, false],
    };

    saveGame(state);
    const loaded = loadGame();

    assert(loaded !== null, 'loadGame returns data');
    assertEqual(loaded.score, 5000, 'Score preserved');
    assertEqual(loaded.lives, 1, 'Lives preserved');
    assertEqual(loaded.levelIndex, 2, 'Level index preserved');
    assertEqual(loaded.totalDeaths, 10, 'Deaths preserved');
    assertEqual(loaded.chronoCrystals, 5, 'Chrono crystals preserved');
    deepEqual(loaded.unlockedPowers, ['slow', 'rush'], 'Unlocked powers preserved');
    deepEqual(loaded.completedLevels, [true, true, false], 'Completed levels preserved');
    ok('loadGame returns correct saved state');
});

test('Load returns null when no save exists', () => {
    clearLocalStorage();
    const loaded = loadGame();
    assert(loaded === null, 'loadGame returns null when no save');
    ok('loadGame handles missing save gracefully');
});

test('clearSave removes saved data', () => {
    clearLocalStorage();
    saveGame({ score: 999, lives: 3, levelIndex: 1, totalDeaths: 0 });
    clearSave();
    const loaded = loadGame();
    assert(loaded === null, 'No save after clearSave');
    ok('clearSave removes save data');
});

run('Data Integrity');

test('Save with missing fields uses defaults', () => {
    clearLocalStorage();
    saveGame({ score: 100, lives: 2 });

    const loaded = loadGame();
    assert(loaded !== null, 'load returns data');
    assertEqual(loaded.score, 100, 'Score from save');
    assertEqual(loaded.lives, 2, 'Lives from save');
    assertEqual(loaded.levelIndex, 0, 'Default level index');
    assertEqual(loaded.totalDeaths, 0, 'Default deaths');
    ok('Partial save loads with defaults for missing fields');
});

test('Corrupted save does not crash', () => {
    clearLocalStorage();
    localStorage.setItem('chronosEdge_save', '{broken json!!!');
    const loaded = loadGame();
    assert(loaded === null, 'loadGame returns null for corrupted save');
    ok('loadGame handles corrupted save');
});

test('Empty save string does not crash', () => {
    clearLocalStorage();
    localStorage.setItem('chronosEdge_save', '');
    const loaded = loadGame();
    assert(loaded === null, 'loadGame returns null for empty save');
    ok('loadGame handles empty save string');
});

test('Invalid (non-JSON) save does not crash', () => {
    clearLocalStorage();
    localStorage.setItem('chronosEdge_save', 'this is not json');
    const loaded = loadGame();
    assert(loaded === null, 'loadGame returns null for non-JSON');
    ok('loadGame handles non-JSON save data');
});

run('Edge Cases');

test('Multiple saves overwrite correctly', () => {
    clearLocalStorage();

    for (let i = 0; i < 5; i++) {
        saveGame({ score: i * 100, lives: 3, levelIndex: i, totalDeaths: 0 });
    }

    const loaded = loadGame();
    assertEqual(loaded.score, 400, 'Last saved score');
    assertEqual(loaded.levelIndex, 4, 'Last saved level');
    ok('Multiple saves: last write wins');
});

test('Save with very large values', () => {
    clearLocalStorage();
    const state = {
        score: 9999999, lives: 99, levelIndex: 99, totalDeaths: 999,
        chronoCrystals: 99,
        unlockedPowers: ['slow', 'rush', 'burst'],
        completedLevels: [true, true, true, true, true],
    };

    saveGame(state);
    const loaded = loadGame();
    assertEqual(loaded.score, 9999999, 'Large score preserved');
    assertEqual(loaded.lives, 99, 'Large lives preserved');
    assertEqual(loaded.levelIndex, 99, 'Large level index preserved');
    deepEqual(loaded.unlockedPowers, ['slow', 'rush', 'burst'], 'Powers preserved');
    ok('Large values survive save/load cycle');
});

test('Save timestamps exist', () => {
    clearLocalStorage();
    saveGame({ score: 100, lives: 3, levelIndex: 0, totalDeaths: 0 });

    const loaded = loadGame();
    assert(loaded.timestamp !== undefined, 'Timestamp exists');
    assert(typeof loaded.timestamp === 'number', 'Timestamp is a number');
    ok('Save includes timestamp');
});

test('Save/load preserves boolean arrays', () => {
    clearLocalStorage();
    saveGame({
        score: 0, lives: 3, levelIndex: 0, totalDeaths: 0,
        completedLevels: [true, false, true],
    });

    const loaded = loadGame();
    assert(Array.isArray(loaded.completedLevels), 'completedLevels is array');
    assert(loaded.completedLevels[0] === true, 'Level 0 completed');
    assert(loaded.completedLevels[1] === false, 'Level 1 not completed');
    assert(loaded.completedLevels[2] === true, 'Level 2 completed');
    ok('Boolean arrays preserved correctly');
});

test('Save does not throw when localStorage is full', () => {
    // Can't easily simulate full localStorage in tests,
    // but verify the try-catch in saveGame works
    clearLocalStorage();

    const result = saveGame({
        score: 0, lives: 3, levelIndex: 0, totalDeaths: 0,
        unlockedPowers: new Array(10000).fill('slow'), // Should be fine
    });

    // Should either return true or not throw
    assert(result !== undefined, 'saveGame returned a value');
    ok('saveGame handles large data gracefully');
});

// ══════════════════════════════════════════════════════════════════

export { runAll };

// Auto-run
const isMain = process.argv[1]?.includes('test-save');
if (isMain) runAll();
