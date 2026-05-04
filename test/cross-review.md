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

## Suggestions

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
