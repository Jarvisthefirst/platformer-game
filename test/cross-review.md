# Cross-Review: Code Review of Game Content

**Reviewer:** Worker2 (code/engineering perspective)
**Target:** `/data/.openclaw/workspace/platformer-game/index.html` (entry point) + all module files
**Syntax check status:** All 6 `.js` files pass `node --check` — no syntax errors.

---

## What works well

- **Scene architecture is clean.** `MenuScene` → `GameplayScene` → `PauseScene` → `GameOverScene` are well-structured with clear lifecycle hooks (`enter`, `update`, `render`, `renderHUD`, `exit`).
- **Fixed timestep game loop.** `Engine._loop` uses accumulator-based fixed timestep (1/60) with frame time capping at 250ms — textbook correct.
- **Physics separation is good.** `applyPhysics` and `moveAndCollide` are standalone functions operating on a `PhysicsBody` rather than baked into entities — testable and reusable.
- **AABB collision resolution is correct.** X-first, Y-second order (standard platformer approach). One-way platform handling is present and reasonable.
- **Good use of module pattern.** All files are ES6 modules with clear imports/exports. No global pollution beyond explicit debug globals (`window.__engine`, etc.).
- **Audio context is handled correctly.** Lazy init on first user interaction (respecting browser autoplay policy). Procedural synthesis with no external files needed.
- **Loading screen is well done.** Progress bar animation, graceful fade-out, no race conditions between loading and engine start.
- **Combo/attack system is neat.** Combo window, hit-set tracking, per-step damage scaling (1→2 on step 3), attack arc visualization.
- **Particle pooling.** `ParticleSystem` uses an object pool to avoid GC pressure — good.
- **Invincibility frames.** Proper I-frame timer on damage, visual flash on invincible, dash grants I-frames.
- **Transition system.** Allows scene swaps with fade overlay and a callback — game-feel polish is appreciated.

---

## Issues found

### Severity: Critical

#### 1. Parallax background breaks past camera.x > 320 (rendering bug)
**File:** `index.html:678–679`
**Details:** The engine's `_render()` applies `ctx.translate(-Math.round(this.camera.x), ...)` for the entire scene. Then `GameplayScene.render()` applies ANOTHER `ctx.translate(-cam.x, -cam.y)` before rendering parallax layers. Since `cam` is `engine.camera.getPosition()` (which returns camera position + shake offset), the parallax is rendered in a **doubly-translated** coordinate space.

- Parallax `fillRect(0, 0, viewW, viewH)` ends up at canvas position `-(camera.x + cam.x), -(camera.y + cam.y)`.
- The visible viewport covers canvas positions `-camera.x` to `-camera.x + viewW`.
- For camera.x > viewW (320px), the parallax solid-fill rectangle is completely off-screen, causing the **background to disappear entirely** when the player scrolls past 320px.

**Fix:** Either remove the `ctx.translate(-cam.x, -cam.y)` around `parallax.render()` and let parallax use engine's transform, or render parallax in screen space outside the engine's camera transform (in `renderHUD` or similar).

#### 2. `toggleSlowField()` and `toggleTimeRush()` are completely unreachable (dead feature)
**Files:** `entities.js:393–426`, `index.html`
**Details:** `Player` defines `toggleSlowField()` and `toggleTimeRush()` methods for two time-power modes, and `unlockedPowers` is set to `['burst']` only. However:
- The **only power activation path** in the game goes through `Player._activateTimePower()`, which only handles `'burst'` type.
- No input handler in `GameplayScene.update()` ever calls `toggleSlowField()` or `toggleTimeRush()`.
- No code path ever adds `'slow'` or `'rush'` to `unlockedPowers`.

These are 50+ lines of dead code with no way to reach them during gameplay.

**Fix:** Either wire them to inputs (e.g., hold K + direction), or remove them to reduce code surface.

#### 3. Dual independent save/load systems with different keys
**Files:** `levels.js:429,447,461,483` vs `index.html:94,111,117,126`
**Details:** There are TWO save/load systems with different `SAVE_KEY` values:
- `index.html` uses `SAVE_KEY = 'chronos_edge_save'`
- `levels.js` uses `SAVE_KEY = 'chronosEdge_save'`

`index.html` defines its own `saveGame`, `loadGame`, `clearSave` functions inline **and** imports `LevelManager` from `levels.js` (which also exports `saveGame`, `loadGame`, `clearSave`). The `index.html` does NOT import levels.js's save functions, so they're not directly used — but this is dead code and a maintenance trap. If anyone later imports from `levels.js` expecting save/load to work, they'll get the wrong key.

Additionally:
- `index.html`'s `clearSave()` has **no try/catch** (unlike `saveGame` which does).
- The two systems serialize different fields — `index.html` saves `player.health` etc., while `levels.js` saves `chronoCrystals` etc. Different schemas for the same concept.

**Fix:** Consolidate into one save system. Remove save/load from `levels.js` (it doesn't belong there architecturally) or export `index.html`'s functions. Use one key.

---

### Severity: Major

#### 4. Entity tile collision is entirely dead code
**Files:** `entities.js:311–312, 499–500, 580–581, 634–635, 722–723`
**Details:** Every entity (`Player`, `Enemy`, `ChaserEnemy`, `ShooterEnemy`, `Projectile`) has code like:
```js
if (this.tiles) {
    moveAndCollide(this, dt, this.tiles, this.tileW, this.tileH, ...);
}
```
But `this.tiles` is **never assigned** — the `setTileGrid()` method exists on `Entity` but is never called from `index.html`'s `setupLevel()`. The actual tile collision is handled externally by `GameplayScene.update()` calling `moveAndCollide()` directly. This means ~30 lines of code with nested collision logic runs a guard check that always evaluates to `false`.

**Fix:** Either call `entity.setTileGrid(tiles, tileW, tileH)` in `setupLevel()`, or remove the tile collision code from entity update methods (keeping it only in the scene).

#### 5. GameplayScene.renderHUD never calls drawHealthBar from renderer.js
**File:** `index.html` — import at line 43, usage in HUD at lines 835–922
**Details:** The import pulls in `drawHealthBar` from `renderer.js`, but the HUD code draws hearts manually (bezier curves) rather than calling the dedicated `drawHealthBar()` function. This means `drawHealthBar()` is **dead code** within the renderer — it's exported but never invoked.

**Fix:** Either use `drawHealthBar()` in the HUD for consistency, or remove the import.

#### 6. Projectile wall-collision uses single-point check (can miss)
**File:** `index.html:769–772`
**Details:** Projectile wall collision checks only the tile at the projectile's top-left corner:
```js
const pc = Math.floor(proj.x / 16);
const pr = Math.floor(proj.y / 16);
const pt = tiles[pr]?.[pc];
```
For 4×4 projectiles, this usually works, but a projectile moving at high speed (>16px/frame) or positioned near a tile seam can pass through walls. Bullet-through-paper problem.

**Fix:** Check all four corners of the projectile, or use a swept/ray-based check. At minimum, check `proj.x`, `proj.x + proj.width` and `proj.y`, `proj.y + proj.height`.

#### 7. Music scheduling drifts via setTimeout
**File:** `audio.js:257–262`
**Details:** The procedural music uses `setTimeout` for beat scheduling:
```js
this._beatTimeout = setTimeout(() => {
    this._scheduleBeat();
}, nextBeatDelay);
```
`setTimeout` in browsers has ~4ms minimum and can accumulate drift of 10-30ms per beat, especially if the main thread is busy (which it will be during gameplay). At 140 BPM (428ms per beat), drift compounds beat after beat.

Additionally, if `stopMusic()` is called, the pending timeout can still fire and schedule more beats — `musicPlaying` is checked at the top of `_scheduleBeat()`, so it won't create audible output, but it does create orphan `_beatTimeout` references.

**Fix:** Use `requestAnimationFrame` or `AudioContext.currentTime` scheduling for music timing. Cancel the timeout in `stopMusic()`.

---

### Severity: Minor

#### 8. `GameplayScene.update()` divides input stick handling (redundant code)
**File:** `index.html:536–539`
**Details:** `pInput.x` is first set by keyboard/d-pad, then overridden by stick:
```js
if (input.isDown('ArrowLeft') || ...) pInput.x = -1;
if (input.isDown('ArrowRight') || ...) pInput.x = 1;
const sx = input.getStickX();
if (sx < -0.25) pInput.x = -1;
else if (sx > 0.25) pInput.x = 1;
```
This works but the keyboard and stick checks are independent. Holding right keyboard + stick left gives stick priority. Consider merging into a single input pipeline.

#### 9. Frame-rate-dependent footstep particles
**File:** `index.html:610`
```js
if (Math.random() < 0.3) { /* emit footstep */ }
```
This is called once per fixed timestep (60/sec), so it averages ~18 particles/sec. Not terrible, but this should use a timer-based approach to stay consistent if the fixed timestep changes.

#### 10. `anyPressed()` on InputManager checks raw keys including gamepad axes
**File:** `engine.js:340–345`
```js
anyPressed() {
    for (const key in this._keys) {
        if (this.justPressed(key)) return true;
    }
    return false;
}
```
This iterates over `STICK_LEFT`, `STICK_RIGHT`, etc. Stick axis values set `_keys` in `_pollGamepad()` but are **always present** (set to true/false every frame). Since `justPressed` relies on `_prevKeys` which copies from `_keys`, and sticks toggle between true/false each frame, analog sticks will likely trigger `anyPressed()` unintendedly.

**Fix:** Use a whitelist for `anyPressed()`.

#### 11. `renderHUD` transition layering
**File:** `index.html` (PauseScene:985, GameOverScene:1088)
In non-gameplay scenes, `transition.render()` is called in `render()` but not in `renderHUD()`. When the engine renders, it calls `renderHUD` **after** the camera transform is restored. For menu/pause/gameover scenes that don't use camera transforms, this is fine. But `GameplayScene` calls `transition.render()` in `renderHUD()` only, meaning the transition overlays above the tilemap and entities but below UI elements like hearts — correct behavior.

The Pause/GameOver scenes call `transition.render()` inside `render()` without a camera transform — also fine since they have no camera. This inconsistency is cosmetic but not buggy.

#### 12. Missing `/*#__PURE__*/` annotations for hot-path inline objects
**File:** `index.html:700`
```js
const colColors = { coin: '#ffdd44', gem: '#44ddff', ... };
```
Created every frame in `render()`. This allocates an object every frame. It should be hoisted to module scope as a constant. Minor with modern JIT, but wasteful.

#### 13. `GameplayScene.enter()` doesn't check `data` type before accessing `.fresh`
**File:** `index.html:551`
```js
const save = loadGame();
if (save && !data?.fresh) {
```
`data` can be `undefined` (from `PauseScene → RESUME`, which calls `engine.switchScene('gameplay')` with no data). The optional chaining handles this, but having `.fresh` as a data flag versus no data at all is fragile.

#### 14. Player `isBurstActive()` vs `burstTimer > 0` duplication
**File:** `entities.js:425–427` and `index.html:675–678`
Scene has: `if (player.isBurstActive()) { ... }` — good encapsulation. But the Player's `update()` also checks `this.burstTimer` directly. Minor consistency nit.

---

## Design Review of Engine

**Reviewer:** Subagent (game design / player experience perspective)
**Target:** engine.js, physics.js, entities.js, renderer.js, audio.js, levels.js
**Reference:** gdd.md

---

### What Works Well

**Jump height is correctly tuned.** The physics math (gravity 1800, jump force -420) produces a ~49px max jump — just over 3 tiles at 16px. This exactly matches the GDD's "max 3 tile height" spec. Variable-height jumping via gravity scaling (0.55 when held) is a good implementation of the Celeste-style hold-to-jump-higher mechanic.

**Wall slide + wall jump feel is solid.** The 250ms wall jump cooldown matches the GDD. The wall slide gravity reduction (0.3× at 80px/s cap) gives enough cling time to orient without trivializing the challenge.

**Attack combo system is satisfying.** Three-step combo with damage scaling (1→1→2), a 400ms combo window, and active frames create a rhythmic melee feel. The hit-set tracking prevents double-hitting the same enemy, which avoids feel-jank.

**Dash grants i-frames.** Using dash as both a movement tool and damage avoidance gives it dual purpose, which is good design — it rewards aggressive play.

**Particle system is clean and pooled.** Object pooling avoids GC stutter during gameplay. The `emitStream` API is ready for dash trails and footstep dust.

**Level structure is readable.** The three test levels introduce mechanics in the right GDD order: simple gaps → platforms + enemies → vertical ascents + ranged threats. Tile color mapping makes level data human-debuggable.

**Variable-height jump with buffer.** The jump buffer (100ms) is well-tuned for forgiving input latency. The gravity scaling on held jump is a well-proven approach.

---

### Issues

#### Design: Critical

**1. Dash is 40% shorter than GDD spec.**
- Current: 1200 px/s × 0.15s = **180px**
- GDD spec: **300px** in 150ms (requires 2000 px/s)
- This 120px gap means levels designed around 300px dash gaps (which the GDD implies as a design baseline) are impossible to traverse. Every dash-based encounter is 40% weaker in reach, which cascades through level timing, enemy spacing, and speedrun routes. This is a tuning number that must match the spec or the spec must be updated.

**2. Rewind — the GDD's signature mechanic — is completely missing.**
- The GDD positions Rewind as Crystal 2's power: "Reverses player position & health to checkpoint. Max 3s rewind per use. Cooldown: 5s."
- The engine has zero rewind infrastructure: no position history buffer, no checkpoint rollback, no rewind animation or gauge drain.
- This is a critical gap. Rewind is named in the game's high concept ("rewind mistakes") and is the primary frustration-reduction mechanic. Without it, deaths feel punitive rather than instructive, undermining a core selling point.

**3. Echo — the GDD's fifth time power — is completely missing.**
- No Echo clone, no frozen-movement playback, no damage-on-contact mechanic.
- Echo is described as "the boss killer" in the GDD. Its absence means there's no designed answer to boss encounters.

**4. Three of five time powers have no gameplay effect.**
- **Chrono Burst:** The timer and cooldown are tracked, but no enemy staggering or projectile slowing is implemented. `burstTimer > 0` is checked in the scene but no enemies are affected. The burst is an expensive visual-only mechanic.
- **Slow Field:** Gauge drains correctly, but no enemies or projectiles are slowed to 30%. The player's speed isn't even reduced to 80% (no speed modifier is applied when `slowActive` is true). This is the most expensive power (2s/sec) and does nothing.
- **Time Rush:** Player speed doubles (correct), but enemies at 120% is not implemented.
- **Summary:** Only gauge tracking works. The actual gameplay effects of every toggle power are missing. This means the entire time-manipulation loop — positioning, resource management, tactical activation — is non-functional.

**5. Slow Field activation cost + drain is punishingly short.**
- GDD says 2s/sec drain. With an activation cost of 2s on top: activate at 8s → drops to 6s → drains at 2s/sec → **only 3 seconds of uptime** from full gauge.
- The GDD doesn't mention an activation cost. If this is intentional, it means slow field is unusable for most encounters (3s from full gauge, less if you've used any gauge recently). With recharge at 0.666s per real second, refilling from 0 takes 12 seconds — meaning one short slow-field use costs 15+ seconds of recharge time.
- This makes the power feel bad. Players will hoard gauge and never use it.

#### Design: Major

**6. Double jump is always available, not unlocked via Crystal 1.**
- GDD: "Double Jump — Crystal 1 (Pause)"
- Current: `maxJumps = 2` by default, with no unlock gating.
- This changes the entire difficulty curve for Zone 1. If players always have double jump, tutorial gaps and wall-jump sequences designed around single-jump constraints become trivial. The intended progression (master basic movement → earn double jump → revisit areas) is broken.

**7. Air dash is not implemented.**
- GDD: "Air Dash — Crystal 2 — Dash in any direction while airborne (once per jump)"
- Current dash only works horizontally (`dashDir` derived from `moveInput.x`). No vertical/omni-directional air dash. No "once per jump" counter.
- This removes a major mid-air manipulation tool that enables the precision platforming the GDD promises.

**8. Time Shard (secondary ranged attack) is missing.**
- GDD: "Time Shard — thrown projectile, consumes 0.5s Chrono gauge. Travels in an arc. Can be charged (hold) for 2 damage and piercing."
- No implementation exists. This is the only ranged option for players fighting shooters and aerial enemies, and its absence means the Walker/Chaser melee range dance is the only combat mode.

**9. No player death on fall.**
- `moveAndCollide` treats out-of-bounds rows as solid boundaries. This means falling below the level doesn't kill the player — they get pushed back to the lowest tile row.
- Enemies check `this.y > 2000` to self-destruct, but the Player has no equivalent.
- Spikes (tile ID 5) are placed but act as solid/lava tiles with no damage logic in `moveAndCollide`. The `isHazard` method exists on `LevelManager` but is never queried by the collision system. Spikes are decorative right now.
- **Result:** A player who falls into a spike pit survives at the bottom. The stakes of platforming over hazards are zero.

**10. Chrono Burst vs Slow Field activation is confusing.**
- The single `moveInput.power` input only activates Chrono Burst (`_activateTimePower`). Slow Field and Time Rush require calling separate `toggleSlowField()` / `toggleTimeRush()` methods not wired to any input.
- GDD implies separate controls: Burst is a quick-tap power (instant, 0.5s cost), while Slow and Rush are toggles. The engine needs 
  distinct input mappings: e.g., Shift for burst, hold-X + d-pad for power select, or dedicated toggle buttons.
- Without this, three powers are literally unplayable.

**11. Coyote time (80ms) is too tight for casual accessibility.**
- 80ms ≈ 4.8 frames at 60fps. Celeste uses 100ms (6 frames). Most forgiving platformers use 100-150ms.
- Combined with the GDD's stated goal of "Rewind mechanic reduces frustration — newer players can undo mistakes," the tight coyote window contradicts the accessibility intent. Newer players need more forgiveness, not less, especially since Rewind isn't implemented yet.
- Recommendation: 100ms minimum, 120ms for the demo build.

#### Design: Minor

**12. Move speed during wall slide (80px/s) is ambiguous.**
- The wall slide caps `body.vy` at 80 and sets gravity to 0.3×. When a player releases from the wall, gravity returns to 1× and vy can spike. This creates an inconsistent feel where some wall releases feel like falling off a cliff and others feel floaty.
- A fixed wall-slide speed with consistent exit velocity would feel better.

**13. Dash cooldown (350ms) plus dash duration (150ms) means dash available every 500ms.**
- This is frequent enough to feel spammable but not infinite (limited to once per jump/ground touch). The GDD doesn't specify a cooldown, so this is plausible, but playtesting may show it's either too fast (dash-spam trivializes encounters) or too slow (tight windows require more frequent dashes). Worth flagging for tuning.

**14. Projectile lifetime (2s) at 400px/s = 800px range.**
- This far exceeds typical level width (960px for Level 1 at 60 tiles × 16px). Projectiles can cross almost an entire level. For shooter enemies placed mid-level, this means players on the opposite end can be hit without seeing the shooter. Consider reducing lifetime to 1-1.5s, or capping projectile range to screen width.

**15. No audio hooks in gameplay.**
- `AudioManager` has `playJump()`, `playLand()`, `playCollect()`, `playDamage()`, `playDeath()`, `playShoot()`, `playStomp()` methods with proper procedural synthesis.
- Zero calls to any of these exist in the engine or scene code.
- Similarly, no particle emissions are triggered by player actions (landing dust, jump poof, dash trail, hit sparks, death explosion).
- The game will feel silent and visually flat despite having all the infrastructure ready.

**16. No health upgrade or Chrono gauge upgrade systems.**
- GDD specifies health vessels (+1 HP, max 6) and Chrono Shard spending (+0.5s gauge per 5 shards). Neither system exists.
- These are the primary progression drivers across zones. Without them, there's no sense of character growth between levels.

---

### Edge Cases

**Player physics bypasses collision under high velocity.**
- `moveAndCollide` uses discrete AABB checks per frame. At 60fps, a player falling from max fall speed (900 px/s) moves 15px per frame. At 16px tile size, a 14px-wide player can pass through 1-tile-thin floors if positioned unluckily (tunneling). Bullet-through-paper is a real risk for thin platforms.
- Mitigation: Use swept collision or sub-stepped movement for the player.

**Dash + wall collision is untested.**
- During dash, `gravityScale = 0` and vy is forced to 0. If the player dashes into a wall at 1200 px/s, the `moveAndCollide` horizontal resolution snaps them against the tile. The dash timer keeps running, maintaining 0 vy. When dash ends, gravity resumes and the player drops. This is correct behavior, but falling from dash end -> collision within the same frame could cause a brief "stuck on wall" feel.

**Gauge recharge during transitions or pause.**
- If the game is paused, dt is 0, so gauge doesn't recharge. But if Chrono Burst was activated just before pause, the burst timer also stops. When unpaused, burst resumes with remaining duration. That's correct behavior, but draining powers (Slow, Rush) would also pause mid-drain, which is also correct. However, the recharge delay timer also pauses — so players can't pause to cheese gauge recharge. This is good design.

---

### Verdict

**Needs rework**

The engine's code architecture is sound (as the engineering review confirms), but from a **player experience perspective**, the core loop of Chronos Edge — time manipulation — is barely functional:

- **0 of 5 time powers fully work** as described in the GDD. Burst has no effect, Slow does nothing, Time Rush only affects the player, Rewind and Echo don't exist.
- **Dash is 40% shorter** than the GDD specs, breaking level geometry assumptions.
- **Double jump is always available**, removing the intended Zone 1 unlock progression.
- **Hazards (spikes, pits) are decorative** — falling doesn't kill you.
- **No sound or particles** are wired into gameplay, despite both systems being fully built.

What's here is a well-structured platformer skeleton with movement physics tuned to the right jump height. But the game's identity is in its time powers, and those need to be implemented at a gameplay-effect level (not just gauge tracking) before a player could meaningfully test the Chronos Edge experience.

**Recommended fix order:**
1. Implement Chrono Burst's gameplay effect (stagger enemies, slow projectiles) — simplest power, quickest win.
2. Implement Slow Field's gameplay effect (enemy/projectile slow, player speed reduction).
3. Add spike/hazard damage — without it, platforming has no stakes.
4. Implement Rewind with position history buffer and checkpoint rollback.
5. Fix dash speed to match GDD spec (2000 px/s or update the spec to 180px).
6. Wire audio hooks into player actions (jump, land, damage, collect, death).
7. Wire particle effects for juice (landing, dash trail, attack hit, death).
8. Gate double jump behind Crystal 1 unlock logic.

---

1. **Hoist constants out of render loops** — `colColors`, `heartSize`, etc. should be module-level const.
2. **Add try/catch to `clearSave()`** — `localStorage.removeItem` can throw in restricted mode.
3. **Remove dead save/load code from `levels.js`** — it's a level definition file, not a persistence layer.
4. **Add `entity.tiles` setup in `setupLevel()`** or remove the guard check from entity update methods.
5. **Wire `toggleSlowField` / `toggleTimeRush`** to usable inputs or remove them.
6. **Consolidate parallax rendering** — render parallax in `renderHUD()` or explicitly in screen space to avoid the double-translation bug.
7. **Add `cancelTimeout` in `stopMusic()`** — clear the pending `_beatTimeout`.
8. **Consider using `requestAnimationFrame` for music scheduling** instead of `setTimeout` for drift-free beats.

---

## Verdict

**Pass with changes**

The game is structurally sound — scene system, physics, entity architecture, and rendering pipeline are all well-architected. The critical issues are real (background disappearing at scroll > 320px, unreachable game mechanics) but have straightforward fixes. The major issues are largely dead code from either duplication or incomplete wiring.

Recommended fix order:
1. Fix the parallax double-translation (Critical #1) — background visibility
2. Wire or remove the unreachable time powers (Critical #2) — dead feature
3. Consolidate save/load systems (Critical #3) — maintenance debt
4. Clean up entity tile collision dead code (Major #4) — code surface

No blockers to shipping after these are addressed.
