# CHRONOS EDGE — Game Design Document

**Version:** 1.0  
**Genre:** Side-scrolling Action-Platformer (Metroidvania-lite)  
**Target Platform:** Steam (Windows/macOS/Linux via Electron)  
**Reference Build:** HTML5 Canvas + JavaScript (single-file viable)  
**Target Framerate:** 60 fps  
**Estimated Dev Time:** 8–12 weeks (solo/team of 2)

---

## 1. Concept & Theme

### 1.1 High Concept

> A renegade timekeeper must reclaim stolen Chrono-Crystals from a fractured timeline. Master the flow of time itself — rewind mistakes, slow bullets, burst through enemies — and restore order before the timestream collapses.

**Chronos Edge** is a precision-action platformer built around a single, deep mechanic: **limited time manipulation**. The player doesn't just jump and shoot — they bend time around them. This creates a high-skill-ceiling loop where every encounter is a puzzle of positioning, timing, and resource management (your "Chrono Gauge").

### 1.2 Story / World

**Setting:** The Chronarium — a cosmic clockwork dimension that maintains the flow of time across all realities. It's a place of brass gears, crystalline conduits, floating mechanical islands, and corrupted time-rifts.

**Protagonist:** **Kaelen** — a Chrono-Forger, one of the ancient custodians who maintain the Chronarium. Not a chosen one; just a technician who got caught in a coup.

**Antagonist:** **Vex** — a rogue Chrono-Forger who has stolen the five Chrono-Crystals. Each crystal governs a aspect of time (Pause, Rewind, Slow, Fast-Forward, Echo). Vex wants to collapse all timelines into one — his own.

**Plot:**
1. Kaelen awakens after Vex's betrayal — the Chronarium is fractured, time-rifts everywhere
2. Recover the five Chrono-Crystals, each unlocking a new time-power
3. Chase Vex through increasingly corrupted zones of the Chronarium
4. Final confrontation where Vex uses all five crystals at once — a boss fight that's also a test of everything the player has learned

**Tone:** Hopeful-but-desperate. The world is beautiful in its decay. NPCs (other scattered Forgers) give context. No wall-of-text exposition — story is told through environmental storytelling, short NPC interactions, and visual set-pieces.

### 1.3 Target Audience

- **Primary:** Fans of precision platformers (Celeste, The End is Nigh, Super Meat Boy)
- **Secondary:** Metroidvania-lite fans (Ori, Hollow Knight) who enjoy exploration but also want tight, replayable levels
- **Casual appeal:** Time rewind mechanic reduces frustration — newer players can undo mistakes, speedrunners can optimize

### 1.4 Art Direction

**Style:** High-contrast pixel art with modern lighting effects (glow, bloom, particles).

- Resolution: 320×180 internal → upscaled 2x–4x to target display
- Palette: Clockwork brass/gold, deep blues and purples for time effects, rich teal for safe areas, corrupted red/purple for enemy zones
- Characters: 24–32px tall, expressive animations (idle breath, landing impact, dash trail)
- Backgrounds: Multi-layer parallax with depth (gear mechanisms in back, floating structures mid, interactive platforms front)
- UI: Clean, minimalist pixel font. HUD elements are diegetic where possible (Chrono Gauge glows on the character's arm)

**Reference aesthetics:** *Celeste* (precision feel), *Hollow Knight* (atmosphere), *Katana Zero* (time effects + neon).

---

## 2. Core Mechanics

### 2.1 Movement

| Ability | Default | Unlock | Description |
|---------|---------|--------|-------------|
| Walk / Run | ✓ | — | 8-directional (air control at 70% ground speed) |
| Jump | ✓ | — | Variable height (hold longer = jump higher, max 3 tile height) |
| Double Jump | — | Crystal 1 (Pause) | One extra mid-air jump |
| Wall Slide | ✓ | — | Slide down walls at reduced speed |
| Wall Jump | ✓ | — | Leap off walls (cooldown 250ms per wall) |
| Dash | — | Crystal 2 (Fast-Forward) | Horizontal burst, 300px in 150ms, i-frames during |
| Air Dash | — | Crystal 2 | Dash in any direction while airborne (once per jump) |

### 2.2 Time Manipulation — The Core Mechanic

The Chrono Gauge is a resource bar (max 8 seconds). Time powers consume it. The gauge recharges at 1s per 1.5s of real time. All time powers **pause** gauge recharge while active.

| Power | Crystal | Cost/sec | Duration | Effect |
|-------|---------|----------|----------|--------|
| **Chrono Burst** | 1 (Pause) | 0.5s burst cost | Instant | Brief slow-field around player (500ms), enemies stagger, projectiles slow by 60% |
| **Rewind** | 2 (Rewind) | 1s per second rewound | Variable | Reverses player position & health to checkpoint. Does NOT rewind enemies. Max 3s rewind per use. Cooldown: 5s real time between rewinds |
| **Slow Field** | 3 (Slow) | 2s/sec | Toggle/held | All enemies & projectiles in screen range slow to 30% speed. Player moves at 80% speed |
| **Time Rush** | 4 (Fast-Forward) | 1s/sec | Toggle/held | Player moves at 200% speed. Enemies at 120%. Projectiles unchanged. Used for speed-running sections and dodge patterns |
| **Echo** | 5 (Echo) | 3s flat cost | 4s duration | Spawns a frozen copy of the player's last 2s of movement. Echoes deal damage on contact. One at a time |

**Design notes:**
- Enemies are paused during Rewind but not reversed — the player rewinds themself, not the world
- Slow Field + Dash is a powerful combo: dash through slowed bullet patterns
- Echo is the "boss killer" — place it to hit a boss while you focus on dodging
- The gauge system means players must choose *when* to use powers, not just spam them

### 2.3 Combat

**Primary Attack:** Temporal Slash — a short-ranged energy blade attack. Does 1 damage. 3-hit combo (1, 1, 2 damage). No attack cooldown but brief recovery on miss.

**Secondary Attack (unlock):** Time Shard — a thrown projectile (consumes 0.5s Chrono gauge). Travels in an arc. 1 damage. Can be charged (hold) for 2 damage and piercing.

**Melee priority:** The slash has active frames on startup (frames 3–6 of a 10-frame animation). Enemies hit during active frames are pushed back slightly. This creates a rhythm — attack, dodge, attack.

**No health regen:** Health pickups are rare. Health refills only at checkpoints.

### 2.4 Health & Damage System

- **Health:** 4 HP (maximum, upgradeable to 6 via collectibles)
- **Damage:** Most enemies = 1 HP. Bosses = 1-2 HP per hit
- **Hazards:** Spikes = instant kill. Lava = 1 HP per 0.5s
- **Death:** Respawn at last checkpoint. Death count tracked for leaderboard scoring
- **I-frames:** 1.5s invulnerability after taking damage (screen flash)

### 2.5 Collectibles & Upgrades

| Collectible | Per Zone | Purpose |
|-------------|----------|---------|
| Chrono Shards | 15 | Currency. Spend at save points to upgrade gauge capacity (+0.5s per 5 shards) |
| Health Vessels | 2 | Permanent +1 max HP |
| Memory Fragments | 3 | Lore items. Piece of backstory for Kaelen & Vex |
| Time Flowers | 1 | Hidden in every zone. Collecting all 5 unlocks the true ending |
| Bonus Lives | 0–2 per zone | Extra life (capped at 9) |

### 2.6 Checkpoints & Save System

- **Auto-save:** At the start of each zone
- **Checkpoints:** 3–5 per zone. Activates on touch. Restores HP to full
- **Manual save:** At Chrono Gates (hub area). Spend Chrono Shards here
- **Save file:** Single save slot (Slot A), plus a "Save & Quit" option
- **Retry:** Instant respawn at last checkpoint. No loading screen (sub-100ms)

### 2.7 Lives System

- Start with 3 lives
- Die = lose one life, respawn at checkpoint
- 0 lives = Game Over → return to title screen (progress saved at last gate)
- Extra lives from collectibles (capped at 9)
- Goal: lives are a tension mechanic, not a punishment. Game Over is rare but meaningful

---

## 3. Level Design

See `levels.md` for full level-by-level layouts.

### 3.1 Overview

- **Total zones:** 5 main zones + 1 hub + 1 final boss zone = **7 areas**
- **Total rooms:** ~100 rooms across all zones
- **Playtime:** 4–6 hours for first playthrough (2–3 hours on replay)

### 3.2 Zone Structure

Each zone follows: Hub → 4–6 sub-rooms → Mid-boss → 4–6 sub-rooms → Zone Boss → Exit to next hub

### 3.3 Difficulty Curve

Zone 1: Pause → Introduction of mechanics. Gentle difficulty  
Zone 2: Rewind → Medium difficulty. Rewind is forgiving so challenges get tighter  
Zone 3: Slow → Hard. Bullet-hell-ish patterns, require slow-field mastery  
Zone 4: Fast-Forward → Very hard. Speed gauntlets, one-way passages, timed sequences  
Zone 5: Echo → Expert. All powers required. Puzzle-platformer with combat  
Final Boss: Ultimate test — all powers, no mercy

### 3.4 Secrets

- Hidden Time Flowers (1 per zone) — require use of time powers in unexpected ways
- Secret rooms (breakable walls, hidden paths behind waterfalls)
- Speed-run medals (beat room in under N seconds → unlock leaderboard submission)
- Bonus challenge rooms (no powers allowed, pure platforming)

---

## 4. Technical Specifications

See `tech-plan.md` for detailed implementation plan.

### 4.1 Target Platforms

- **Primary:** Steam (Windows/macOS/Linux via Electron wrapper)
- **Web:** itch.io / Steam page demo (direct browser play)
- **Mobile:** Not targeted (controls require precision)

### 4.2 Engine & Frameworks

- **Engine:** Custom HTML5 Canvas 2D renderer (pure JavaScript)
- **No external libraries** — everything from scratch (input, physics, audio, particles, camera)
- **Target:** 60 fps locked. Graceful degradation to 30fps on low-end hardware

### 4.3 Rendering

- Internal resolution: 320×180 (16:9)
- Rendering: Nearest-neighbor upscaling to window size
- Layers: Background (3 parallax) → Mid (interactive) → Foreground (decorative) → Entities → Particles → UI
- Tile size: 16×16 pixels
- Tilemap: 2D array, collision layer + visual layer

### 4.4 Input

- **Keyboard:** WASD/Arrow keys movement, Space/Z jump, X/K attack, C/L dash, Shift time power
- **Gamepad:** Full Xbox/PS layout support via Gamepad API
- **Remappable controls:** Yes (saved to localStorage)

### 4.5 Audio

- **SFX:** Web Audio API — procedurally generated (oscillator + noise + filters)
- **Music:** Web Audio API — procedural music system (layered tracks that intensify with danger)
- **Required sound types:** Jump, land, attack, hit, death, dash, each time power, menu confirm/cancel, checkpoint, collectible, boss roar

### 4.6 Performance Targets

- **60 fps** on any device with a modern browser (Chrome, Firefox, Safari, Edge)
- **Memory:** < 200 MB RAM
- **Storage:** Single HTML file + assets minified into data URIs (< 5 MB total)
- **Load time:** < 2 seconds on decent connection

---

## 5. Audio & Visuals

See `art-spec.md` for detailed art production guide.

### 5.1 Visual Style Summary

- 16×16 tileset base, 4-directional character sprites with 8-directional aiming
- 8–16 frame animations for player (idle, run, jump, fall, attack, dash, death, time-power activation)
- Palette: ~32 color palette per zone, with shared global palette for UI & player
- Particle system for: landing dust, hit sparks, time-power glow, death explosion, checkpoint activation, collectible sparkle

### 5.2 Audio Style Summary

- 8-bit/chiptune style intentionally — fits pixel art
- Procedural generation means zero download size for audio
- Music is dynamic: ambient layer + rhythm layer + danger layer (intensity based on nearby enemies)
- SFX: Short, punchy. Every action has a satisfying sound

---

## 6. UI/UX

### 6.1 Main Menu

- Title screen with animated background (parallax gears, flowing time energy)
- Options: New Game, Continue, Level Select (post-game), Settings, Credits, Quit
- Title animation: subtle, time-themed particles floating upward

### 6.2 HUD (In-Game)

```
┌─────────────────────────────────────────────────────────────┐
│ ♥♥♥♥   SCORE: 012345   LIVES: 3    ⏱ 22:47   ZONE 1-4    │
│                                                             │
│              [████████░░] 6.5s / 8.0s (Chrono Gauge)        │
│                                                             │
│         CURRENT POWER: SLOW FIELD (3) Press Shift           │
└─────────────────────────────────────────────────────────────┘
```

- HUD is minimal, positioned top-left
- Chrono Gauge is prominent — it's the most important resource
- Active time power shown below gauge with keybind hint
- Timer shows real-time played (for speedrun tracking)

### 6.3 Pause Menu

- **ESC / Start** pauses the game (time stops, screen darkens 40%)
- Options: Resume, Settings, Retry from Checkpoint, Exit to Menu
- Settings sub-menu: Volume (SFX + Music sliders), Controls (remap), Display (fullscreen toggle, resolution scale), Vibrant Mode (accessibility option: higher contrast)

### 6.4 Game Over / Level Complete

**Game Over:** Full-screen red-fade effect. "TIME RAN OUT" text. Options: Retry, Exit to Menu

**Level Complete (Zone Clear):**
- Slow-motion effect on last enemy/boss defeat
- Stats screen: Time, Deaths, Shards Collected, Secrets Found, Score
- Grade: D → C → B → A → S (based on time + deaths + secrets)
- Option: Continue to next zone

### 6.5 Settings

| Setting | Options | Default |
|---------|---------|---------|
| SFX Volume | 0–10 slider | 8 |
| Music Volume | 0–10 slider | 6 |
| Screen Shake | On/Off | On |
| Fullscreen | On/Off | On |
| Resolution Scale | 1x, 2x, 3x, 4x | 2x |
| Show FPS | On/Off | Off |
| V-Sync | On/Off | On |
| Controls (Keyboard) | Remappable | Default |
| Controls (Gamepad) | Remappable | Default |
| Vibrant Mode | On/Off | Off |

---

## 7. Steam Readiness

### 7.1 Steam Achievements (Concept List)

1. **First Step** — Complete Zone 1
2. **Rewind** — Complete Zone 2
3. **Slow Burn** — Complete Zone 3
4. **Full Speed** — Complete Zone 4
5. **Echoes** — Complete Zone 5
6. **The End of Time** — Defeat Vex
7. **True Ending** — Collect all Time Flowers and defeat Vex
8. **Speed Demon** — Complete any zone in under 5 minutes
9. **Perfect Run** — Complete any zone with 0 deaths
10. **Glass Cannon** — Complete the game without upgrading health
11. **Shard Hoarder** — Collect all Chrono Shards in one zone
12. **Master of Time** — Complete the game with S rank on all zones
13. **Immortal** — Go through the entire game without dying
14. **Time Stands Still** — Use Rewind 100 times total
15. **Pacifist?** — Complete a zone without attacking any enemy
16. **Echo Chamber** — Have 3 Echoes on screen at once (requires strategic reload usage)
17. **Wallflower** — Wall-jump 100 times
18. **Secret Seeker** — Find all 5 Time Flowers and 10 Memory Fragments

### 7.2 Leaderboards (Concept)

- Per-zone leaderboard: best time (speedrun mode)
- Per-zone leaderboard: highest score (score = time bonus + shards + deaths penalty)
- Full-game leaderboard: any%
- Full-game leaderboard: 100% (all secrets + all shards)
- Runs authenticated by a unique game seed (anti-cheat: runs are recorded as replay data)

### 7.3 Controller Support

- Full Xbox 360/One/Series and PS4/PS5 layout support
- Steam Input API for button prompts that match the controller
- Deadzone sliders for analog sticks
- D-pad supported for movement (preferred by speedrunners)
- Menu navigation entirely controller-compatible

### 7.4 Resolution & Display

- Internal resolution 320×180 → upscales cleanly to any resolution
- 16:9 native, 16:10 and 4:3 letterboxed with decorative borders
- Fullscreen exclusive mode (via Electron)
- Windowed mode with resizeable window
- UI scales with resolution

### 7.5 Steam Integration Points

- **Overlay:** Full Steam Overlay support (via Electron + Steamworks SDK)
- **Cloud Saves:** Save file stored in `%APPDATA%/ChronosEdge`, synced via Steam Cloud
- **Screenshots:** F12 screenshot support (captures at native resolution)
- **Rich Presence:** Shows current zone, death count, and time played
- **Workshop:** Potential future support for custom level packs (JSON tilemap format)

### 7.6 Distribution

- **Electron wrapper:** Self-contained executable. No external dependencies
- **Size target:** < 50 MB download (single HTML file + Electron runtime compressed)
- **Platform builds:** Windows (x64), macOS (Universal), Linux (AppImage + Flatpak)
- **DRM:** None. Trust-based. Achievements/leaderboards require Steam connection

---

## 8. Monetization & Pricing

- **Price:** $9.99 USD (launch), $7.99 (launch week discount)
- **No microtransactions** — complete game, single purchase
- **Demo:** First zone free (on Steam + itch.io)
- **Post-launch:** Free content updates (bonus challenge rooms, speedrun mode, new game+)

---

## 9. Vision Summary

**Chronos Edge** is a love letter to precision platformers. The time manipulation mechanic isn't a gimmick — it's the *engine* of the game. Every level, every enemy, every challenge is built around the question: "How does this interact with the flow of time?"

The game respects the player's time (no filler, no grind) and their skill (fair but demanding). The rewind mechanic lowers frustration for newcomers while the speedrun scene will find endless depth in optimizing gauge usage.

It can be built by one developer in 8–12 weeks. It's ambitious but achievable. And it has a hook that sets it apart on Steam.
