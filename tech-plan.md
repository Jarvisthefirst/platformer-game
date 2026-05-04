# CHRONOS EDGE — Technical Implementation Plan

**For the developer (worker2).** This is the step-by-step build plan. Build in order — each phase is testable on its own.

---

## Phase 0: Project Scaffolding

### 0.1 File Structure

```
chronos-edge/
├── index.html          # Single HTML file (Electron entry point)
├── main.js             # Canvas setup, game loop, input
├── engine/
│   ├── core.js         # Game loop, frame timing, state machine
│   ├── input.js        # Keyboard + gamepad input handling
│   ├── camera.js       # Camera follow, shake, parallax
│   ├── physics.js      # AABB collision, gravity, movement
│   ├── audio.js        # Web Audio API SFX + music
│   ├── particles.js    # Particle system
│   ├── resource.js     # Save/load, settings
│   └── renderer.js     # Canvas scaling, layer compositing
├── entities/
│   ├── player.js       # Player class: movement, combat, time powers
│   ├── enemy.js        # Enemy base class + types
│   ├── projectile.js   # Projectile base
│   ├── boss.js         # Boss base class + boss types
│   └── pickup.js       # Collectibles, checkpoints
├── levels/
│   ├── hub.js          # Zone 0 hub
│   ├── zone1.js        # Great Gearworks
│   ├── zone2.js        # Rift Expanse
│   ├── zone3.js        # Glass Cathedral
│   ├── zone4.js        # Speed Forge
│   ├── zone5.js        # Echo Chamber
│   └── final.js        # Chronos Throne
├── ui/
│   ├── hud.js          # In-game HUD
│   ├── menu.js         # Main menu, pause, game over
│   └── settings.js     # Settings screen
├── art/
│   ├── sprites.js      # All sprite drawing functions
│   ├── tilesets.js     # All tile data + drawing
│   └── effects.js      # Screen effects, overlays
├── package.json        # Node.js manifest for Electron
└── electron.js         # Electron main process
```

### 0.2 Phase 0 Deliverable

A blank canvas with a game loop running at 60fps, showing FPS counter, with basic keyboard input detection. Test in browser. ✓

---

## Phase 1: Core Engine

### 1.1 Game Loop (`engine/core.js`)

- RequestAnimationFrame loop with delta-time normalization
- Fixed timestep update: `dt = Math.min(deltaTime, 33.33)` (cap at 30fps worst-case)
- State machine: BOOT → TITLE → MENU → PLAYING → PAUSED → GAME_OVER → LEVEL_COMPLETE
- Each state has its own update/render functions

### 1.2 Renderer (`engine/renderer.js`)

- Create offscreen canvas: 320×180
- Main canvas fills the window (maintains aspect ratio)
- Draw call order: background → mid → terrain → entities → particles → UI
- `ctx.imageSmoothingEnabled = false` for pixel-perfect rendering
- Handle window resize: recalculate scale factor, re-center

```javascript
function calculateScale() {
  const scaleX = Math.floor(window.innerWidth / 320);
  const scaleY = Math.floor(window.innerHeight / 180);
  return Math.max(1, Math.min(scaleX, scaleY));
}
```

### 1.3 Input (`engine/input.js`)

- `InputManager` singleton class
- Keyboard: `keydown`/`keyup` events → map to action names
- Gamepad: `window.gamepadconnected` event, poll axes + buttons each frame
- Action map: `{ jump: false, attack: false, dash: false, power: false, left: false, right: false, up: false, down: false, pause: false, interact: false }`
- Key-repeat prevention (key just pressed vs held)
- Support remappable keys (stored in settings object)

### 1.4 Camera (`engine/camera.js`)

- Follows player with lerp smoothing
- Clamped to room boundaries
- Parallax layers: multiply draw offsets by scroll factor
- Screen shake: random offset that decays over time
- Zoom support for boss fights

### 1.5 Physics (`engine/physics.js`)

- AABB collision detection + resolution
- Tile collision: check 4 corners of player bounding box against tilemap
- One-way platforms (top-only collision)
- Gravity, friction, max fall speed
- Collision response order: resolve X, then Y
- Slope support: optional, not in MVP (flat tiles only)

### 1.6 Audio (`engine/audio.js`)

- **AudioContext** with oscillator-based SFX
- Define sounds as parameter objects:

```javascript
const SFX = {
  jump: { type: 'square', freq: 440, duration: 0.1, slide: 300 },
  attack: { type: 'sawtooth', freq: 220, duration: 0.15, noise: true },
  dash: { type: 'sine', freq: 880, duration: 0.08, echo: true },
  hit: { type: 'square', freq: 110, duration: 0.2, noise: true },
  death: { type: 'sawtooth', freq: 330, duration: 0.5, slide: -200 },
  collect: { type: 'sine', freq: 660, duration: 0.15, slide: 440 },
  power_on: { type: 'sine', freq: 440, duration: 0.3, slide: 880, echo: true },
};
```

- Pre-generate buffer sources for commonly played sounds
- Volume controls per channel (SFX, Music)
- Background music: procedural tone generator with 4 layers that fade in/out

### 1.7 Particles (`engine/particles.js`)

- Particle pool (max 200 particles in pool)
- Each particle: `{ x, y, vx, vy, life, maxLife, size, color, alpha, drawFunc }`
- Update: move, apply gravity (if any), reduce life, remove expired
- Draw: simple rect or circle at particle position
- Emitter functions: `emitBurst(x, y, count, config)`, `emitTrail(entity, config)`

### 1.8 Resource Management (`engine/resource.js`)

- Save/load game state from localStorage (web) or JSON file (Electron)
- Settings stored separately (volume, controls, display)
- Save format: see `mechanics.md` 5.1

### 1.9 Phase 1 Deliverable

A running game that shows:
- Scaled canvas with background color
- Player rectangle that moves with WASD/arrows, jumps with Space
- Camera follows player
- Gravity pulls player down
- Collide with floor tiles (hardcoded test room)
- FPS counter

---

## Phase 2: Player Character

### 2.1 Player Class (`entities/player.js`)

- Properties: position (float), velocity, acceleration, state, facing direction, HP, lives, score
- State machine: IDLE, RUNNING, JUMPING, FALLING, WALL_SLIDING, ATTACKING, DASHING, HURT, DEAD
- Movement: apply acceleration from input, friction when no input, clamp to max speeds
- Jump: detect coyote time, jump buffer, variable height
- Double jump: one extra (track `jumpsUsed`)
- Wall slide: detect wall contact + moving toward wall → reduce gravity
- Wall jump: set velocity away from wall + upward, cooldown

### 2.2 Attack System

- Attack state: not interruptible (brief), can buffer next input
- Combo timer: 400ms window after hit to continue combo
- Active frames: frames 3–6 of attack animation, check hitbox overlap
- Hitbox: rectangle extending from player in facing direction, 32×20px
- Knockback: enemy pushed away on hit
- Visual: slash arc drawn with canvas path (quarter-circle arc)

### 2.3 Character Drawing (`art/sprites.js`)

- Pixel drawing functions for each animation state
- Use Canvas path operations (fillRect, arc, lineTo) to render character
- Sprite data arrays for complex frames

### 2.4 Phase 2 Deliverable

Fully playable character:
- Move, jump (variable height), double jump
- Wall slide and wall jump
- Attack with combo
- Dash (with i-frames)
- Hit reaction + death + respawn
- All animations visible

---

## Phase 3: Time Powers

### 3.1 Chrono Gauge (`entities/player.js` extension)

- Gauge value (float, 0 to max)
- Recharge timer: when not using power, gauge increases at 0.666× speed
- Methods: `canUsePower(cost)`, `usePower(cost)`, `recharge(dt)`

### 3.2 Chrono Burst

- On press: check gauge (cost 0.5s)
- Create emitter that pulses outward (radius 240px over 500ms)
- Set `gameSpeed = 0.6` temporarily? No — simpler: tag all enemies/projectiles with `slowTimer`
- Tag enemies within radius: `enemy.tempSlow = 500ms; enemy.speedMult = 0.4`
- Tag projectiles similarly
- Visual: expanding ring particle effect, brief screen tint

### 3.3 Rewind

- On press (while gauge >= 3.0): store player state history every 4 frames (60fps → 15 states/second)
- Stores: `{ x, y, hp, velocity, timestamp }`
- While rewinding: read from history buffer, set player position/HP/velocity to previous state
- History buffer: circular buffer, 45 entries (3 seconds)
- Gauge drains at 1s per second while rewinding
- Release rewind: resume normal play
- Enemies unaffected (they continue moving)
- Visual: screen desaturates, particles flow backward toward player

### 3.4 Slow Field

- Toggle: on/off while held
- While active: gauge drains at 2s/s
- All enemies/entities within 480px get `speedMult = 0.3`
- Player gets `speedMult = 0.8` (slightly slower)
- Visual: blue screen tint at 20% alpha, time ripple at screen edges
- Time ripple: sinusoidal wave displacement on the edge of the screen

### 3.5 Time Rush

- Toggle: on/off while held
- While active: gauge drains at 1s/s
- Player speed *= 2.0
- Enemy speed *= 1.2
- Projectile speed unchanged
- Visual: motion lines from screen edges toward center (like speed lines in anime)

### 3.6 Echo

- On press (cost 3.0s): record player movement for last 2 seconds (store positions every 3 frames = ~40 position keys)
- Spawn ghost entity at recorded positions (frozen — doesn't animate)
- Ghost persists for 4 seconds, then fades
- Ghost has collision damage (1 HP damage on enemy contact)
- Only 1 ghost at a time
- Visual: semi-transparent cyan player overlay at freeze position

### 3.7 Time Power Drawing (`art/effects.js`)

- Full-screen overlay effects
- Particle effects for each power
- Gauge bar in HUD

### 3.8 Phase 3 Deliverable

All 5 time powers fully functional:
- Chrono Gauge displayed and drains/recharges correctly
- Each power works as specified
- Visual effects for each power
- Power cannot be used when gauge is insufficient

---

## Phase 4: Enemies & Combat

### 4.1 Enemy Base (`entities/enemy.js`)

```javascript
class Enemy {
  constructor(x, y, type) {
    this.x = x; this.y = y; this.type = type;
    this.hp = ENEMY_DATA[type].hp;
    this.speed = ENEMY_DATA[type].speed;
    this.state = 'idle';
    this.speedMult = 1.0; // Modified by time powers
    this.slowTimer = 0;
  }
  
  update(dt) {
    // Handle time power modifications
    if (this.slowTimer > 0) {
      this.speedMult = 0.4;
      this.slowTimer -= dt;
    } else if (!isGlobalSlow) {
      this.speedMult = 1.0;
    }
    // Movement logic (type-specific)
    this.move(dt * this.speedMult);
  }
}
```

### 4.2 Enemy Types

Implement in order:

1. **Chrono-Grunt** — Patrol back and forth between two points. Jump if player is above and within range. Simple.
2. **Spear-Sentry** — Stationary. Fires slow projectile every 2s toward player. Rotates. Easy.
3. **Rift-Crawler** — Scuttles on walls (changes surface at edges). Fast. Fragile. Check wall detection.
4. **Blink-Hound** — Teleports to a position near player every 1.5s. Pre-teleport indicator (flash for 300ms). Medium.
5. **Time-Warden** — Shielded from front. Use angle of player relative to Warden to check facing. Slow Field disables shield.
6. **Gravity-Wisp** — Float toward player. On contact: player gravity reverses for 1s. Disorienting.
7. **Chrono-Sapper** — Runs away from player. On contact: player loses 0.5s gauge. Priority target.
8. **Echo-Sentry** — On death: spawns 1 copy (reduced HP). May chain.

### 4.3 Projectiles (`entities/projectile.js`)

- Types: straight, homing (slight tracking), arc (gravity-affected)
- Collision with player: damage + knockback
- Collision with terrain: destroy (or ricochet for specific types)
- Affected by time powers (speedMult)

### 4.4 Pickups (`entities/pickup.js`)

- Chrono Shard: floating, sparkle particle. Player overlaps → collect, add to inventory.
- Health Vessel: larger, pulsing glow. Collect → maxHP +1, heal to full.
- Memory Fragment: book/scroll, rotation animation.
- Time Flower: glowing, particle aura. Unique per zone.
- Extra Life: red heart icon.

### 4.5 Damage & Death

- Player-enemy collision: if not in i-frames and not dashing → take damage, i-frames start
- Player death: HP reaches 0 → lives-- → respawn at checkpoint
- Enemy death: HP reaches 0 → death animation → add score → remove from entity list
- Checkpoint activation: overlap detection, save state, restore HP, visual effect

### 4.6 Phase 4 Deliverable

Combat is fun and functional:
- All 8 enemy types in game
- Projectile system working
- Pickups collectible and meaningful
- Damage/death/respawn cycle complete
- Time powers affect enemies correctly

---

## Phase 5: Level System

### 5.1 Tilemap Format

Levels defined as 2D arrays:

```javascript
const ZONE1 = {
  rooms: {
    '1-1': {
      tiles: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      ],
      entities: [
        { type: 'grunt', x: 160, y: 120 },
      ],
      width: 20,   // in tiles
      height: 10,  // in tiles
      bgColor: '#1a1a2e',
      music: 'zone1',
      nextRoom: { right: '1-2' },
      secret: false,
    },
    // ... more rooms
  },
  transitions: {
    '1-1': { right: '1-2', up: null, down: null, left: null },
    // ... define room connections
  }
};
```

- Tile types: 0 = air, 1 = wall, 2 = ground, 3 = platform, 4 = spike, etc.
- Room size: varies (8×8 to 30×20 tiles)
- Transitions: when player exits room edge, load next room

### 5.2 Room Transitions

- When player goes past left/right/up/down boundary → load adjacent room
- New room loaded: clear entities, load tilemap, spawn entities, move player to appropriate edge
- Transition effect: slide (200ms, new room slides in from edge)
- No loading screen (rooms are small, instant data load)

### 5.3 Entitiy Placement per Room

Each room defines which enemies, pickups, and interactables to spawn:

```javascript
entities: [
  { type: 'grunt', x: 80, y: 112, patrol: { left: 48, right: 144 } },
  { type: 'pickup', x: 160, y: 64, kind: 'shard' },
  { type: 'checkpoint', x: 192, y: 128 },
]
```

### 5.4 Creating the 5 Zones

Implement zones sequentially:

1. **Zone 1** — 16 rooms. Simple layouts. Focus on teaching mechanics.
2. **Zone 2** — 18 rooms. Vertical emphasis. Rifts (teleport tiles).
3. **Zone 3** — 20 rooms. Bullet-hell. Glass floors. Mirrors.
4. **Zone 4** — 20 rooms. Speed gauntlets. Conveyors. Crushers.
5. **Zone 5** — 18 rooms. Puzzles. Echo mechanics. Mirror mazes.
6. **Final** — 11 rooms. Gauntlet + boss.

### 5.5 Boss Rooms

Boss rooms are special:
- Locked doors (cannot leave until boss defeated)
- Boss entity spawned on room load
- Boss health bar shown at top of screen
- Arena boundaries (player can't leave)
- On boss death: doors unlock, exit path opens, reward appears

### 5.6 Level Drawing

- Render each tile at 16×16 position based on tilemap
- Tileset drawing functions in `art/tilesets.js`
- Background drawing: gradient + parallax shapes for each zone
- Animated tiles: gear rotation, crystal glow, lava pulse

### 5.7 Phase 5 Deliverable

All zones playable:
- Zone 1 fully built and playable from hub
- Room transitions work (slide effect)
- Enemies spawn correctly per room
- Checkpoints, pickups, and secrets in place
- Boss rooms with functioning doors

---

## Phase 6: UI & Menus

### 6.1 HUD (`ui/hud.js`)

- Health: heart icons (filled/empty)
- Score: right-aligned numeric display
- Lives: small player icons
- Timer: MM:SS format
- Chrono Gauge: horizontal bar with gradient fill (gold → red as gauge depletes)
- Active Power: icon + name + keybind hint below gauge
- Zone/Room indicator: "Z1-4" format
- All drawn with Canvas fillRect/text, no images

### 6.2 Main Menu (`ui/menu.js`)

- Animated title screen background (drawing gears + particles)
- Menu options as interactive text buttons
- Navigation: keyboard (arrow keys + Enter) and gamepad (D-pad + A)
- Hover/select animations (glow effect, scale 1.1×)
- Transitions to PLAYING state on "New Game" or "Continue"

### 6.3 Pause Menu

- Triggered by ESC / Start
- Game freezes (time doesn't pass)
- Semi-transparent dark overlay
- Options: Resume, Settings, Retry, Quit to Menu
- Retry: reset to last checkpoint

### 6.4 Settings (`ui/settings.js`)

- Tabs: Audio, Controls, Display, Gameplay
- Audio: SFX volume, Music volume (slider bars)
- Controls: Show current keybindings, allow remap (click → press new key)
- Display: Fullscreen toggle (via Fullscreen API), Scale (1x-4x integer), Show FPS
- Gameplay: Screen Shake toggle, Vibrant Mode toggle

### 6.5 Game Over Screen

- Red fade overlay (500ms transition)
- "TIME RAN OUT" centered
- Stats: Deaths this run, Score
- Options: Retry, Quit

### 6.6 Level Complete Screen

- Slow-motion trigger when boss dies
- Stats slide-in: Time, Deaths, Shards, Secrets, Score
- Grade letter display (S/A/B/C/D) with color
- Next Zone button

### 6.7 Phase 6 Deliverable

Full UI experience:
- Main menu → New Game → Hub
- HUD displays all info
- Pause → Resume / Settings / Quit
- Game Over → Retry
- Level Complete → Stats + Grade

---

## Phase 7: Boss Fights

### 7.1 Boss Framework (`entities/boss.js`)

```javascript
class Boss {
  constructor(x, y, config) {
    this.x = x; this.y = y;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.phase = 1;
    this.attackPattern = config.attacks;
    this.attackTimer = 0;
    this.currentAttack = null;
  }
  
  update(dt) {
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.currentAttack = this.selectAttack();
      this.attackTimer = this.currentAttack.cooldown;
    }
    this.executeAttack(dt);
    this.checkPhaseTransition();
  }
}
```

### 7.2 Boss Implementations

Implement in order:

1. **Gear Guardian** (Zone 1 mid-boss) — Simple pattern. 12 HP. 3 attacks (gear toss, shell slam, spike burst). Vulnerability windows.
2. **Void Tendril** (Zone 2 mid-boss) — 10 HP. Off-screen tentacle. Strikes from above/sides. Tell particles before each strike.
3. **Echo of Vex** (Zone 2 end-boss) — 20 HP. Mirror-movement + rift volleys. Phase shift at 50%.
4. **Crystal Warden** (Zone 3 mid-boss) — 15 HP. Bullet patterns. Slow Field makes it manageable.
5. **Timeless Sentinel** (Zone 3 end-boss) — 30 HP. 3 phases. Crystal Storm, Sweep, Mirror Shield, Timeless Rain.
6. **Forge Golem** (Zone 4 mid-boss) — 15 HP. Must attack during Time Rush. Arena shrinks.
7. **Racing Vex** (Zone 4 end-boss) — 25 HP across 5 rooms. Chase sequence.
8. **Memory Warden** (Zone 5 mid-boss) — 20 HP. Copies player's movement.
9. **Reflection** (Zone 5 end-boss) — 40 HP. Immune to direct damage. Echo-required.
10. **Vex, Time Breaker** (Final boss) — 50 HP across 3 phases. Uses ALL time powers.

### 7.3 Boss UI

- Health bar at top of screen during boss fights
- Phase indicator text ("Phase 2" fade-in)
- Boss name display on room entry

### 7.4 Phase 7 Deliverable

All 10 boss fights implemented:
- Attack patterns functional and balanced
- Phase transitions working
- Health bars displayed
- Boss defeat → checkpoint + transition

---

## Phase 8: Audio & Music

### 8.1 Procedural SFX (`engine/audio.js`)

Create these using Web Audio API oscillators + noise:

| Sound | Technique |
|-------|-----------|
| Jump | Square wave, fast pitch sweep up (440→660Hz) |
| Land | Noise burst (30ms), low-pass filter |
| Attack | Sawtooth + noise (80ms), slight pitch down |
| Dash | Filtered noise sweep (200Hz→4000Hz over 100ms) |
| Hit (player) | Square wave (110Hz, 200ms), heavy distortion |
| Hit (enemy) | Sine + square mix, pitch drops |
| Death | Sawtooth, pitch slide down (330→55Hz over 500ms) |
| Collect pickup | Sine, quick arpeggio (C-E-G-C over 150ms) |
| Chrono Burst | Low sine rumble + high sine sweep (300ms) |
| Rewind | Reversed-sounding noise (granular: play buffers backward) |
| Slow Field | Low hum (60Hz sine, 20% volume) |
| Time Rush | Rising pitch noise, Doppler effect |
| Echo | Ringing sine (440Hz, long decay, 30% reverb) |
| Checkpoint | Major chord arpeggio, rising (C major) |
| Boss roar | Low sine (40Hz) + noise, high reverb |
| Menu select | Quick click (noise burst 10ms) |
| Menu confirm | Rising two-tone beep |

### 8.2 Procedural Music

Use a 4-layer system:

- Layer 1 (Ambient): Low pad (filtered saw waves, slow modulation)
- Layer 2 (Rhythm): Simple percussion (noise bursts at tempo 120-140 BPM)
- Layer 3 (Melody): Square wave lead, pentatonic patterns
- Layer 4 (Danger): High sawtooth arpeggios, dissonant intervals, plays when enemies are near

Each zone has a different scale/tone:

| Zone | Scale | Tempo | Mood |
|------|-------|-------|------|
| Hub | C major | 90 BPM | Calm, ambient |
| Zone 1 | D minor | 110 BPM | Determined, mechanical |
| Zone 2 | F# minor | 100 BPM | Mysterious, vast |
| Zone 3 | E minor | 130 BPM | Intense, crystalline |
| Zone 4 | G minor | 150 BPM | Urgent, industrial |
| Zone 5 | C# minor | 120 BPM | Haunting, mirrored |
| Final | A minor with chromatic | 160 BPM | Desperate, epic |

### 8.3 Audio Architecture

```javascript
class AudioManager {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.sfxVolume = 0.8;
    this.musicVolume = 0.6;
    this.musicLayers = [null, null, null, null];
  }
  
  playSFX(name) {
    const config = SFX_LIBRARY[name];
    if (!config) return;
    // Create oscillator, apply envelope, connect to output
    this._playOscillator(config);
  }
  
  setMusic(zoneId) {
    // Fade out current music (200ms)
    // Start new music layers for zone
    // Each layer has its own gain node for independent volume
  }
  
  setDangerLevel(level) {
    // 0 = no enemies nearby (mute layer 4)
    // 1 = enemies nearby (layer 4 at 30%)
    // 2 = combat (layer 4 at 100%)
    // Transition over 500ms
  }
}
```

### 8.4 Phase 8 Deliverable

Full audio experience:
- All SFX play on correct actions
- Zone music plays and transitions
- Danger level increases near enemies
- Volume controls work
- AudioContext resumes on user interaction (browser autoplay policy)

---

## Phase 9: Save System & Polish

### 9.1 Save/Load

- Auto-save at checkpoints, zone transitions, and hub areas
- Save data to `localStorage` (or file in Electron)
- Load on "Continue" from main menu
- Save format includes: zone progress, player stats, inventory, settings

### 9.2 Score & Stats

- Track: deaths, time played per zone, total score, shards collected
- Display on Level Complete screen
- Store for leaderboard upload (future: HTTP POST to Steam backend)

### 9.3 Polish Pass

- Screen shake tuning (not too much, not too little)
- Particle effect tuning (not overwhelming)
- Camera smoothness tuning
- Input feel tuning (coyote time, jump buffer, cancel windows)
- Animation timing: all sprites smooth and readable
- Hit feedback: short hitstop (3 frames) on enemy contact — this is critical for game feel
- Death animation: player dissolves into particles
- Menu transitions: smooth 200ms cross-fades

### 9.4 Phase 9 Deliverable

Complete, save-enabled, polished game:
- Save/load works flawlessly
- Score tracking works
- Gameplay feels tight and responsive
- Visual polish applied throughout

---

## Phase 10: Steam & Distribution

### 10.1 Electron Wrapping

```javascript
// electron.js
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 540,
    resizable: true,
    fullscreenable: true,
    icon: 'icon.png',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });
  win.loadFile('index.html');
  win.setMenuBarVisibility(false);
  // Fullscreen toggle on F11
  // Steam overlay support
}

app.whenReady().then(createWindow);
```

### 10.2 package.json

```json
{
  "name": "chronos-edge",
  "version": "1.0.0",
  "description": "A precision time-manipulation platformer",
  "main": "electron.js",
  "scripts": {
    "start": "electron .",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.chronos.edge",
    "productName": "Chronos Edge",
    "directories": { "output": "dist" },
    "files": ["index.html", "game/**/*", "assets/**/*"],
    "win": { "target": "nsis" },
    "mac": { "target": "dmg" },
    "linux": { "target": ["AppImage", "flatpak"] }
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0"
  }
}
```

### 10.3 Steam Integration (Post-MVP)

- Steamworks SDK integration (via `steamworks.js` npm package)
- Achievements: trigger on game events → call Steam API
- Leaderboards: submit score on zone completion
- Cloud saves: store `save.json` to Steam Cloud
- Rich Presence: update player status

### 10.4 Distribution Checklist

- [ ] Create Steam store page (capsule images, description, trailer)
- [ ] Build Windows executable (electron-builder)
- [ ] Build macOS executable (code-sign + notarize)
- [ ] Build Linux AppImage + Flatpak
- [ ] Test on all 3 platforms
- [ ] Compress build (< 50 MB target)
- [ ] Deploy demo (Zone 1 only) to Steam + itch.io

### 10.5 Phase 10 Deliverable

Shipping product:
- Self-contained Electron app
- Runs on Windows/macOS/Linux
- Fullscreen, resizable, gamepad support
- Steam features ready for activation

---

## Implementation Order Summary

| Phase | Time Estimate | Key Milestone |
|-------|---------------|---------------|
| 0: Scaffolding | 1 day | Blank canvas + game loop |
| 1: Core Engine | 2–3 days | Physics, camera, rendering |
| 2: Player | 2 days | Movement, jump, attack, dash |
| 3: Time Powers | 3–4 days | All 5 powers + gauge |
| 4: Enemies | 3 days | 8 enemy types, projectiles, collectibles |
| 5: Levels | 5–7 days | 6 zones, room transitions, secrets |
| 6: UI & Menus | 2 days | Complete UI system |
| 7: Boss Fights | 3–4 days | All 10 bosses |
| 8: Audio | 2 days | SFX + procedural music |
| 9: Save & Polish | 2–3 days | Save system, feel, screenshake, hitstop |
| 10: Distribution | 1–2 days | Electron, Steam prep |

**Total: ~26–33 days (5–7 weeks for a skilled solo dev)**

---

## Key Architecture Decisions

1. **Single-file-for-web, modular-for-dev:** `index.html` bundles everything for web play. Dev uses separate files during development (modular). Build step concatenates + minifies.

2. **Procedural everything:** No external assets. Graphics drawn with Canvas API. Audio with Web Audio API. This means zero asset pipeline and infinite moddability (palette swaps, etc.).

3. **State-machine everything:** Player, enemies, bosses, game — all use state machines. Makes the code predictable and debuggable.

4. **Fixed timestep with delta-time:** Game logic at 60fps target. Delta-time capped at 33ms to prevent physics glitches on lag spikes.

5. **Room-based levels:** Not one giant map. Load/unload rooms on transition. This keeps memory low and makes level design modular.

6. **Circular buffer for Rewind:** 45 frames × state data. O(1) push/shift. No allocation during gameplay.

---

*Build in phase order. Each phase ends with a testable deliverable. Don't skip phases. Test each phase before moving on.*
