# CHRONOS EDGE — Level Design Document

**Total zones:** 5 main + 1 hub + 1 final = 7 areas  
**Total rooms:** ~100  
**Playtime:** 4–6 hours first playthrough  

---

## Zone 0: The Chronarium Hub

**Theme:** Central clockwork cathedral. Safe zone. No enemies initially.  
**Size:** 12 rooms  
**Power unlocked:** None (tutorial only)

### Layout & Function

```
 [Zone 1] [Z2]  [Z3]
    |       |     |
    +---[Chrono Gate]---+
              |
         [Main Hall]
              |
         [Tutorial Room]
              |
         [Entry / Save]
```

| Room | Purpose |
|------|---------|
| Entry | Player spawns here. Save point. |
| Tutorial Room | Forced first room. Teaches: move, jump, wall slide, basic attack. Timed doors that open when you reach them. |
| Main Hall | Central hub. Vex's betrayal cutscene plays here on first visit. |
| Chrono Gate | Save point + upgrade shop (spend shards to upgrade gauge). Portal to each unlocked zone. |
| NPC Alcoves | 3 small rooms with surviving Forgers. One per NPC visited. |

### NPCs

1. **Oren** — "The gears are slowing, Forger. Vex took the Pause Crystal. The Great Gear in Zone 1 has stopped." (Direction hint)
2. **Lyra** — "I saw Vex heading toward the Echo Chamber. But the Rift Bridges are broken. You'll need the Rewind Crystal to cross the fractures." (Lore + progression hint)
3. **Moss** — "I don't know if you'll make it. But if you do... tell Vex I hope he remembers the taste of real tea." (Emotional gut-punch, late game)

---

## Zone 1: The Great Gearworks

**Theme:** Brass and steam. Massive clockwork gears, steam vents, rising platforms.  
**Power unlocked:** **Chrono Burst** (given at start of zone as tutorial)  
**Difficulty:** Easy (introductory)  
**Rooms:** 16  
**Estimated time:** 30–45 min  

### Power Tutorial (First Room)

- Room 1-1: Empty room with time crystals floating in the air. A Chrono Burst activator crystal sits in the center.
- Text prompt: "Press [K] to release a Chrono Burst. Time slows around you."
- Three floating platforms above a spike pit. Burst slows the moving platforms so you can time your jumps.
- Collectible shard visible behind a grate that opens only when Burst is active nearby.

### Room-by-Room Plan

| Room | Theme | Enemies | Challenge | Collectibles |
|------|-------|---------|-----------|--------------|
| 1-1 | Tutorial: Move + Jump | None | Simple gaps, spike introduction | — |
| 1-2 | Tutorial: Wall Jump | None | Narrow shaft with wall jumps | Shard ×2 |
| 1-3 | Tutorial: Chrono Burst | None | Moving platforms + Burst timing | Shard ×1 |
| 1-4 | Gears Crossing | Grunt ×2 | Gears spin, jump between teeth | Shard ×1 |
| 1-5 | Steam Vents | Grunt ×3 | Steam pushes player up. Time jumps | — |
| 1-6 | Vertical Ascent | Spear-Sentry ×1 | Climb using rising platforms + gears | Memory Fragment #1 |
| 1-7 | **Mid-boss:** Gear Guardian | Boss | Stationary gear construct. Opens shell to attack every 4s. Burst extends vulnerability window | — |
| 1-8 | Grate Run | Grunt ×4 | Horizontal dash section. Spike pits between gear bridges | Shard ×2 |
| 1-9 | Pressure Room | Chrono-Sapper ×2 | Floor spikes rise and fall. Must move constantly | — |
| 1-10 | Secret Room (hidden) | None | Behind breakable gear in 1-8. Platforming challenge, no powers | Time Flower #1 |
| 1-11 | Crystal Hall | Grunt ×2, Spear-Sentry ×1 | Narrow corridor. Projectile dodging practice | Shard ×2 |
| 1-12 | Chamber of Pause | None | Teach Burst on timed obstacles. Gears that freeze/open with Burst | Shard ×1 |
| 1-13 | The Jump Gauntlet | Rift-Crawler ×3 | Moving platforms over infinite pit | — |
| 1-14 | Boss Antechamber | Grunt ×2, Blink-Hound ×1 | Mixed enemy encounter. Save point + health refill | Health Vessel #1 |
| 1-15 | **Boss: Vex (Phase 1 - Fake)** | Boss | Vex fight with only Pause crystal. He uses slow-time counter. Player must dodge + burst | — |
| 1-16 | Crystal Retrieved | None | Collect Pause Crystal. Cutscene. Exit to Hub | — |

### Boss: Gear Guardian (Mid-Boss)

- HP: 12
- Arena: Flat platform (600×240 px). Two floating platforms.
- Attacks:
  1. **Gear Toss** (every 3s): Throws a gear that bounces twice then disappears. Telegraphed by 0.5s glow.
  2. **Shell Slam** (every 5s): Closes shell, drops to ground. Creates shockwave (jump over).
  3. **Spike Burst** (under 50% HP): Fires 3 spikes in a fan pattern.
- Vulnerability: Shell opens for 1.5s after attacks. Chrono Burst extends to 2.5s.
- Strategy: Burst when shell opens. Get 2-3 hits per Burst.

---

## Zone 2: The Rift Expanse

**Theme:** Floating islands in a void. Rifts in spacetime. Corrupted sky.  
**Power unlocked:** **Rewind** (mid-zone)  
**Difficulty:** Medium  
**Rooms:** 18  
**Estimated time:** 45–60 min  

### Design Focus

- Large vertical drops with floating platforms
- Rifts that teleport player to linked rooms
- Rewind is introduced as a safety net (fall off? Rewind!)
- Puzzles that require falling and rewinding to reach new paths

### Key Rooms

| Room | Challenge | Notes |
|------|-----------|-------|
| 2-1 | Intro: bridging gaps with Rewind | Platform that crumbles after standing on it for 2s. Rewind to try again |
| 2-4 | Rift Maze | Three rifts that cycle positions. Must figure out correct order to reach mid-boss |
| 2-7 | **Mid-boss: Void Tendril** | Tentacle boss. Hits from off-screen. Rewind to undo damage |
| 2-10 | Falling Gauntlet | 8-screen vertical drop. Platforms and enemies on the way down. Must Rewind to reach side chambers |
| 2-12 | Secret Room | Hidden behind waterfall in 2-10. Jump into void at specific point → rift to secret. No powers | Time Flower #2 |
| 2-16 | **Boss: Echo of Vex** | Vex's echo projection. Uses copy of player's movements | — |

### Boss: Echo of Vex

- HP: 20
- Arena: Wide circular platform. Void around edges.
- Attacks:
  1. **Mirror:** Echo copies player's position mirror-style (counter-wall).
  2. **Rift Volley:** Opens 3 rifts that fire projectiles in sequence.
  3. **Phase-shift** (under 50%): Echo becomes invisible for 1s, reappears near player.
- Strategy: Rewind is useless here (Echo mirrors you — rewind mirrors too). Use raw combat and positioning.
- Reward: Rewind Crystal.

---

## Zone 3: The Glass Cathedral

**Theme:** Crystalline time-conduit. Transparent floors over cosmic vistas. Shattered mirrors.  
**Power unlocked:** **Slow Field** (mid-zone)  
**Difficulty:** Hard  
**Rooms:** 20  
**Estimated time:** 60–90 min  

### Design Focus

- Bullet hell patterns — this is the "filter zone"
- Slow Field is introduced as mandatory for some sections
- Reflective puzzles (mirrors that redirect lasers/beams)
- Breakable glass platforms

### Key Rooms

| Room | Challenge | Notes |
|------|-----------|-------|
| 3-1 | Intro: Slow Field | Slow-motion tutorial with fast projectiles. "You can't outrun them. Slow them down." |
| 3-3 | Glass Floor Puzzle | Floor shatters after 1s of standing. Slow Field gives you time to cross before shattering |
| 3-6 | Laser Refraction | Mirrors + lasers. Redirect laser to open gate. Slow Field helps dodge while positioning mirrors |
| 3-8 | **Mid-boss: Crystal Warden** | Shoots spread of crystals in waves. Slow Field required to navigate. 4 HP/damage phase |
| 3-10 | Bullet Hell Corridor | 15-second corridor with rotating turrets. Slow Field makes it manageable |
| 3-14 | Secret Room | In 3-10, dodge into a false wall while Slow Field is active. Hidden alcove | Time Flower #3, Health Vessel #2 |
| 3-18 | **Boss: The Timeless Sentinel** | Massive construct. Combines slow bullets + fast melee sweeps | — |

### Boss: The Timeless Sentinel

- HP: 30
- Arena: Large glass chamber. Shatterable floor edges.
- Attacks:
  1. **Crystal Storm** (phase 1): 8 projectiles in radial pattern, repeats every 2s.
  2. **Sweep** (phase 1): Arm sweeps left half of arena. Jump over.
  3. **Mirror Shield** (phase 2, under 60%): Reflects attacks unless Slow Field active.
  4. **Timeless Rain** (phase 3, under 30%): Arena-wide bullet rain with small gaps.
- Strategy: Slow Field for projectiles. Dash through sweeps. Attack in Slow Field windows.
- Reward: Slow Crystal, Time Shard upgrade.

---

## Zone 4: The Speed Forge

**Theme:** Industrial factory. Conveyor belts, pistons, crushers. High-speed sections.  
**Power unlocked:** **Time Rush** (given early)  
**Difficulty:** Very Hard  
**Rooms:** 20  
**Estimated time:** 60–90 min  

### Design Focus

- Speed is the key — mandatory Time Rush sections
- Conveyor belts that change direction
- Crushers that require precise timing (Time Rush to go between them)
- "Speedrun rooms" — no enemies, pure platforming, try to beat a target time

### Key Rooms

| Room | Challenge | Notes |
|------|-----------|-------|
| 4-1 | Tutorial: Time Rush | "The forge requires speed. Use [K] to rush through closing doors." |
| 4-3 | Crusher Corridor | 4 crushers in a row. Time Rush to clear each cycle |
| 4-5 | Belt Maze | Conveyor belts moving in complex patterns. Normal speed = impossible path. Time Rush lets you fight momentum |
| 4-7 | **Mid-boss: Forge Golem** | Must attack during Rush. Attacks are slow but arena shrinks over time |
| 4-10 | The Speed Gauntlet | 12-screen horizontal platforming. No enemies. Just speed. Timer on screen. Secret path at target time |
| 4-14 | Secret Room | In 4-10, reach the end in under 12 seconds → gate opens | Time Flower #4 |
| 4-18 | **Boss: Racing Vex** | Vex fights you while also speedrunning. You must chase him through 5 rooms consecutively | — |

### Boss: Racing Vex

- HP: 25
- Arena: 5 linked rooms, each about 2 screens wide.
- Mechanics: Vex is always 1 room ahead. You chase. Each room has obstacles + Vex's afterimages that attack.
- Room 1: Standard platforming
- Room 2: Crusher gauntlet
- Room 3: Bullet corridor
- Room 4: Moving platforms over void
- Room 5: **Final stand** — Vex fights directly. Uses Time Rush too.
- Strategy: Time Rush to catch up. Save gauge for boss room (room 5).
- Reward: Fast-Forward Crystal.

---

## Zone 5: The Echo Chamber

**Theme:** Haunted mirrors. Infinite reflections. Temporal anomalies. Player's past selves appear as enemies.  
**Power unlocked:** **Echo**  
**Difficulty:** Expert  
**Rooms:** 18  
**Estimated time:** 60–90 min  

### Design Focus

- Puzzle-platformer with time echo mechanics
- Enemies include "Echoes of player" — the player must outsmart their own patterns
- Memory rooms: rooms that change layout based on player's past actions
- Corridors of mirrors: must use Echo to hit switches on both sides

### Key Rooms

| Room | Challenge | Notes |
|------|-----------|-------|
| 5-1 | Tutorial: Echo | "Create an echo of yourself. It opens doors for you." Echo stands on pressure plate |
| 5-3 | Mirror Maze | Walls are mirrors that reflect projectiles. Echo can activate pressure plates across the room |
| 5-6 | Past Self Battle | Room spawns an AI copy of player's movement pattern from last 30 seconds. Must defeat it |
| 5-8 | **Mid-boss: Memory Warden** | Boss that copies player's last 5 seconds. You fight your own Echo |
| 5-10 | Echo Puzzle - 3 Switches | 3 pressure plates. Only 1 Echo at a time. Must use platforms + Echo timing |
| 5-14 | Secret Room | Complete Echo chain puzzle perfectly | Time Flower #5 |
| 5-16 | **Boss: Reflection** | Mirror entity. Only vulnerable when Echo is active. Teaches final lesson: you need your other self | — |

### Boss: Reflection

- HP: 40
- Arena: Circular mirror chamber. All walls are reflective.
- Mechanics:
  - Reflection is immune to direct attacks
  - When Echo is active, Echo attacks Reflection for 1 damage per second
  - Reflection fires homing orbs that chase player and Echo
  - Must keep Echo alive while dodging for the Echo to deal damage
- Strategy: Place Echo, dodge, defend Echo. Replace Echo when orbs kill it.
- Reward: Echo Crystal.

---

## Final Zone: The Chronos Throne

**Theme:** The center of time. Reality is breaking down. All zones' aesthetics blend together.  
**Boss:** **Vex, the Time Breaker**  
**Difficulty:** Ultimate test  
**Rooms:** 10 (gauntlet of all mechanics)  

### Gauntlet Rooms (6 rooms before boss)

Each room tests one time power:

1. **Pause Gauntlet:** Moving platforms + spikes. Use Chrono Burst to slow obstacles.
2. **Rewind Gauntlet:** Deadly corridor with unavoidable damage. Must rewind every 3s.
3. **Slow Gauntlet:** Room with 20+ projectile sources. Slow Field to survive.
4. **Rush Gauntlet:** Speed-run section with 8-second time limit. Use Time Rush.
5. **Echo Gauntlet:** Chain of switches and doors. Use Echo to hold switches.
6. **All Powers:** Room with 4 gates. Each gate requires a different time power.

### Final Boss: Vex, the Time Breaker

**HP:** 50 (spread across 3 phases)

**Phase 1** — The Tyrant (HP > 30)
- Vex uses **Chrono Burst** — slows player for 2s
- Vex fires **timeline beams** — 3 lasers that sweep the arena
- Vex teleports to random platform every 4 attacks
- Platforms crumble and respawn on a timer
- **Key skill:** Use your own Burst to counter his slow. Dash through beams.

**Phase 2** — The Desperation (HP 30–15)
- Vex uses **Slow Field** — zone-wide slow on player (forces player to move slowly too)
- Vex spawns **Echoes of previous bosses** — 3 boss copies that attack for 5s
- Very fast melee combos from Vex
- **Key skill:** Use Time Rush to move at normal speed in his Slow Field. Echo to hit him while evading.

**Phase 3** — The Collapse (HP < 15)
- All powers active for Vex. He cycles through them every 4 seconds
- Arena shrinks — outer ring falls into void
- Time rifts spawn — walking into one teleports you to random position
- **Key skill:** Everything matters. Rewind mistakes. Burst for breathing room. Slow to navigate patterns. Rush to reposition. Echo for damage.

**Victory:** Vex collapses. Time rifts stabilize. A ruined Chronarium heals. Final cutscene: Kaelen speaks with remaining Forgers about rebuilding. Post-credits: a new Time Flower blooms in the restored garden.

**True Ending:** If all 5 Time Flowers collected: the garden fully blooms. The Chronarium is more beautiful than ever. Kaelen smiles. "There's still beauty in time."

---

## Difficulty Scaling Reference

| Metric | Zone 1 | Zone 2 | Zone 3 | Zone 4 | Zone 5 | Final |
|--------|--------|--------|--------|--------|--------|-------|
| Rooms | 16 | 18 | 20 | 20 | 18 | 11 |
| Enemy density (avg/room) | 1.2 | 1.8 | 2.5 | 2.0 | 2.8 | 4.0 |
| Platforming difficulty | 2/10 | 4/10 | 6/10 | 8/10 | 7/10 | 9/10 |
| Combat difficulty | 2/10 | 4/10 | 7/10 | 5/10 | 8/10 | 9/10 |
| Puzzle difficulty | 1/10 | 3/10 | 5/10 | 4/10 | 8/10 | 6/10 |
| Deaths expected (first run) | 10-20 | 20-40 | 40-80 | 60-120 | 60-100 | 50-100 |
| Shards available | 15 | 15 | 15 | 15 | 15 | 10 |
| Health Vessels | 1 | 0 | 1 | 0 | 0 | 0 |
| Memory Fragments | 3 | 3 | 3 | 3 | 3 | 0 |
| Time Flowers | 1 | 1 | 1 | 1 | 1 | 0 |
| Total expected playtime | 30-45m | 45-60m | 60-90m | 60-90m | 60-90m | 20-40m |
