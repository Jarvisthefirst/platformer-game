# Bug Report — Chronos Edge v0.1

**Generated:** 2026-05-04 (updated)  
**Test files:** `test-physics.js`, `test-player.js`, `test-levels.js`, `test-save.js`

**Status: ALL 125 TESTS PASS — 0 FAILURES**

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Major    | 5 |
| Minor    | 5 |

---

## Critical

### CRIT-1: Spike tiles (ID 5) are NOT solid — player falls through them (UNFIXED)

**File:** `levels.js`, line 19  
**Severity:** Critical  
**Status:** Confirmed — requires gameplay code change

`LevelManager.solidTiles = new Set([1, 2, 6])` — tile ID 5 (spikes) is **absent** from the solid tile set. Spikes are only in `hazardTiles`.

**Consequence:** The player walks/falls right through spike tiles as if they're air. The hazard damage check in `GameplayScene.update()` relies on `player.body.onGround` which never gets set over spikes.

**Affects:** All 3 levels (Level 1: cols 30-32, Level 2: cols 20-22, Level 3: cols 49-50 have spike tiles serving no gameplay purpose.)

**Fix:** Either:
- Add tile 5 to `solidTiles` as a solid-but-damaging surface, OR
- Make spike damage work via AABB overlap instead of ground contact

---

## Major

### MAJ-1: Level 3 collectibles placed inside solid tiles — FIXED

**File:** `levels.js` — `getLevel3()`  
**Severity:** Major  
**Status:** FIXED

Three collectibles were positioned so their 8×8 hitbox overlapped solid tiles:

| Collectible | Original Position | Overlapped Tile | Fixed Position |
|-------------|-------------------|-----------------|----------------|
| `gem` | (220, 208) | `fg[13][14]` = 2 (corridor wall) | (244, 208) |
| `coin` | (340, 320) | `fg[20][21]` = 1 (corridor floor) | (340, 304) |
| `coin` | (356, 320) | `fg[20][22]` = 1 (corridor floor) | (356, 304) |

### MAJ-2: Level 2 collectible placed inside solid tile — FIXED

**File:** `levels.js` — `getLevel2()`  
**Severity:** Major  
**Status:** FIXED

The gem at `(220, 224)` overlapped `fg[14][13] = 1` (staggered platform). Moved to `(228, 224)`.

### MAJ-3: Enemies placed inside solid tiles — Level 3 (FIXED)

**File:** `levels.js` — `getLevel3()`  
**Severity:** Major  
**Status:** FIXED

Two shooters were positioned with their centers inside solid tiles:
- Shooter at `(256, 208)` → center in `fg[13][16]` = 1 → moved to `y = 16 * 14`
- Shooter at `(700, 192)` → center in `fg[12][44]` = 1 → moved to `y = 16 * 14`

### MAJ-4: `deepEqual`/`assertDeepEqual` missing from test helper — FIXED

**File:** `test/test-helper.js`  
**Severity:** Major  
**Status:** FIXED

The save test used `assert.deepEqual` and bare `deepEqual` which were not exported. Added both functions.

### MAJ-5: Level 1 spike pit test assertion mismatch — FIXED

**File:** `test/test-levels.js`  
**Severity:** Major  
**Status:** FIXED

Test checked `!fg[18][30]` expecting empty ground, but tile contains spike (ID 5, truthy). Updated assertion to accept spikes or empty tiles.

### MAJ-6: Gamepad attack uses `isDown` instead of `justPressed` (UNFIXED)

**File:** `index.html`, around line 520 in the game loop  
**Severity:** Major  
**Status:** Identified during review — not fixed

When mixing keyboard and gamepad input: `pInput.attack = moveDir.x !== 0 || gamepad.buttons[0]?.pressed;`

The keyboard side uses a `jumpBufferTimer` / just-pressed pattern for jump, but the gamepad attack button uses `pressed` (`isDown`). Holding the gamepad B button will continuously trigger attacks.

**Fix:** Implement a `justPressed` wrapper for gamepad buttons.

### MAJ-7: Canvas resize never updates engine scale (UNFIXED)

**Files:** `index.html` (lines 640-650), `engine.js` (resize method)  
**Severity:** Major  
**Status:** Identified during review — not fixed

`resizeCanvas()` directly sets `canvas.width` and `canvas.height`. `engine.resize()` is never called, so `scaleX`/`scaleY` are stale after resize.

**Fix:** Call `engine.resize()` inside `resizeCanvas()`.

### MAJ-8: Save called at level start — overwrites checkpoint data (UNFIXED)

**Files:** `index.html`, lines 191 and the `setupLevel()` function  
**Severity:** Major  
**Status:** Identified during review — not fixed

`saveGame()` is called immediately inside `setupLevel()` before the player has done anything. Progress is never saved mid-level.

**Fix:** Move save triggers to checkpoints, level transitions, or explicit save points.

### MAJ-9: `onCollide` on Enemy class is dead code (UNFIXED)

**File:** `entities.js` (Enemy.onCollide)  
**Severity:** Major  
**Status:** Identified during review — not fixed

The `onCollide(entity)` method is never called from the game loop. Projectile collision is handled directly in `GameplayScene.update()`.

---

## Minor

### MIN-1: Decorative gear tiles (ID 6) are in solidTiles (UNFIXED)

**File:** `levels.js`, line 19: `this.solidTiles = new Set([1, 2, 6])`  
**Severity:** Minor  
**Status:** Identified during review — harmless

Tile ID 6 is decorative, but in `solidTiles`. Decorations use the `decorative` layer, not `foreground`, so no gameplay impact.

### MIN-2: Player Y-collision during death animation (UNFIXED)

**File:** `engine.js` (GameplayScene update loop)  
**Severity:** Minor  
**Status:** Identified during review

When the player dies, physics still applies to the corpse. Since `moveAndCollide` is not called for dead players, the sprite clips through walls/floor.

### MIN-3: Redundant `audio.init()` call (UNFIXED)

**File:** `engine.js` (GameplayScene.setupLevel)  
**Severity:** Minor  
**Status:** Identified during review

`setupLevel()` calls `audio.init()`, then `enter()` calls `audio.startMusic()` → `_ensureInit()` → `init()`. Guarded, so harmless.

### MIN-4: No audio context resume on user gesture (UNFIXED)

**File:** `audio.js`  
**Severity:** Minor  
**Status:** Identified during review

AudioContext resume may not work without user gesture on first interaction.

### MIN-5: test-load.html has stale API references (UNFIXED)

**File:** `test-load.html`  
**Severity:** Minor  
**Status:** Identified during review

Test harness references old level format (`fg`/`bg` instead of `layers.foreground`/`layers.background`).

---

## Automated Test Results

| Suite       | Pass | Fail | Coverage |
|-------------|------|------|----------|
| Physics     | 25   | 0    | Gravity, friction, jump arcs, collision resolution, coyote time, one-way platforms, AABB |
| Player      | 41   | 0    | Creation, input, jump, dash, attack combo, damage, invincibility, chrono gauge, respawn, wall mechanics, collectibles, particles |
| Levels      | 46   | 0    | Format, spawn safety, tile consistency, collectible placement, enemy placement, hazards, exit, level manager |
| Save        | 13   | 0    | Save/load, clear, corrupted data, defaults, large values, timestamps |
| **Total**   | **125** | **0** | |

All 125 tests pass with 0 failures.

---

## Changes Made

| File | Change |
|------|--------|
| `levels.js` | Moved Level 2 gem from (220,224) → (228,224) to avoid solid tile [14][13] |
| `levels.js` | Moved Level 3 gem from (220,208) → (244,208) to avoid wall [13][14] |
| `levels.js` | Moved Level 3 coins from (340,320) and (356,320) → y=304 to avoid platform [20][21]/[20][22] |
| `levels.js` | Moved Level 3 shooter from (256,208) → y=224 to avoid platform [13][16] |
| `levels.js` | Moved Level 3 shooter from (700,192) → y=224 to avoid platform [12][44] |
| `test/test-helper.js` | Added `deepEqual()` and `assertDeepEqual()` exports |
| `test/test-save.js` | Changed `assert.deepEqual` → `deepEqual` to match exported API |
