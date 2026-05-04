# CHRONOS EDGE — Art Specification

**Style:** High-contrast pixel art with modern glow/particle effects  
**Internal resolution:** 320×180 → upscaled variable integer  
**Tileset base:** 16×16 pixels per tile  
**Character size:** 16×24px (feet to top of head, plus 4px headroom = 28px hitbox)  

---

## 1. Rendering Pipeline

### 1.1 Canvas Setup

```javascript
// Internal resolution
const W = 320;
const H = 180;

// Create offscreen canvas for pixel-perfect rendering
const internalCanvas = document.createElement('canvas');
internalCanvas.width = W;
internalCanvas.height = H;
const ctx = internalCanvas.getContext('2d');

// Main canvas is the visible display
// On each frame:
// 1. Clear internal buffer
// 2. Draw all game layers to internalCanvas
// 3. Scale internalCanvas onto mainCanvas using nearest-neighbor
mainCtx.imageSmoothingEnabled = false;
mainCtx.drawImage(internalCanvas, 0, 0, W * scale, H * scale);
```

### 1.2 Layer Order

| Layer | Content | Render |
|-------|---------|--------|
| 0 | Background (sky, far parallax) | Solid fill + tilemap |
| 1 | Mid-background (structures, parallax 0.3x) | Tilemap |
| 2 | Interactive background (parallax 0.6x) | Tilemap |
| 3 | Main terrain (collision layer) | Tilemap |
| 4 | Below-player entities | Sprites |
| 5 | Player | Sprite + particles |
| 6 | Above-player entities | Sprites |
| 7 | Foreground (decorative, parallax 1.2x) | Tilemap |
| 8 | Time power effects | Full-screen overlays (alpha) |
| 9 | UI / HUD | Canvas path drawings + text |
| 10 | Screen effects (damage flash, etc.) | Full-screen overlay |

---

## 2. Color Palettes

### 2.1 Global Palette (Always Available)

These 8 colors are used for player, UI, and foreground elements:

```
BLACK       #0f0f1b
DARK_BLUE   #1a1a3e
MID_BLUE    #2d2d6b
TEAL        #3bc4b9
GOLD        #f0c040
ORANGE      #e86030
WHITE       #ffffff
RED         #e83030
```

### 2.2 Zone-Specific Palettes

Each zone has its own 16-color palette (includes global colors with variations):

**Zone 1 — Great Gearworks** (Brass/Steam)
```
DARK_BROWN  #2a1f1a
BROWN       #5c3d2e
BRASS       #c49a4a
LIGHT_BRASS #e8c880
STEEL       #808890
DARK_STEEL  #505560
STEAM       #b0b8c0
EMBERS      #e85030
```

**Zone 2 — Rift Expanse** (Void/Purple)
```
DEEP_PURPLE #1a0a2e
PURPLE      #3c1a6e
VOID        #0a0a1a
RIFT        #c040e8
TEAL_GREEN  #28c8a0
STAR        #e8e8ff
CORRUPT     #e82060
```

**Zone 3 — Glass Cathedral** (Cyan/White)
```
CRYSTAL_BG  #c0e8ff
DARK_CYAN   #004060
CYAN        #2090c0
LIGHT_CYAN  #60c8f0
GLASS       #d0e8f8
PALE_GOLD   #e8d880
SHADOW      #203040
```

**Zone 4 — Speed Forge** (Orange/Red industrial)
```
FACTORY_BG  #1a1a14
CONVEYOR    #404038
HEAT        #e86020
GLOW_ORANGE #ffa040
WARNING     #ffe040
METAL       #808078
SMOKE       #383830
```

**Zone 5 — Echo Chamber** (Mirror/Cyan-Purple)
```
MIRROR_BG   #0a0a14
MIRROR_CYAN #40c8e8
MIRROR_PURP #8040e0
REFLECTION  #e0e0ff
SHATTER     #c0c0e0
DARK_MIRROR #181828
ECHO_GHOST  #60e0ff
```

**Final Zone — Chronos Throne** (All zones blended)
Uses all palettes with priority on GOLD and RED.

---

## 3. Sprite Specifications

### 3.1 Player (Kaelen)

**Size:** 16×24px (draw area) + 4px margin = 20×32px sprite sheet cell

**Animations required:**

| Animation | Frames | Notes |
|-----------|--------|-------|
| Idle | 4 | Breathing, slight sway. Loop |
| Run | 6 | 3-frame walk cycle mirrored. 2 speeds (walk/run) |
| Jump | 3 | Launch (1), apex (1), descent (1) |
| Fall | 1 | Arms down, legs spread |
| Land | 2 | Impact crouch, recovery |
| Wall Slide | 2 | Scrabbling, spark particles |
| Wall Jump | 3 | Push off, turn, flight |
| Attack 1 | 4 | Slash (wind-up, hit, recovery ×2) |
| Attack 2 | 4 | Second slash combo |
| Attack 3 | 6 | Heavy slash (wind-up, hit, follow-through, recovery ×3) |
| Dash | 3 | Lean forward, streak, stop |
| Hurt | 2 | Knockback, stun |
| Death | 6 | Fade, particles |
| Chrono Burst | 4 | Glow, ring, recovery |
| Rewind | 2 | Desaturated flicker |
| Slow Field | 4 | Blue aura build, hold, fade |
| Time Rush | 4 | Speed lines, motion blur effect |
| Echo | 1 | Ghost overlay (transparent copy) |
| Interact | 2 | Reach out, tap |

**Total sprite cells:** ~70 frames  
**Sheet size (rough):** 140×160px (70 cells at 20×32, arranged 10×7)

### 3.2 Enemies

All enemies at same scale: 16×16px to 24×24px cells.

| Enemy | Frames | Size | Notes |
|-------|--------|------|-------|
| Chrono-Grunt | 4 (walk), 2 (attack), 2 (death) | 16×16 | Simple bipedal soldier |
| Spear-Sentry | 2 (idle), 4 (attack) | 16×24 | Stationary, rotates to aim |
| Rift-Crawler | 3 (crawl), 2 (death) | 20×12 | Flat, many legs |
| Blink-Hound | 2 (idle), 4 (teleport) | 20×16 | Distortion effect |
| Time-Warden | 4 (idle), 4 (attack), 2 (shield) | 24×28 | Large, imposing |
| Gravity-Wisp | 2 (float) | 12×12 | Small, glows |
| Chrono-Sapper | 4 (flee), 2 (collect) | 16×16 | Skittish, small |
| Echo-Sentry | 4 (copy), 2 (spawn) | 24×24 | Mirror-surface |

### 3.3 Boss Sprites

| Boss | Frames | Size | Notes |
|------|--------|------|-------|
| Gear Guardian | 6 (idle), 6 (attack variants), 4 (death) | 48×48 | Large gear golem |
| Void Tendril | 4 (lurk), 4 (strike) | 64×32 | Segmented tentacle |
| Crystal Warden | 6 (float), 6 (attack), 4 (death) | 48×48 | Crystal entity |
| Forge Golem | 6 (idle), 6 (attack), 4 (death) | 56×48 | Big industrial golem |
| Memory Warden | 6 (mirror) | 24×28 | Humanoid mirror |
| Reflection | 4 (phase 1), 4 (phase 2), 4 (phase 3) | 40×40 | Abstract mirror being |
| Vex (various) | 8 (idle), 6 (attack per phase), 4 (death) | 28×32 | Rival Forger |

---

## 4. Tilesets

### 4.1 Tile Format

Each zone has a tileset: 16×16 tiles arranged in a 16-column grid.

**Tileset structure (example):**

| Row | Content |
|-----|---------|
| 0   | Air / empty (index 0) |
| 1   | Ground tiles (left edge, middle, right edge, corners) |
| 2   | Ground variants (cracked, mossy, etc.) |
| 3   | Wall tiles |
| 4   | Platform tiles (one-way) |
| 5   | Decorative (gears, crystals, pipes, etc.) |
| 6   | Hazard tiles (spikes, lava) |
| 7   | Special tiles (breakable, moving, switches) |
| 8   | Background tiles (not collided) |

**Each zone needs:** ~64–96 tiles (4–6 rows of 16)

### 4.2 Tile Properties

Each tile in the collision map has properties:

```javascript
{
  id: 5,           // Tile index in tileset
  solid: true,     // Blocks player
  oneWay: false,   // Only solid from above
  hazard: false,   // Damages on contact
  damagePerSec: 0, // Damage rate for hazards
  friction: 1.0,   // Friction multiplier
  speedX: 0,       // Conveyor speed (px/s)
  speedY: 0,       // Wind tunnel speed
  breakable: false,// Can be destroyed
  animFrame: 0,    // If > 0, this is an animated tile
  animSpeed: 0,    // Frames between animation frames
}
```

---

## 5. Particle Effects

All particles are drawn with Canvas 2D primitives (no sprites needed).

| Effect | Particles | Size | Lifetime | Color | Behavior |
|--------|-----------|------|----------|-------|----------|
| Landing dust | 6 | 2×2 | 0.3s | Terrain color | Spread outward, fade |
| Jump dust | 4 | 2×2 | 0.2s | Terrain color | Burst downward |
| Attack slash | 8 | 3×3 | 0.2s | Gold | Sweep arc, fade |
| Hit spark | 12 | 2×2 | 0.3s | Orange/White | Radial burst |
| Dash trail | 5/frame | 4×4 | 0.5s | Blue (fading) | Trail behind player |
| Death burst | 30 | 3×3 | 1.0s | Red/Gold | Explosive, gravity |
| Chrono Burst ring | 1 (ring) | 240px radius | 0.5s | Cyan | Expanding ring, fades |
| Rewind particles | 15 | 2×2 | 1.0s | Desaturated colors | Pulled toward player |
| Slow Field glow | 1 (overlay) | Screen | Toggle | Blue, 20% alpha | Screen tint |
| Time Rush lines | 12 | 1px×40px | 0.2s | White, 30% alpha | Speed lines from edges |
| Echo ghost | 1 (player copy) | Player size | 4s | Cyan, 40% alpha | Static/frozen copy |
| Checkpoint activate | 10 | 3×3 | 0.8s | Gold | Ring expansion upward |
| Collect pickup | 6 | 3×3 | 0.4s | White/Gold | Float upward, shrink |
| Boss flash | 1 (screen) | Screen | 0.1s | Red, 50% alpha | Boss roar effect |
| Damage flash | 1 (screen) | Screen | 0.1s | Red, 30% alpha | Player takes damage |
| Glass shatter | 20 | 4×4 | 0.8s | Cyan/White | Fragments scatter + fade |
| Platform crumble | 8 | 2×2 | 0.5s | Terrain color | Fall with gravity |

---

## 6. UI Design

### 6.1 Font

- Pixel font: 5×7px monospace
- Generated via `ctx.fillText` with a bitmap font or custom font rendering
- Each character is 5px wide, 7px tall, 1px padding
- ASCII range: 32–126 (printable characters)
- Font sheet: 95 characters × (6×8)px = 570×8px

### 6.2 HUD Layout

```
┌─────────────────────────────────────────────────────┐
│ ♥♥♥♡  SCORE: 012345   LIVES: 3    04:23  Z1-4      │
│                                                      │
│            [████████░░░░]  6.5s / 8.0s               │
│            ⚡ SLOW FIELD  [K]                        │
└─────────────────────────────────────────────────────┘
```

- **Hearts:** 5×7px each, filled or outline
- **Score:** 7-segment-style pixel digits
- **Lives:** Small player head icon × count
- **Timer:** MM:SS format
- **Zone indicator:** Z{number}-{room number}
- **Chrono Gauge:** Bar: 120×10px, filled with gradient gold→red as gauge empties
- **Active Power:** Icon + name + keybind below gauge

### 6.3 Menu Design

- **Buttons:** 60×16px rectangles with 1px border, text centered
- **Highlight:** Brighter border + subtle glow on hover
- **Background:** Game world frozen + 40% dark overlay
- **Transitions:** 200ms ease-in-out for menu state changes

### 6.4 Menu Screens

**Title Screen:** Animated background (chrono gears rotating, particles flowing). Title "CHRONOS EDGE" in large pixel font (5× blown up = 25×35px per char).

**Pause Menu:** Dark overlay. Vertical button list. Each button 80×14px.

**Settings:** Tab-based (Audio, Controls, Display, Gameplay). Sliders rendered as pixel bars.

**Game Over:** Red overlay fading in over 500ms. "TIME RAN OUT" in large font. Two buttons: RETRY, QUIT.

**Level Complete:** Stats panel sliding in from top over 400ms. Grade letter (S/A/B/C/D) at center, large. Continue button.

---

## 7. Drawing Reference for Canvas Implementation

All sprites will be drawn **programmatically** using Canvas 2D path/rect commands rather than pre-made images. This keeps the game a single HTML file.

**Drawing strategy:**

```javascript
// Example: Player idle frame
function drawPlayerIdle(ctx, x, y, frame) {
  // Body: rounded rect
  ctx.fillStyle = MID_BLUE;
  ctx.fillRect(x + 2, y + 10, 12, 14); // body
  
  // Head: circle
  ctx.fillStyle = SKIN_COLOR;
  ctx.beginPath();
  ctx.arc(x + 8, y + 6, 6, 0, Math.PI * 2);
  ctx.fill();
  
  // Eyes: small squares, blink cycle
  const blink = (frame % 120) > 115 ? 1 : 2;
  // ... etc
}
```

This approach means:
- No external asset files needed
- ~2000 lines of drawing code for all sprites
- Easy to tweak colors/shapes
- Consistent style

For more complex sprites (bosses), use a sprite data format:

```javascript
// Sprite defined as pixel data: [x, y, colorIndex, x, y, colorIndex, ...]
const BOSS_PIXELS = [
  2, 2, 3,   3, 2, 3,   4, 2, 3,
  2, 3, 5,   3, 3, 5,   4, 3, 5,
  // ... (compressed pixel array)
];
```

---

## 8. Screen Effects

| Effect | Technique | Purpose |
|--------|-----------|---------|
| Damage flash | Full-screen red overlay at 30% alpha for 100ms | Player hit feedback |
| Boss roar | Screen shake (8px, 400ms) + full-screen red flash 40% | Boss entrance/attack |
| Slow Field | Blue tint overlay at 20% alpha, "time ripple" wavy distortion | Active effect indicator |
| Time Rush | Speed lines drawn from edges toward center | Fast movement feel |
| Rewind | Desaturated overlay (saturation = 20%), horizontal wave distortion | Rewind visualization |
| Chrono Burst | Expanding ring + brief slow-motion (0.3× game speed for 300ms) | Impact feel |
| Echo | Ghostly copy with wobble displacement | Echo indicator |
| Death | Screen zooms to player, fade to red, respawn fade from red | Death impact |
| Zone clear | Slow-motion (0.1×), screen brightness increase, particle burst | Victory feeling |
| Menu transition | Cross-fade over 200ms | Smooth state changes |

---

*All visuals should be generated procedurally via Canvas 2D drawing commands. No external image files required. This keeps the game deliverable as a single self-contained HTML file and opens the door for future mod support through palette swapping.*
