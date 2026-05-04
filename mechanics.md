# CHRONOS EDGE — Mechanics Reference

**For the developer.** This document describes every game system in precise, implementable detail.

---

## 1. Player Movement — Exact Parameters

### 1.1 Ground Movement

| Property | Value | Notes |
|----------|-------|-------|
| Walk speed | 120 px/s | Slow, deliberate |
| Run speed | 200 px/s | Default movement speed |
| Run acceleration | 800 px/s² | Time to reach max: 0.25s |
| Run deceleration (release) | 1000 px/s² | Time to stop: 0.2s |
| Run deceleration (opposite) | 1400 px/s² | Friction when reversing |
| Air control | 70% of ground acceleration | 560 px/s² |
| Max air speed | 180 px/s | Slightly slower than ground |

### 1.2 Jump Parameters

| Property | Value | Notes |
|----------|-------|-------|
| Jump velocity | -320 px/s | Initial upward velocity |
| Jump hold time | 200ms | Window to hold for max height |
| Jump hold gravity reduction | 40% (400 → 240 px/s²) | Variable jump height |
| Gravity | 800 px/s² | Standard gravity |
| Max fall speed | 600 px/s | Terminal velocity |
| Coyote time | 80ms (5 frames) | Can jump briefly after leaving ground |
| Jump buffer | 100ms (6 frames) | Input buffered before landing |
| Jump height (tap) | ~64px (4 tiles) | Quick tap |
| Jump height (hold) | ~128px (8 tiles) | Full hold |
| Double jump height | ~96px (6 tiles) | Slightly less than first jump |
| Double jump velocity | -280 px/s | |

### 1.3 Wall Mechanics

| Property | Value | Notes |
|----------|-------|-------|
| Wall slide speed | 60 px/s | Slow descent |
| Wall slide gravity | 30% of normal | 240 px/s² while on wall |
| Wall jump off velocity (X) | 200 px/s | Away from wall |
| Wall jump off velocity (Y) | -280 px/s | Upward |
| Wall jump cooldown | 250ms | Per wall surface |
| Wall grab detection | 4px overlap | Must be moving toward wall |
| Wall grab angle | Touching wall + pressing toward it | Horizontal overlap > 0 |

### 1.4 Dash (Unlock — Fast-Forward Crystal)

| Property | Value |
|----------|-------|
| Dash duration | 150ms |
| Dash speed | 1200 px/s (not scaled, flat burst) |
| Dash distance | 180px |
| Air dash height change | 0px (horizontal only) |
| Dash cooldown | 350ms |
| I-frames during dash | Full invulnerability |
| Cancel into attack | Allowed (dash attack) |
| Cancel into jump | Not allowed (must finish dash) |

### 1.5 Collision Boxes

| State | Width | Height | Offset (from feet) |
|-------|-------|--------|-------------------|
| Idle / Run | 14px | 28px | Bottom edge = feet |
| Crouch | 14px | 18px | Bottom edge = feet |
| Jump (first frame) | 12px | 24px | Bottom edge = feet |
| Dash | 12px | 16px | Centered |
| Hitbox (taking damage) | 18px | 32px | Centered (slightly larger) |

---

## 2. Chrono Gauge System

### 2.1 Gauge Properties

| Property | Value |
|----------|-------|
| Maximum capacity (start) | 8.0 seconds |
| Maximum capacity (max upgrade) | 12.0 seconds |
| Recharge rate | 1s gauge per 1.5s real time (0.666x rate) |
| Recharge delay after power use | 0.5s (no recharge during power use) |
| Minimum gauge to activate any power | 0.5s (except Rewind: 3s minimum) |

### 2.2 Power Costs

| Power | Base Cost | Per Second | Minimum Gauge | Cooldown |
|-------|-----------|------------|---------------|----------|
| Chrono Burst | 0.5s | — | 0.5s | 1.0s |
| Rewind | Depends on rewind time | 1:1 with rewound time | 3.0s | 5.0s real time |
| Slow Field | 2.0s initial | 2.0s/sec | 2.0s | None |
| Time Rush | 1.0s initial | 1.0s/sec | 1.0s | None |
| Echo | 3.0s flat | — | 3.0s | 1.0s after Echo expires |

### 2.3 Power Mechanics — Detailed

#### Chrono Burst (Zone 1 unlock)
- Activates instantly on press (no startup frames)
- Creates a 240px radius pulse centered on player
- All enemies within radius: slowed to 40% speed for 500ms
- All projectiles within radius: slowed to 40% speed for 500ms
- Player animation: brief flash/ring effect (3 frames)
- Effect ends: ring dissipates outward
- Use case: panic button, close-quarters dodge

#### Rewind (Zone 2 unlock)
- On press: begins rewinding. Player position, velocity, and health recede
- Gauge drains at 1s per real second of rewind
- Maximum rewind: 3 real seconds (costs 3s gauge)
- On release: rewind stops, player returns to normal play at the earlier position
- Enemies and projectiles are NOT rewound — they continue normally
- Player can control movement during rewind (limited to 50% speed)
- If gauge runs out during rewind: rewind forced to stop
- Visual effect: screen desaturates, corruption overlay warps
- Use case: recover from mistakes, bait enemies into bad positions

#### Slow Field (Zone 3 unlock)
- Toggle: press to activate, press again to deactivate
- While active: gauge drains at 2s per second (8s max = 4s field time)
- All enemies within 480px (3 screen widths): 30% speed
- All projectiles within 480px: 30% speed
- Player speed: 80% of normal
- Player can attack normally during Slow Field
- Visual effect: blue tint overlay, time ripples on edges
- Use case: bullet hell sections, boss pattern navigation

#### Time Rush (Zone 4 unlock)
- Toggle: press to activate, press again to deactivate
- While active: gauge drains at 1s per second
- Player speed: 200%
- Enemy speed: 120%
- Projectile speed: 100% (unchanged)
- Player attacks: damage unchanged, animation speed matched to player speed
- Visual effect: speed lines on edges of screen, motion blur on player
- Use case: speed gauntlets, bypassing slow enemies, time trials

#### Echo (Zone 5 unlock)
- On press: creates a memory copy of the player
- Echo copies the last 2 seconds of player movement (position, velocity)
- Echo is frozen at the moment of creation (doesn't move)
- Echo persists for 4 seconds, then fades
- Echo deals 1 damage on contact with enemies (enemy HP amounts)
- Only one Echo active at a time
- Starting a new Echo replaces the old one
- Visual effect: ghostly cyan outline of player, semi-transparent
- Use case: boss damage while evading, hitting enemies behind obstacles

---

## 3. Combat System

### 3.1 Basic Attack (Temporal Slash)

| Property | Value |
|----------|-------|
| Damage | 1 (first two hits), 2 (third hit in combo) |
| Combo window | 400ms between hits |
| Combo reset | After 400ms of no attack, or on taking damage |
| Range | 32px horizontal arc (starts at player edge) |
| Arc height | 20px (hits at chest level) |
| Active frames | Frames 3–6 of 10 total animation frames |
| Recovery frames | Frames 7–10 (can move but not attack) |
| Hit pushback | Enemy pushed 40px away on hit |
| Combo pushback | Third hit pushes enemy 80px and stuns for 300ms |

### 3.2 Thrown Attack (Time Shard — Locked by default)

| Property | Value |
|----------|-------|
| Unlock condition | Find Time Shard upgrade in Zone 3 |
| Gauge cost | 0.5s per throw |
| Damage | 1 (hit), 2 (charged — hold 2 beats) |
| Velocity | 400 px/s |
| Arc | Slight gravity (100 px/s²), 30° max angle |
| Charged: piercing | Passes through first enemy, hits second |
| Range | Full screen width |

### 3.3 Damage & Invulnerability

- **I-frames:** 1.5 seconds (90 frames at 60fps) on taking damage
- **I-frame visual:** Player flashes (alternating alpha 0.3/1.0 every 3 frames)
- **Knockback on hit:** Player pushed 60px backward, brief stun (200ms)
- **No damage during dash** (full invulnerability)
- **No damage during rewind** (player is resetting, can't be hurt)

### 3.4 Enemy Design Patterns

Each enemy type should test a specific player skill:

| Enemy | HP | Behavior | Teaches |
|-------|----|----------|---------|
| Chrono-Grunt | 2 | Patrols back and forth. Jumps if player is above. | Basic combat |
| Spear-Sentry | 3 | Stationary, fires slow projectile every 2s. Rotates. | Timing attacks |
| Rift-Crawler | 1 | Scuttles on walls/ceilings. Fast. Fragile. | Wall awareness |
| Blink-Hound | 2 | Teleports toward player every 1.5s. | Prediction / Chrono Burst |
| Time-Warden | 4 | Shielded from front. Must attack from behind or use Slow Field. | Power synergy |
| Gravity-Wisp | 1 | Floats. Reverses player gravity if touched. | Environmental awareness |
| Chrono-Sapper | 2 | Steals 0.5s gauge on contact. Runs away from attacks. | Resource management |
| Echo-Sentry | 3 | Spawns a copy of itself on death. | Fight management |

---

## 4. Physics & Collision

### 4.1 Tile Grid

- **Tile size:** 16×16 pixels (internal)
- **Collision layer:** Binary (solid / non-solid)
- **One-way platforms:** Solid from top only. 8px "grab" from above
- **Slippery tiles:** Ice/friction tiles (friction multiplier: 0.3×)
- **Speed tiles:** Conveyor belts / wind tunnels (additive velocity)

### 4.2 Collision Resolution Order

1. Move X axis
2. Check X collisions → resolve (push out, zero X velocity if blocked)
3. Move Y axis
4. Check Y collisions → resolve (land or bonk head)
5. Check one-way platforms (Y only, only when moving down)
6. Check hazards (spikes, lava, insta-death zones)

### 4.3 Entity Collision

- Player hitbox vs enemy hitbox → player takes damage (if not in i-frames)
- Attack hitbox vs enemy hitbox → enemy takes damage, knockback
- Player hitbox vs projectile hitbox → damage
- Enemies can damage each other (useful for puzzle sections)

---

## 5. Save System

### 5.1 Save Data Structure (JSON)

```json
{
  "version": 1,
  "timestamp": 1712345678000,
  "zoneProgress": {
    "hub": { "completed": false, "checkpointIndex": 0, "secrets": [] },
    "zone1": { "completed": true, "checkpointIndex": 4, "secrets": ["flower", "fragment_1"] },
    "zone2": ...
  },
  "player": {
    "hP": 4, "maxHP": 4, "lives": 3, "score": 12345,
    "chronoGaugeMax": 8.0,
    "unlockedPowers": ["burst"],
    "shards": 12,
    "upgrades": []
  },
  "stats": {
    "totalDeaths": 42,
    "timePlayed": 7423,
    "totalShardsCollected": 67,
    "secretsFound": 5
  }
}
```

### 5.2 Save Triggers

- On reaching a new checkpoint
- On entering a hub zone
- On completing a zone
- On manual save at Chrono Gates

### 5.3 Save Storage (Electron)

- **File:** `%APPDATA%/ChronosEdge/save.json` (or equivalent OS paths)
- **Web fallback:** `localStorage` key `chronosedge_save`
- **Cloud sync:** Via Steam Cloud (file replaces localStorage when Steam overlay is active)

---

## 6. Score System

| Action | Points |
|--------|--------|
| Kill enemy | 100 × enemy tier (tiers 1-4) |
| Collect shard | 50 |
| Collect health vessel | 500 |
| Find Memory Fragment | 1000 |
| Find Time Flower | 5000 |
| Zone clear bonus | 10000 / (zone number) × difficulty_mult |
| Speed bonus | 5000 - (time_seconds × 10) (minimum 500) |
| 0-death zone bonus | 10000 |
| All secrets bonus | 5000 |

---

## 7. Camera System

### 7.1 Camera Properties

| Property | Value |
|----------|-------|
| Default zoom | 2x (320×180 visible area) |
| Follow target | Player, with deadzone |
| Deadzone | 48×48px centered on screen |
| Lerp speed (follow) | 0.08 (frame-independent, ~5 frames to catch up) |
| Look-ahead | 80px in direction of movement |
| Y look-ahead | 40px above player when airborne |
| Room bounds | Camera clamped to room rectangle |
| Screen shake (hit) | 4px, 200ms, decay |
| Screen shake (explosion) | 8px, 400ms, decay |
| Zoom out (boss) | 1.5x (more visible area for big fights) |

### 7.2 Parallax Layers

Layer 0 (furthest): Sky/mountains — scrolls at 0.1× camera speed  
Layer 1: Distant structures — scrolls at 0.3×  
Layer 2: Mid-ground — scrolls at 0.6×  
Layer 3: Foreground (player layer) — 1.0×  
Layer 4: UI — fixed position

---

## 8. Input Mapping — Defaults

### Keyboard

| Action | Primary | Secondary |
|--------|---------|-----------|
| Move Left | A | ← |
| Move Right | D | → |
| Jump | Space | W / ↑ |
| Attack (Slash) | J | Z |
| Dash | L | X |
| Time Power | K | C / Shift |
| Pause | Escape | P |
| Interact | E | Enter |

### Gamepad (Xbox Layout)

| Action | Button |
|--------|--------|
| Move | Left Stick / D-Pad |
| Jump | A |
| Attack | X |
| Dash | RB / Right Bumper |
| Time Power | LB / Left Bumper |
| Pause | Start |
| Interact | Y |
| Chrono Burst (quick) | B (tap, if Burst unlocked) |

---

## 9. Game States

```
TITLE → MAIN_MENU
MAIN_MENU → PLAYING (new or continue)
PLAYING → PAUSED
PLAYING → GAME_OVER (0 lives)
PLAYING → LEVEL_COMPLETE (zone cleared)
PAUSED → PLAYING (resume)
PAUSED → MAIN_MENU (quit)
GAME_OVER → MAIN_MENU
GAME_OVER → PLAYING (continue: retry from last checkpoint)
LEVEL_COMPLETE → PLAYING (next zone)
LEVEL_COMPLETE → MAIN_MENU
```

---

## 10. Engine Loop (Pseudocode)

```
function gameLoop(deltaTime):
  if state == PLAYING:
    processInput()
    updateTimePowers(deltaTime)
    updatePlayer(deltaTime)
    updateEnemies(deltaTime)
    updateProjectiles(deltaTime)
    updateParticles(deltaTime)
    checkCollisions()
    checkDeaths()
    updateCamera(deltaTime)
  render(deltaTime)
  requestAnimationFrame(gameLoop)
```

---

*This document is the definitive reference for all game mechanics. The developer should implement parameters exactly as specified here. Any parameter changes should be discussed before implementation.*
