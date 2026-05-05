# Game Automation — Chronos Edge

This file is the operating plan for the autonomous game development cron job.
Updated automatically after each run.

## Project Location
`/data/.openclaw/workspace/platformer-game/`
Remote: `https://github.com/Jarvisthefirst/platformer-game.git`

## Current State (initial)
- **Last commit:** 2026-05-05 "Auto: speedMultiplier physics, time power effects via multiplier, level complete fanfare, jump sound fix"
- **Tests:** 125/125 passing
- **State:** Clean working tree — ready for automation

## Priority Queue

### Phase 1 — Critical Bugs & Safety Net
1. CRIT-1: Fix spike tiles — make them solid + damaging (AABB overlap instead of ground contact)
2. Fix parallax background disappearing past camera.x > 320
3. Fix dash distance: 1200→2000 px/s to match GDD 300px spec
4. Consolidate save/load systems — remove duplicate from levels.js, use one SAVE_KEY

### Phase 2 — Time Powers (Make Them Work)
5. Wire Chrono Burst: slow enemies + projectiles in radius while burst active
6. Wire Slow Field: slow enemies to 30%, player to 80%, correct gauge drain
7. Wire Time Rush: 2× player speed, 1.2× enemy speed
8. Implement Rewind (Crystal 2): position history buffer, max 3s rewind, 5s cooldown
9. Implement Echo (Crystal 4): clone placement, frozen-movement playback, contact damage

### Phase 3 — Polish & Content
10. Fix gamepad attack (justPressed vs isDown)
11. Fix canvas resize not updating engine scale
12. Fix projectile wall collision (check all 4 corners)
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

## Automation Rules
- **Run tests before every commit:** `cd test && node run-tests.js`
- **Commit message format:** `Auto: <short description>`
- **Push after every commit:** `git push origin main`
- **Update this file** after each run: record what was done
- **If stuck** (test failures, design ambiguity): commit partial progress, update this file with the blocker, mark "BLOCKED" in the commit message
- **If game is complete** (all phases done): set status to COMPLETE and include "GAME COMPLETE" in the message

## Game Overview
- Canvas 2D platformer, no external libraries
- 16px tiles, 320×180 internal resolution
- 3 time powers: Burst (area slow), Slow (field), Rush (self speed)
- 2 hidden powers: Rewind (checkpoint rollback), Echo (clone)
- Player: jump, double jump, dash, wall slide/jump, 3-combo attack
- Enemies: chaser, shooter (both with patrol)
- Procedural audio (Web Audio API oscillators, no files)
- Save: localStorage, health + crystals + powers + checkpoint

## Progression Design
- Level 1 (The Gears of Time): Tutorial — double jump + platforming basics, Crystal 1 = double jump
- Level 2 (The Pendulum of Fate): Mid — enemies + time powers, Crystal 2 = burst, Crystal 3 = slow
- Level 3 (The Hourglass of Eternity): Hard — vertical + ranged threats, Crystal 4 = echo, Crystal 5 = rewind

## Status Log
<!-- Updated by automation runs -->
- **Initial:** All phases open, ~25+ items remaining
