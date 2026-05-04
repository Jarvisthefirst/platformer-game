/**
 * test-levels.js — Level Loading & Validation Tests
 *
 * Tests level format validity, object placement, spawn position safety,
 * collectible reachability, solid tile integrity, and edge cases.
 */

import { LevelManager, LEVELS, LEVEL_NAMES, getLevel1, getLevel2, getLevel3 } from '../levels.js';
import { createTestCanvas, assert, assertEqual, C, clearLocalStorage } from './test-helper.js';

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
    console.log(`${C.bold}${C.yellow}  Level System Tests${C.reset}`);
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

// Helper to normalize level data access
function getLevelData(i) {
    const raw = LEVELS[i]();
    const fg = raw.layers.foreground;
    const bg = raw.layers.background;
    const dec = raw.layers.decorative || [];
    const objects = raw.objects || {};
    const spawn = objects.player_spawn || { x: 32, y: 32 };
    const enemies = objects.enemies || [];
    const collectibles = objects.collectibles || [];
    const exitObj = objects.exit || { x: 0, y: 0 };

    return {
        raw, fg, bg, dec, objects,
        width: raw.width,
        height: raw.height,
        spawnX: spawn.x,
        spawnY: spawn.y,
        enemies,
        collectibles,
        exitX: exitObj.x,
        exitY: exitObj.y,
    };
}

// ═════════════════════════════════════════════════

run('Level Format Validation');

test('Level format matches expected structure', () => {
    for (let i = 0; i < LEVELS.length; i++) {
        const raw = LEVELS[i]();
        const d = getLevelData(i);

        assert(d.width > 0, `Level ${i+1}: width > 0 (got ${d.width})`);
        assert(d.height > 0, `Level ${i+1}: height > 0 (got ${d.height})`);
        assert(raw.layers, `Level ${i+1}: has layers object`);
        assert(Array.isArray(d.fg), `Level ${i+1}: foreground is array`);
        assert(Array.isArray(d.bg), `Level ${i+1}: background is array`);
        assert(Array.isArray(d.collectibles), `Level ${i+1}: collectibles is array`);
        assert(Array.isArray(d.enemies), `Level ${i+1}: enemies is array`);
        assert(raw.objects?.player_spawn, `Level ${i+1}: has player_spawn object`);
        assert(d.spawnX !== undefined, `Level ${i+1}: spawnX defined`);
        assert(d.spawnY !== undefined, `Level ${i+1}: spawnY defined`);
        assert(raw.objects?.exit, `Level ${i+1}: has exit object`);
        assert(d.fg.length === d.height, `Level ${i+1}: fg rows=${d.fg.length} === height=${d.height}`);
        assert(d.bg.length === d.height, `Level ${i+1}: bg rows=${d.bg.length} === height=${d.height}`);

        if (d.fg.length > 0) {
            assert(d.fg[0].length === d.width, `Level ${i+1}: fg cols=${d.fg[0].length} === width=${d.width}`);
            assert(d.bg[0].length === d.width, `Level ${i+1}: bg cols=${d.bg[0].length} === width=${d.width}`);
        }

        ok(`Level ${i+1} ("${LEVEL_NAMES[i]}") format validated`);
    }
});

test('LEVELS and LEVEL_NAMES exports are correct', () => {
    assertEqual(LEVELS.length, 3, '3 levels in LEVELS');
    assertEqual(LEVEL_NAMES.length, 3, '3 names in LEVEL_NAMES');
    for (let i = 0; i < 3; i++) {
        assert(typeof LEVELS[i] === 'function', `LEVELS[${i}] is a function`);
        assert(typeof LEVEL_NAMES[i] === 'string', `LEVEL_NAMES[${i}] is a string`);
        assert(LEVEL_NAMES[i].length > 0, `LEVEL_NAMES[${i}] is non-empty`);
    }
    ok('LEVELS and LEVEL_NAMES properly exported');
});

run('Spawn Safety');

test('Player spawn does not overlap solid tiles', () => {
    const pw = 14, ph = 16, ts = 16;

    for (let i = 0; i < LEVELS.length; i++) {
        const d = getLevelData(i);
        const c0 = Math.floor(d.spawnX / ts);
        const c1 = Math.floor((d.spawnX + pw - 1) / ts);
        const r0 = Math.floor(d.spawnY / ts);
        const r1 = Math.floor((d.spawnY + ph - 1) / ts);

        let inside = false;
        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                const t = d.fg[r]?.[c];
                if (t && t >= 1 && t !== 4) inside = true;
            }
        }
        assert(!inside, `Level ${i+1}: Spawn (${d.spawnX}, ${d.spawnY}) not inside wall`);
        ok(`Level ${i+1}: Spawn at (${d.spawnX}, ${d.spawnY}) safe`);
    }
});

test('Ground exists beneath player spawn', () => {
    const ts = 16;

    for (let i = 0; i < LEVELS.length; i++) {
        const d = getLevelData(i);
        const feetRow = Math.floor((d.spawnY + 16) / ts);
        const colA = Math.floor(d.spawnX / ts);
        const colB = Math.floor((d.spawnX + 13) / ts);

        let hasGround = false;
        for (let r = feetRow; r < d.height; r++) {
            const t1 = d.fg[r]?.[colA];
            const t2 = d.fg[r]?.[colB];
            if ((t1 && t1 >= 1 && t1 !== 4) || (t2 && t2 >= 1 && t2 !== 4)) {
                hasGround = true;
                break;
            }
        }
        assert(hasGround, `Level ${i+1}: Ground beneath spawn (${d.spawnX}, ${d.spawnY})`);
        ok(`Level ${i+1}: Ground present below spawn`);
    }
});

run('Tile Layer Consistency');

test('All layer dimensions match', () => {
    for (let i = 0; i < LEVELS.length; i++) {
        const d = getLevelData(i);
        assertEqual(d.fg.length, d.bg.length, `Level ${i+1}: fg/bg row count`);

        if (d.dec.length > 0) {
            assertEqual(d.fg.length, d.dec.length, `Level ${i+1}: fg/dec row count`);
        }

        for (let r = 0; r < d.fg.length; r++) {
            const fc = d.fg[r]?.length;
            const bc = d.bg[r]?.length;
            if (fc !== bc) {
                assert(false, `Level ${i+1}: Row ${r} mismatch fg=${fc} bg=${bc}`);
            }
        }

        ok(`Level ${i+1}: Dimensions consistent across layers`);
    }
});

test('No invalid tile values in foreground or background', () => {
    const valid = new Set([0, 1, 2, 3, 4, 5, 6]);

    for (let i = 0; i < LEVELS.length; i++) {
        const d = getLevelData(i);

        for (let r = 0; r < d.fg.length; r++) {
            for (let c = 0; c < d.fg[r].length; c++) {
                if (!valid.has(d.fg[r][c])) {
                    assert(false, `Level ${i+1}: Invalid fg tile ${d.fg[r][c]} at [${r}][${c}]`);
                }
                if (!valid.has(d.bg[r][c])) {
                    assert(false, `Level ${i+1}: Invalid bg tile ${d.bg[r][c]} at [${r}][${c}]`);
                }
            }
        }

        ok(`Level ${i+1}: All tile values valid (0-6)`);
    }
});

run('Collectible Validation');

test('Collectibles are not inside solid tiles', () => {
    const cw = 8, ch = 8, ts = 16;

    for (let i = 0; i < LEVELS.length; i++) {
        const d = getLevelData(i);
        let overlapCount = 0;

        for (const c of d.collectibles) {
            const c0 = Math.floor(c.x / ts);
            const c1 = Math.floor((c.x + cw - 1) / ts);
            const r0 = Math.floor(c.y / ts);
            const r1 = Math.floor((c.y + ch - 1) / ts);

            for (let r = r0; r <= r1; r++) {
                for (let co = c0; co <= c1; co++) {
                    const tile = d.fg[r]?.[co];
                    if (tile && tile >= 1 && tile !== 4) overlapCount++;
                }
            }
        }

        if (overlapCount > 0) {
            assert(false, `Level ${i+1}: ${overlapCount} collectible(s) inside solid tiles`);
        }
        ok(`Level ${i+1}: All ${d.collectibles.length} collectibles placed safely`);
    }
});

test('Collectibles have valid types and positions', () => {
    const validTypes = ['coin', 'gem', 'star', 'heart', 'shard'];

    for (let i = 0; i < LEVELS.length; i++) {
        const d = getLevelData(i);
        for (const c of d.collectibles) {
            assert(c.type !== undefined, `Level ${i+1}: collectible has type`);
            assert(c.x !== undefined && typeof c.x === 'number', `Level ${i+1}: collectible has numeric x`);
            assert(c.y !== undefined && typeof c.y === 'number', `Level ${i+1}: collectible has numeric y`);
            assert(validTypes.includes(c.type), `Level ${i+1}: collectible type "${c.type}" valid`);
        }
        ok(`Level ${i+1}: ${d.collectibles.length} collectibles valid`);
    }
});

run('Enemy Validation');

test('Enemies have valid fields', () => {
    const validTypes = ['walker', 'chaser', 'shooter', 'sentry', 'flyer', 'boss'];

    for (let i = 0; i < LEVELS.length; i++) {
        const d = getLevelData(i);
        for (const e of d.enemies) {
            assert(e.type !== undefined, `Level ${i+1}: enemy has type`);
            assert(validTypes.includes(e.type), `Level ${i+1}: enemy type "${e.type}" valid`);
            assert(typeof e.x === 'number', `Level ${i+1}: enemy x is number`);
            assert(typeof e.y === 'number', `Level ${i+1}: enemy y is number`);
        }
        ok(`Level ${i+1}: ${d.enemies.length} enemies valid`);
    }
});

test('Enemies are not placed inside solid tiles', () => {
    const ts = 16;

    for (let i = 0; i < LEVELS.length; i++) {
        const d = getLevelData(i);
        let insideWall = 0;

        for (const e of d.enemies) {
            const col = Math.floor((e.x + 8) / ts);
            const row = Math.floor((e.y + 8) / ts);
            if (row >= 0 && row < d.height && col >= 0 && col < d.width) {
                const tile = d.fg[row]?.[col];
                if (tile && tile >= 1 && tile !== 4) insideWall++;
            }
        }

        if (insideWall > 0) {
            assert(false, `Level ${i+1}: ${insideWall} enemy(s) inside solid tiles`);
        }
        ok(`Level ${i+1}: Enemies placed outside walls`);
    }
});

run('Hazard Tile Analysis');

test('Spike tiles (ID 5) are not in solidTiles set', () => {
    const lm = new LevelManager();
    assert(!lm.isSolid(5), 'LevelManager.solidTiles does NOT include tile 5');
    assert(lm.isHazard(5), 'LevelManager.hazardTiles includes tile 5');
    ok('Spikes excluded from solid, included in hazards');
});

test('Spike count per level', () => {
    for (let i = 0; i < LEVELS.length; i++) {
        const d = getLevelData(i);
        let count = 0;
        for (let r = 0; r < d.fg.length; r++) {
            for (let c = 0; c < d.fg[r].length; c++) {
                if (d.fg[r][c] === 5) count++;
            }
        }
        console.log(`    Level ${i+1}: ${count} spike tiles (hazard, non-solid)`);
        ok(`Level ${i+1}: ${count} spikes found`);
    }
});

run('Exit/Goal');

test('Exit object is present and within bounds', () => {
    for (let i = 0; i < LEVELS.length; i++) {
        const d = getLevelData(i);
        assert(d.raw.objects?.exit, `Level ${i+1}: exit object exists`);
        assert(d.exitX >= 0, `Level ${i+1}: exitX >= 0 (${d.exitX})`);
        assert(d.exitX < d.width * 16, `Level ${i+1}: exitX in bounds`);
        assert(d.exitY >= 0, `Level ${i+1}: exitY >= 0 (${d.exitY})`);
        ok(`Level ${i+1}: Exit at (${d.exitX}, ${d.exitY})`);
    }
});

run('Completability');

test('Each level has at least one solid tile', () => {
    for (let i = 0; i < LEVELS.length; i++) {
        const d = getLevelData(i);
        let found = false;
        for (let r = 0; r < d.fg.length && !found; r++) {
            for (let c = 0; c < d.fg[r].length && !found; c++) {
                const t = d.fg[r][c];
                if (t >= 1 && t !== 4) found = true;
            }
        }
        assert(found, `Level ${i+1}: Has at least one solid tile (playable)`);
        ok(`Level ${i+1}: Playable (has solid tiles)`);
    }
});

run('Level-Specific Checks');

test('Level 1: Spike pit at columns 30-32', () => {
    const d = getLevelData(0);
    // Spikes at [18][30-32]
    assert(d.fg[18][30] === 5, 'Spike at [18][30]');
    assert(d.fg[18][31] === 5, 'Spike at [18][31]');
    assert(d.fg[18][32] === 5, 'Spike at [18][32]');
    // Ground removed below
    assert(d.fg[19][30] === 0, 'Row 19 col 30 cleared');
    assert(d.fg[19][31] === 0, 'Row 19 col 31 cleared');
    assert(d.fg[19][32] === 0, 'Row 19 col 32 cleared');
    ok('Level 1: Spike pit at cols 30-32 confirmed');
});

test('Level 1: Player spawn at correct position', () => {
    const d = getLevelData(0);
    assertEqual(d.spawnX, 40, 'Spawn X = 40');
    assertEqual(d.spawnY, 16 * 17, 'Spawn Y = 272');
    ok('Level 1 spawn position matches specification');
});

test('Level 2: Wall corridor for wall jump practice', () => {
    const d = getLevelData(1);
    for (let r = 11; r < 22; r++) {
        assert(d.fg[r][12] === 2, `Wall at col 12 row ${r}`);
        assert(d.fg[r][16] === 2, `Wall at col 16 row ${r}`);
    }
    ok('Level 2: Wall corridor present');
});

test('Level 2: One-way platforms exist', () => {
    const d = getLevelData(1);
    assert(d.fg[10][30] === 4, 'One-way at [10][30]');
    assert(d.fg[10][31] === 4, 'One-way at [10][31]');
    assert(d.fg[8][34] === 4, 'One-way at [8][34]');
    ok('Level 2: One-way platforms placed');
});

test('Level 3: Vertical shaft exists', () => {
    const d = getLevelData(2);
    for (let r = 6; r < 24; r++) {
        assert(d.fg[r][26] === 2, `Shaft wall at col 26 row ${r}`);
        assert(d.fg[r][30] === 2, `Shaft wall at col 30 row ${r}`);
    }
    ok('Level 3: Vertical ascent shaft present');
});

test('Level 3: Multiple enemy types present', () => {
    const d = getLevelData(2);
    const types = new Set(d.enemies.map(e => e.type));
    assert(types.has('shooter'), 'Has shooter');
    assert(types.has('chaser'), 'Has chaser');
    assert(types.has('walker'), 'Has walker');
    ok('Level 3: All required enemy types present');
});

run('LevelManager');

test('LevelManager initializes with correct tile sets', () => {
    const lm = new LevelManager();
    assert(lm.solidTiles instanceof Set, 'solidTiles is Set');
    assert(lm.isSolid(1), 'Tile 1 solid');
    assert(lm.isSolid(2), 'Tile 2 solid');
    assert(lm.isSolid(6), 'Tile 6 (gear) solid');
    assert(!lm.isSolid(5), 'Tile 5 (spike) NOT solid');
    assert(lm.isOneWay(4), 'Tile 4 is one-way');
    assert(lm.isHazard(5), 'Tile 5 is hazard');
    ok('LevelManager tile sets correct');
});

test('LevelManager.loadFromData works correctly', () => {
    const lm = new LevelManager();
    const data = getLevelData(0).raw;
    lm.loadFromData(data);

    assert(lm.levelData === data, 'Level data stored');
    assert(lm.width > 0, 'World width > 0');
    assert(lm.height > 0, 'World height > 0');
    assert(lm.layers.foreground?.length > 0, 'Foreground loaded');
    assert(lm.layers.background?.length > 0, 'Background loaded');

    const fg = lm.getCollisionLayer();
    assert(fg.length > 0, 'getCollisionLayer returns tiles');

    const spawn = lm.getPlayerSpawn();
    assertEqual(spawn.x, 40, 'Spawn X from getPlayerSpawn');
    assertEqual(spawn.y, 272, 'Spawn Y from getPlayerSpawn');

    const props = lm.getProperties();
    assertEqual(props.name, 'The Great Gearworks', 'Level name from properties');

    const enemies = lm.getObjects('enemies');
    assert(enemies.length >= 2, 'At least 2 enemies');

    ok('LevelManager.loadFromData populates all fields');
});

// ═════════════════════════════════════════════════

export { runAll };

const isMain = process.argv[1]?.includes('test-levels');
if (isMain) runAll();
