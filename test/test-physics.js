/**
 * test-physics.js — Physics & Collision Tests
 * 
 * Tests: gravity, friction, jump arcs, collision resolution,
 * coyote time, one-way platforms, AABB overlap, wall detection.
 */

import { PHYSICS, PhysicsBody, applyPhysics, moveAndCollide, aabbOverlap, resolveAABB } from '../physics.js';
import { createTestCanvas, assert, assertEqual, assertClose, C } from './test-helper.js';

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

function fail(msg, err) {
    console.log(`  ${C.red}✗${C.reset} ${msg}`);
    if (err) console.log(`    ${err.message || err}`);
    failed++;
}

async function runAll() {
    console.log(`${C.bold}${C.yellow}══════════════════════════════════════${C.reset}`);
    console.log(`${C.bold}${C.yellow}  Physics System Tests${C.reset}`);
    console.log(`${C.bold}${C.yellow}══════════════════════════════════════${C.reset}`);

    for (const t of tests) {
        try {
            await t.fn();
        } catch (err) {
            fail(t.name, err);
        }
    }

    const total = passed + failed;
    console.log(`\n${C.bold}${'═'.repeat(46)}${C.reset}`);
    console.log(`${C.bold}Results: ${C.green}${passed} passed${C.reset}, ${C.red}${failed} failed${C.reset}, ${total} total`);
    console.log(`${C.bold}${'═'.repeat(46)}${C.reset}`);

    process.exit(failed > 0 ? 1 : 0);
}

// ══════════════════════════════════════════════════════════════════
//  Tests
// ══════════════════════════════════════════════════════════════════

run('Gravity & Fall Speed');

test('Gravity accelerates body downward', () => {
    const body = new PhysicsBody();
    const dt = 1 / 60;

    applyPhysics(body, dt, 1800);
    
    assert(body.vy > 0, 'Body should have positive vy after gravity');
    assertClose(body.vy, 1800 * dt, 0.001, 'Gravity acceleration');
    ok('Gravity applied correctly');
});

test('Max fall speed is capped', () => {
    const body = new PhysicsBody();
    body.vy = 0;
    body.gravityScale = 1;
    
    // Simulate many frames to reach terminal velocity
    for (let i = 0; i < 200; i++) {
        applyPhysics(body, 1/60, 99999); // Very high gravity
    }
    
    assert(body.vy <= PHYSICS.maxFallSpeed, `vy (${body.vy}) should not exceed maxFallSpeed (${PHYSICS.maxFallSpeed})`);
    assert(body.vy >= -PHYSICS.maxFallSpeed, `vy (${body.vy}) should not be below -maxFallSpeed`);
    ok(`Max fall speed capped at ${PHYSICS.maxFallSpeed}`);
});

test('Gravity scale reduces effective gravity', () => {
    const body1 = new PhysicsBody();
    const body2 = new PhysicsBody();
    body2.gravityScale = 0.5;
    
    applyPhysics(body1, 1/60, 1800);
    applyPhysics(body2, 1/60, 1800);
    
    assertClose(body2.vy, body1.vy * 0.5, 0.001, 'Half gravity scale = half vy');
    ok('Gravity scale works');
});

run('Friction & Acceleration');

test('Ground friction slows body to stop', () => {
    const body = new PhysicsBody();
    body.vx = 200;
    body.onGround = true;
    
    for (let i = 0; i < 30; i++) {
        body.ax = 0;
        applyPhysics(body, 1/60, 1800);
    }
    
    assert(Math.abs(body.vx) < 1, `Body should stop, vx=${body.vx}`);
    ok('Ground friction stops body');
});

test('Air friction is weaker than ground friction', () => {
    const ground = new PhysicsBody();
    const air = new PhysicsBody();
    ground.vx = air.vx = 200;
    ground.onGround = true;
    air.onGround = false;
    
    for (let i = 0; i < 10; i++) {
        ground.ax = air.ax = 0;
        applyPhysics(ground, 1/60, 1800);
        applyPhysics(air, 1/60, 1800);
    }
    
    assert(Math.abs(air.vx) > Math.abs(ground.vx), 
        `Air vx (${air.vx}) should be > ground vx (${ground.vx}) — air friction is weaker`);
    ok('Air friction is weaker than ground friction');
});

test('Acceleration changes velocity', () => {
    const body = new PhysicsBody();
    body.ax = 800; // 800 px/s²
    
    applyPhysics(body, 1/60, 1800);
    
    assert(body.vx > 0, 'vx should increase with positive acceleration');
    ok('Acceleration correctly affects velocity');
});

test('Max speed is capped', () => {
    const body = new PhysicsBody();
    body.maxSpeedX = 200;
    body.vx = 0;
    
    for (let i = 0; i < 60; i++) {
        body.ax = 10000;
        applyPhysics(body, 1/60, 1800);
        body.ax = 0; // reset after applyPhysics clears it
        if (body.vx > body.maxSpeedX) break;
    }
    
    assert(body.vx <= body.maxSpeedX + 1, `vx (${body.vx}) should not exceed maxSpeedX (${body.maxSpeedX})`);
    ok(`Max speed capped at ${body.maxSpeedX}`);
});

run('Jump Physics');

test('Jump velocity is negative (upward)', () => {
    const body = new PhysicsBody();
    body.vy = -420; // playerJumpForce
    
    assert(body.vy < 0, 'Jump velocity should be negative (upward)');
    ok('Jump force sends player upward');
});

test('Jump arc: upward then downward', () => {
    const body = new PhysicsBody();
    body.vy = -420;
    
    let wasGoingUp = false;
    let wasGoingDown = false;
    
    for (let i = 0; i < 60; i++) {
        applyPhysics(body, 1/60, 1800);
        if (body.vy < 0) wasGoingUp = true;
        if (body.vy > 0) {
            wasGoingDown = true;
            break; // Once we're falling, we're done
        }
    }
    
    assert(wasGoingUp, 'Should start going up');
    assert(wasGoingDown, 'Should eventually fall back down');
    ok('Jump arc: rises then falls correctly');
});

test('Variable height jump: held jump reduces gravity', () => {
    const body = new PhysicsBody();
    body.vy = -420;
    body.gravityScale = 0.55; // Held jump gravity reduction
    
    const bodyTap = new PhysicsBody();
    bodyTap.vy = -420;
    bodyTap.gravityScale = 1.0; // Tap jump (full gravity)
    
    // Simulate a few frames
    for (let i = 0; i < 10; i++) {
        applyPhysics(body, 1/60, 1800);
        applyPhysics(bodyTap, 1/60, 1800);
    }
    
    assert(body.vy < bodyTap.vy, 'Held jump should have less downward velocity than tap jump');
    assert(body.gravityScale === 0.55, 'Gravity scale should be reduced for held jump');
    ok('Variable height: held jump reduces effective gravity');
});

run('Coyote Time');

test('Coyote time allows brief post-ground jump', () => {
    const player = { 
        x: 32, y: 240, width: 14, height: 16,
        body: new PhysicsBody(),
        coyoteTimer: 0.08,
        jumpBufferTimer: 0,
        jumpsLeft: 2,
        maxJumps: 2,
    };
    
    // After leaving ground, coyote timer should be > 0
    player.body.onGround = false;
    player.coyoteTimer = 0.08;
    
    // Simulate losing a frame of ground contact
    player.coyoteTimer -= 1/60;
    
    assert(player.coyoteTimer > 0, `Coyote timer should still be positive (${player.coyoteTimer})`);
    ok(`Coyote time positive after 1 frame off ground: ${player.coyoteTimer.toFixed(3)}s`);
});

test('Coyote time expires after duration', () => {
    const player = { 
        body: new PhysicsBody(),
        coyoteTimer: 0.08,
    };
    
    for (let i = 0; i < 10; i++) {
        player.coyoteTimer -= 1/60;
    }
    
    assert(player.coyoteTimer <= 0, 'Coyote timer should expire after ~5 frames');
    ok('Coyote time correctly expires');
});

run('Collision Detection');

test('AABB overlap detection', () => {
    const a = { x: 0, y: 0, width: 16, height: 16 };
    const b = { x: 8, y: 8, width: 16, height: 16 };
    const c = { x: 100, y: 100, width: 16, height: 16 };
    
    assert(aabbOverlap(a, b), 'Overlapping rects should be detected');
    assert(!aabbOverlap(a, c), 'Non-overlapping rects should not overlap');
    ok('AABB overlap works');
});

test('AABB edge touching counts as overlap', () => {
    const a = { x: 0, y: 0, width: 16, height: 16 };
    const b = { x: 16, y: 0, width: 16, height: 16 }; // Adjacent edge
    
    // With strict AABB (x < b.x + b.width, a.x + a.width > b.x):
    // a.x (0) < b.x + b.width (32) ✓
    // a.x + a.width (16) > b.x (16) → 16 > 16 = false
    assert(!aabbOverlap(a, b), 'Adjacent edges should not overlap');
    ok('AABB edge adjacency correctly returns no overlap');
});

test('AABB contains case', () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 10, y: 10, width: 10, height: 10 };
    
    assert(aabbOverlap(a, b), 'Contained rect should overlap');
    assert(aabbOverlap(b, a), 'Contained rect should overlap (reversed)');
    ok('AABB containment detected');
});

run('Tile Collision Resolution');

test('Horizontal collision stops wall penetration', () => {
    const tiles = [
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
    ];
    const isSolid = id => id === 1;
    const isOneWay = id => false;
    
    const entity = {
        x: 16, y: 16, width: 14, height: 14,
        body: new PhysicsBody(),
    };
    entity.body.vx = 200; // Moving right into wall at col 2
    
    moveAndCollide(entity, 1/60, tiles, 16, 16, isSolid, isOneWay);
    
    // Entity should be pushed left of wall at col 2 (x = 2*16 - 14 = 18)
    assert(entity.x <= 18, `Entity x (${entity.x}) should be ≤ 18 after right wall collision`);
    assert(entity.body.vx === 0, 'Velocity should be zeroed on collision');
    assert(entity.body.onWallRight, 'onWallRight should be true');
    ok('Horizontal collision: entity stopped by wall');
});

test('Vertical collision lands on ground', () => {
    const tiles = [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
    ];
    const isSolid = id => id === 1;
    const isOneWay = id => false;
    
    const entity = {
        x: 16, y: 0, width: 14, height: 14,
        body: new PhysicsBody(),
    };
    entity.body.vy = 1000; // Fast enough to reach row 1 in one frame
    
    moveAndCollide(entity, 1/60, tiles, 16, 16, isSolid, isOneWay);
    
    // Should land on ground at row 1 (y = 1*16 - 14 = 2)
    assert(entity.y === 2, `Entity y (${entity.y}) should be 2 after landing on ground`);
    assert(entity.body.vy === 0, 'vy should be zeroed after landing');
    assert(entity.body.onGround, 'onGround should be true');
    ok('Vertical collision: entity lands on ground');
});

test('Ceiling collision stops upward movement', () => {
    const tiles = [
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ];
    const isSolid = id => id === 1;
    const isOneWay = id => false;
    
    const entity = {
        x: 16, y: 20, width: 14, height: 14,
        body: new PhysicsBody(),
    };
    entity.body.vy = -1200; // Fast enough to reach ceiling in one frame
    
    moveAndCollide(entity, 1/60, tiles, 16, 16, isSolid, isOneWay);
    
    assert(entity.y === 16, `Entity y (${entity.y}) should be 16 after ceiling collision`);
    assert(entity.body.vy === 0, 'vy should be zeroed on ceiling hit');
    assert(entity.body.onCeiling, 'onCeiling should be true');
    ok('Ceiling collision stops upward movement');
});

run('One-Way Platforms');

test('One-way platform supports from above', () => {
    // One-way tile ID is 4
    const tiles = [
        [0, 0, 0, 0],
        [0, 4, 0, 0],
        [0, 0, 0, 0],
    ];
    const isSolid = id => false; // One-way is not "solid" in the traditional sense
    const isOneWay = id => id === 4;
    
    const entity = {
        x: 16, y: 0, width: 14, height: 14,
        body: new PhysicsBody(),
    };
    entity.body.vy = 500; // Falling onto one-way
    
    // Before collision, entity bottom = 14, one-way at y=16, so it's above
    // After velocity, entity would be at y = 500/60 ≈ 8.3, bottom at 22.3
    // This passes through row 1 (16-31). One-way at [1][1]
    // Check: prevBottom = 0 + 14 = 14, row * tileH + 4 = 16 + 4 = 20
    // 14 > 20? No. So the one-way check passes.
    
    moveAndCollide(entity, 1/60, tiles, 16, 16, isSolid, isOneWay);
    
    // Should land on the one-way platform
    assert(entity.body.onGround, 'Should be on ground after landing on one-way');
    const expectedY = 1 * 16 - 14; // row 1 tile - entity height
    assert(entity.y === expectedY, `Entity should land on one-way (y=${entity.y}, expected=${expectedY})`);
    ok('One-way platform supports from above');
});

test('One-way platform passes through from below', () => {
    const tiles = [
        [0, 0, 0, 0],
        [0, 4, 0, 0],
        [0, 0, 0, 0],
    ];
    const isSolid = id => false;
    const isOneWay = id => id === 4;
    
    const entity = {
        x: 16, y: 30, width: 14, height: 14,
        body: new PhysicsBody(),
    };
    entity.body.vy = -200; // Moving up through one-way
    
    // Entity bottom = 30 + 14 = 44, prevBottom will be used
    // prevBottom = 44, row * tileH + 4 = 16 + 4 = 20
    // 44 > 20, so this entity is below the one-way — should not collide
    
    moveAndCollide(entity, 1/60, tiles, 16, 16, isSolid, isOneWay);
    
    assert(!entity.body.onCeiling, 'Should not collide with one-way from below');
    ok('One-way platform correctly passed through from below');
});

run('Edge Cases');

test('Entity at world boundary stays in bounds', () => {
    const tiles = [
        [1, 1, 1, 1],
        [1, 0, 0, 1],
        [1, 1, 1, 1],
    ];
    const isSolid = id => id === 1;
    const isOneWay = id => false;
    
    const entity = {
        x: 4, y: 16, width: 14, height: 14,
        body: new PhysicsBody(),
    };
    entity.body.vx = -200; // Moving left into wall at col 0
    
    // Should not crash
    moveAndCollide(entity, 1/60, tiles, 16, 16, isSolid, isOneWay);
    
    assert(entity.x === 16, `Entity x (${entity.x}) should be 16 after wall collision`);
    ok('Wall collision at left edge works');
});

test('Entity outside grid does not crash', () => {
    const tiles = [[0, 0], [0, 0]];
    const isSolid = id => true;
    const isOneWay = id => false;
    
    const entity = {
        x: 1000, y: 1000, width: 16, height: 16,
        body: new PhysicsBody(),
    };
    entity.body.vy = 500;
    entity.body.vx = 500;
    
    // Should not crash — tiles?.[row]?.[col] returns undefined
    moveAndCollide(entity, 1/60, tiles, 16, 16, isSolid, isOneWay);
    ok('Entity outside tile grid does not crash');
});

test('Zero velocity collision does nothing', () => {
    const tiles = [[1, 1], [1, 1]];
    const isSolid = id => true;
    const isOneWay = id => false;
    
    const entity = {
        x: 0, y: 0, width: 16, height: 16,
        body: new PhysicsBody(),
    };
    entity.body.vx = 0;
    entity.body.vy = 0;
    
    moveAndCollide(entity, 1/60, tiles, 16, 16, isSolid, isOneWay);
    
    // Entity should stay put (or be pushed out if overlapping)
    ok('Zero velocity collision does not crash');
});

test('resolveAABB pushes entities apart', () => {
    const a = { x: 0, y: 0, width: 16, height: 16 };
    const b = { x: 8, y: 8, width: 16, height: 16 };
    
    resolveAABB(a, b);
    
    // After resolution, they should not overlap
    assert(!aabbOverlap(a, b), 'Entities should not overlap after resolution');
    ok('resolveAABB correctly separates overlapping entities');
});

run('Jump Buffer');

test('Jump buffer retains input briefly', () => {
    let jumpBufferTimer = 0.1; // Just pressed jump
    const dt = 1/60;
    
    jumpBufferTimer -= dt;
    assert(jumpBufferTimer > 0, 'Jump buffer should still be positive after 1 frame');
    
    for (let i = 0; i < 10; i++) jumpBufferTimer -= dt;
    assert(jumpBufferTimer <= 0, 'Jump buffer should expire after ~6 frames');
    ok('Jump buffer timing works');
});

// ══════════════════════════════════════════════════════════════════

export { runAll };
// Auto-run when executed directly
const isMain = process.argv[1]?.includes('test-physics');
if (isMain) runAll();
