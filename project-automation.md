# Project Automation — Chronos Edge

See `/data/.openclaw/workspace/project-automation.md` for the general pattern.

## Current State
- **Last commit:** 2026-05-06 "Auto: Fix projectile wall collision — check all 4 corners (Item 12)"
- **Tests:** 143/143 passing
- **State:** Clean working tree
- **Line count:** ~5,300 across 8 files + test runner
- **Remote:** https://github.com/Jarvisthefirst/platformer-game.git

## Automation Rules
- **Test command:** `cd /data/.openclaw/workspace/platformer-game/test && node run-tests.js`
- **Commit format:** `Auto: {description}`
- **Push after every commit:** `git push origin main`
- **If blocked:** commit partial progress, note blocker in commit message, update this file
- **If complete:** set status to COMPLETE and message Master

## Priority Queue

### Phase 1 — Critical Bugs & Safety Net
1. ~~CRIT-1: Fix spike tiles — make them solid + damaging (AABB overlap instead of ground contact)~~ (DONE)
2. ~~Fix parallax background disappearing past camera.x > 320~~ (DONE)
3. ~~Fix dash distance: 1200→2000 px/s to match GDD 300px spec~~ (DONE — was already 2000 in code)
4. ~~Consolidate save/load systems — remove duplicate from levels.js, use one SAVE_KEY~~ (DONE — no duplicate exists; levels.js has no localStorage code)

### Phase 2 — Time Powers (Make Them Work)
5. ~~Wire Chrono Burst: slow enemies + projectiles in radius while burst active~~ (DONE)
6. ~~Wire Slow Field: slow enemies to 30%, player to 80%, correct gauge drain~~ (DONE)
7. ~~Wire Time Rush: 2x player speed, 1.2x enemy speed~~ (DONE)
8. ~~Implement Rewind (Crystal 2): position history buffer, max 3s rewind, 5s cooldown~~ (DONE)
9. ~~Implement Echo (Crystal 4): clone placement, frozen-movement playback, contact damage~~ (DONE)

### Phase 3 — Polish & Content
10. ~~Fix gamepad attack (justPressed vs isDown)~~ (DONE)
11. ~~Fix canvas resize not updating engine scale~~ (DONE)
12. ~~Fix projectile wall collision (check all 4 corners)~~ (DONE)
13. Fix music scheduling drift (use AudioContext.currentTime instead of setTimeout)
14. Wire drawHealthBar from renderer.js into HUD
15. Clean up: dead code removal (Enemy.onCollide, entity tile collision on entities)
16. Add Crystal unlock progression (Double Jump = Crystal 1, Burst = Crystal 2, etc.)
17. Tune Slow Field cost/uptime (remove activation cost or reduce drain)

### Phase 4 — Full Levels & Steam
18. Build full level 1 (not test level)
19. Build full level 2
20. Build full level 3
21. Steam integration (steam/ folder exists)

## Game Context
- Canvas 2D platformer, no external libraries
- 16px tiles, 320x180 internal resolution
- 3 visible time powers: Burst (area slow), Slow (field), Rush (self speed)
- 2 hidden: Rewind (checkpoint rollback), Echo (clone)
- Player: jump, double jump, dash, wall slide/jump, 3-combo attack
- Enemies: chaser, shooter (both with patrol)
- Procedural audio (Web Audio API oscillators)
- Save: localStorage, health + crystals + powers + checkpoint
- 3 test levels introducing mechanics incrementally

## Progression Design
- Level 1 (The Gears of Time): Tutorial — double jump + platforming basics, Crystal 1 = double jump
- Level 2 (The Pendulum of Fate): Mid — enemies + time powers, Crystal 2 = burst, Crystal 3 = slow
- Level 3 (The Hourglass of Eternity): Hard — vertical + ranged threats, Crystal 4 = echo, Crystal 5 = rewind

## Status Log
<!-- Updated by automation runs -->
- **2026-05-05:** Initial setup. 21 tasks across 4 phases. First automation run at 03:00 CEST.
- **2026-05-05 (2nd run):** CRIT-1: Fixed spike tiles.
- **2026-05-05 (3rd run):** Fixed parallax background disappearing when camera.x > 320. Root cause: `ParallaxBackground.render()` draws `fillRect(0,0,viewW,viewH)` in camera-transformed space (set by engine's `_render`), placing the rect at `(-camera.x, -camera.y)`. Fixed by saving context, resetting to identity transform, rendering parallax in screen space, then restoring. All 125/125 tests passing.
- **2026-05-05 (4th run):** Phase 1 complete. Items 3 (dash speed) and 4 (save consolidation) were already done in code. Phase 2 started. Item 5: Wired Chrono Burst — fixed burst cost 2.0→0.5s, duration 0.3→0.5s to match GDD spec. Added projectile velocity reduction (60% slow) within burst radius. Enemies slowed to 40% (60% slow). All 125/125 tests passing. Replaced `onGround`-dependent hazard check with full AABB overlap check (all 4 corners of player body). Added particle VFX on spike damage. Also fixed pre-existing test failures: updated player tests (maxJumps 2→1 for gated double jump), level tests (solidTiles now includes tile 5, spike positions corrected). All 125/125 tests passing.
- **2026-05-05 (5th run):** Item 6: Wired Slow Field — enemies slowed to 30% (was 50%), projectiles slowed to 40%, player moves at 80% speed (160 px/s), slow/rush are now mutually exclusive (activating one deactivates the other). All tests passing.
- **2026-05-05 (6th run):** Item 7: Wired Time Rush — enemies speed up to 1.2x (was 0.5x slow), player already 2x speed (400 px/s). Gauge drain 1.5s/sec, activation cost 1.0s. All 125/125 tests passing.
- **2026-05-06:** Item 8: Wired Rewind — added 5s cooldown (`rewindCooldown`), health tracking in position history snapshots (`_recordPosition` now stores `{x, y, health}`), health restore on rewind activation. Added 7 new rewind unit tests: history recording, position restore, health restore, insufficient frames guard, cooldown enforcement, gauge requirement, invincibility/velocity reset. Total: 132/132 tests passing.
- **2026-05-06 (2nd run):** Item 9: Wired Echo — Changed from input-based recording to position-based playback ("frozen copy" of last 4s of movement). Activation cost 4.0→3.0 to match GDD. History buffer 120→240 frames (2s→4s). One-at-a-time enforcement in scene. Rewrote EchoEntity for exact position replay (no physics/tile grid dependency). Fixed test runner to be executable. Added 11 echo unit tests. Total: 143/143 tests passing.
- **2026-05-06 (3rd run):** Item 10: Fixed gamepad attack — changed `isDown` to `justPressed` for `GAMEPAD_X`, `GAMEPAD_B`, `GAMEPAD_Y` in player input. Holding a gamepad face button no longer triggers continuous dash/attack/power. Jump and jumpHeld (variable-height) on GAMEPAD_A left as-is (correct behavior). All 143/143 tests passing.
- **2026-05-06 (4th run):** Item 11: Fixed canvas resize not updating engine scale. `resizeCanvas()` now delegates to `engine.resize(w, h)` which calls `_updateScale()`, keeping `scaleX`/`scaleY` in sync with actual canvas dimensions. First-time call (before `engine` exists) still sets canvas directly. All 143/143 tests passing.
- **2026-05-06 (5th run):** Item 12: Fixed projectile wall collision — replaced single-point (top-left corner) check with 4-corner AABB check. Projectiles now test all 4 corners against the tile grid, preventing bullet-through-paper tunneling at high speeds or near tile seams. All 143/143 tests passing.
- **2026-05-06 (6th run):** Item 13: Fixed music scheduling drift — replaced `setTimeout`-based beat scheduling with `AudioContext.currentTime` lookahead approach. `_scheduleBeat()` replaced by `_scheduleAhead()` (periodic check every 50ms) + `_scheduleBeatAt(time)` (schedules exact beat at sample-accurate time). Added `setTimeout` cleanup in `stopMusic()`. All 143/143 tests passing.
- **2026-05-06 (7th run):** Item 14: Wired drawHealthBar from renderer.js into HUD — replaced heart-based health display in GameplayScene.renderHUD with `drawHealthBar(ctx, health, maxHealth, x, y, w, h)` call. Health bar shows color-coded fill (green > 50%, yellow > 25%, red ≤ 25%) with border and HP label. All 143/143 tests passing.
- **2026-05-07:** Item 15: Cleaned up dead code. Removed `if (this.tiles)` tile collision guards from Player, Enemy, ChaserEnemy, ShooterEnemy (tile collision handled by scene). Removed dead `Enemy.onCollide()` and `Projectile.onCollide()` methods. Cleaned up unused `moveAndCollide`/`aabbOverlap` import in entities.js. Projectile position update simplified. All 143/143 tests passing.
