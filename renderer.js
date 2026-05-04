/**
 * renderer.js — Rendering Pipeline
 * 
 * Handles all visual output:
 *   - Sprite rendering (from image assets or procedural)
 *   - Tilemap rendering
 *   - Parallax scrolling backgrounds
 *   - Particle rendering
 *   - Screen shake
 *   - HUD elements (health bar, score, lives)
 * 
 * All render functions are stateless — they take a context and draw.
 */

// ═══════════════════════════════════════════════════════════════════════
//  Sprite Rendering
// ═══════════════════════════════════════════════════════════════════════

/**
 * Draw a sprite from the asset loader.
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {*} assetLoader - Engine's asset loader
 * @param {string} name - Sprite name
 * @param {number} x - Screen position x
 * @param {number} y - Screen position y
 * @param {object} [opts] - Optional rendering options
 */
export function drawSprite(ctx, assetLoader, name, x, y, opts = {}) {
    const img = assetLoader.getImage(name);
    if (!img) {
        // Draw placeholder rectangle
        drawPlaceholder(ctx, x, y, opts.width || 16, opts.height || 16, '#f0f');
        return;
    }

    const sw = opts.spriteW || img.width;
    const sh = opts.spriteH || img.height;
    const sx = opts.frameX ? opts.frameX * sw : 0;
    const sy = opts.frameY ? opts.frameY * sh : 0;
    const dw = opts.width || sw;
    const dh = opts.height || sh;

    ctx.save();
    ctx.globalAlpha = opts.alpha ?? 1;

    // Flip and rotation
    const cx = x + dw / 2;
    const cy = y + dh / 2;
    ctx.translate(cx, cy);
    if (opts.flipX) ctx.scale(-1, 1);
    if (opts.flipY) ctx.scale(1, -1);
    if (opts.rotation) ctx.rotate(opts.rotation);
    ctx.translate(-cx, -cy);

    // Tint via a temporary canvas
    if (opts.tint) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sw;
        tempCanvas.height = sh;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        tempCtx.globalCompositeOperation = 'multiply';
        tempCtx.fillStyle = opts.tint;
        tempCtx.fillRect(0, 0, sw, sh);
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        ctx.drawImage(tempCanvas, 0, 0, dw, dh);
    } else {
        ctx.drawImage(img, sx, sy, sw, sh, x, y, dw, dh);
    }

    ctx.restore();
}

/**
 * Draw a colored rectangle placeholder (for missing sprites).
 */
function drawPlaceholder(ctx, x, y, w, h, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    // X mark
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.moveTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.stroke();
    ctx.restore();
}


// ═══════════════════════════════════════════════════════════════════════
//  Tilemap Rendering
// ═══════════════════════════════════════════════════════════════════════

/**
 * Draw a tilemap layer.
 * Only renders tiles visible on screen.
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {array} tiles - 2D array [row][col] of tile IDs
 * @param {object} tileset - Tileset config { image, tileW, tileH, map: { id: {x,y}} }
 * @param {number} camX - Camera x (world space)
 * @param {number} camY - Camera y (world space)
 * @param {number} viewW - Viewport width
 * @param {number} viewH - Viewport height
 * @param {number} tileW - Tile width
 * @param {number} tileH - Tile height
 */
export function drawTilemap(ctx, tiles, tileset, camX, camY, viewW, viewH, tileW = 16, tileH = 16) {
    // Calculate visible tile range
    const startCol = Math.floor(camX / tileW);
    const startRow = Math.floor(camY / tileH);
    const endCol = Math.ceil((camX + viewW) / tileW);
    const endRow = Math.ceil((camY + viewH) / tileH);

    for (let row = Math.max(0, startRow); row < Math.min(tiles.length, endRow); row++) {
        for (let col = Math.max(0, startCol); col < Math.min(tiles[row].length, endCol); col++) {
            const tileId = tiles[row][col];
            if (!tileId || tileId === 0) continue;

            const tx = col * tileW;
            const ty = row * tileH;

            // Draw tileset tile
            if (tileset && tileset.map[tileId]) {
                const img = tileset.image;
                const src = tileset.map[tileId];
                ctx.drawImage(img, src.x, src.y, tileW, tileH, tx, ty, tileW, tileH);
            } else {
                // Fallback: color by ID
                const colors = ['#444', '#666', '#888', '#4a4', '#44a', '#a44'];
                ctx.fillStyle = colors[(tileId - 1) % colors.length];
                ctx.fillRect(tx, ty, tileW, tileH);
                ctx.strokeStyle = '#222';
                ctx.strokeRect(tx, ty, tileW, tileH);
            }
        }
    }
}


// ═══════════════════════════════════════════════════════════════════════
//  Tilemap with Color Mapping
// ═══════════════════════════════════════════════════════════════════════

/**
 * Draw tilemap using simple color mapping (no external tileset image).
 * Good for prototyping and procedural generation.
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {array} tiles - 2D tile grid [row][col]
 * @param {object} colorMap - e.g. { 1: '#4a4', 2: '#666', 3: '#a44' }
 * @param {number} camX - Camera x
 * @param {number} camY - Camera y
 * @param {number} viewW - Viewport width
 * @param {number} viewH - Viewport height
 * @param {number} tileW - Tile width
 * @param {number} tileH - Tile height
 */
export function drawColoredTilemap(ctx, tiles, colorMap, camX, camY, viewW, viewH, tileW = 16, tileH = 16) {
    const startCol = Math.floor(camX / tileW);
    const startRow = Math.floor(camY / tileH);
    const endCol = Math.ceil((camX + viewW) / tileW);
    const endRow = Math.ceil((camY + viewH) / tileH);

    for (let row = Math.max(0, startRow); row < Math.min(tiles.length, endRow); row++) {
        for (let col = Math.max(0, startCol); col < Math.min(tiles[row].length, endCol); col++) {
            const tileId = tiles[row][col];
            if (!tileId || tileId === 0) continue;

            const color = colorMap[tileId];
            if (color) {
                ctx.fillStyle = color;
                ctx.fillRect(col * tileW, row * tileH, tileW, tileH);
            }
        }
    }
}


// ═══════════════════════════════════════════════════════════════════════
//  Parallax Background
// ═══════════════════════════════════════════════════════════════════════

/**
 * Parallax background layer.
 * Each layer scrolls at a different speed relative to the camera.
 */
export class ParallaxBackground {
    constructor() {
        this.layers = [];
    }

    /**
     * Add a background layer.
     * 
     * @param {object} layer
     * @param {string} layer.color - Solid fill color (used if no image)
     * @param {HTMLImageElement} [layer.image] - Background image
     * @param {number} layer.speed - Scrolling speed multiplier (0 = static, 1 = same as camera)
     * @param {number} [layer.yOffset] - Vertical position offset
     */
    addLayer(layer) {
        this.layers.push({
            color: layer.color || '#1a1a2e',
            image: layer.image || null,
            speed: layer.speed ?? 0.5,
            yOffset: layer.yOffset || 0,
            repeatX: layer.repeatX ?? true,
            repeatY: layer.repeatY ?? false,
            scrollX: 0,
        });
    }

    /**
     * Update parallax scroll positions based on camera.
     * @param {number} camX
     * @param {number} camY
     */
    update(camX, camY) {
        for (const layer of this.layers) {
            layer.scrollX = -camX * layer.speed;
            layer.scrollY = -camY * layer.speed * 0.3 + layer.yOffset;
        }
    }

    /**
     * Render background layers from back to front.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} viewW
     * @param {number} viewH
     */
    render(ctx, viewW, viewH) {
        for (const layer of this.layers) {
            ctx.save();

            if (layer.image) {
                // Tile the image
                const img = layer.image;
                const w = img.width;
                const h = img.height;

                // Calculate tiling
                const startX = layer.scrollX % w;
                const startY = layer.scrollY;

                for (let y = startY; y < viewH; y += h) {
                    for (let x = startX - w; x < viewW; x += w) {
                        ctx.drawImage(img, x, y);
                    }
                }
            } else {
                // Solid color
                ctx.fillStyle = layer.color;
                ctx.fillRect(0, 0, viewW, viewH);
            }

            ctx.restore();
        }
    }
}


// ═══════════════════════════════════════════════════════════════════════
//  Particle Rendering
// ═══════════════════════════════════════════════════════════════════════

/**
 * Render all particles from a ParticleSystem.
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {ParticleSystem} system
 */
export function drawParticles(ctx, system) {
    const particles = system.particles;
    if (particles.length === 0) return;

    ctx.save();

    for (const p of particles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(
            p.x - p.size / 2,
            p.y - p.size / 2,
            p.size,
            p.size
        );
    }

    ctx.restore();
}


// ═══════════════════════════════════════════════════════════════════════
//  Screen Shake (applied during camera update)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Draw a vignette overlay (darkened edges) effect.
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 * @param {number} intensity - 0 to 1
 */
export function drawVignette(ctx, w, h, intensity = 0.3) {
    if (intensity <= 0) return;

    const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.4, w / 2, h / 2, h * 0.8);
    gradient.addColorStop(0, `rgba(0,0,0,0)`);
    gradient.addColorStop(1, `rgba(0,0,0,${intensity})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
}


// ═══════════════════════════════════════════════════════════════════════
//  HUD Rendering
// ═══════════════════════════════════════════════════════════════════════

/**
 * Draw the player's health bar.
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} health - Current health
 * @param {number} maxHealth - Maximum health
 * @param {number} x - Left position
 * @param {number} y - Top position
 * @param {number} w - Bar width
 * @param {number} h - Bar height
 */
export function drawHealthBar(ctx, health, maxHealth, x, y, w = 50, h = 6) {
    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, w, h);

    // Health fill
    const ratio = Math.max(0, health / maxHealth);
    const fillColor = ratio > 0.5 ? '#4a4' : ratio > 0.25 ? '#aa4' : '#a44';
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, w * ratio, h);

    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '6px monospace';
    ctx.fillText(`HP`, x - 12, y + h - 1);
}

/**
 * Draw a heart icon for lives display.
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Center x
 * @param {number} y - Center y
 * @param {number} size - Size in pixels
 * @param {boolean} filled - Whether the heart is filled (life remaining)
 */
export function drawHeart(ctx, x, y, size = 8, filled = true) {
    ctx.save();
    ctx.fillStyle = filled ? '#e44' : '#444';
    ctx.strokeStyle = filled ? '#c22' : '#222';
    ctx.lineWidth = 1;

    const s = size / 2;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x - s, y - s * 0.5, x - s * 1.3, y + s * 0.3, x, y + s * 0.8);
    ctx.bezierCurveTo(x + s * 1.3, y + s * 0.3, x + s, y - s * 0.5, x, y + s * 0.3);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

/**
 * Draw HUD text with a shadow for readability.
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {object} [opts]
 */
export function drawHUDText(ctx, text, x, y, opts = {}) {
    const font = opts.font || '8px monospace';
    const color = opts.color || '#fff';
    const align = opts.align || 'left';

    ctx.save();
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(text, x + 1, y + 1);

    // Main text
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);

    ctx.restore();
}

/**
 * Draw a score display.
 */
export function drawScore(ctx, score, x, y) {
    drawHUDText(ctx, `SCORE: ${score}`, x, y, { font: '7px monospace', color: '#ff0' });
}

/**
 * Draw lives as a row of hearts.
 */
export function drawLives(ctx, lives, x, y, maxLives, size = 7) {
    for (let i = 0; i < maxLives; i++) {
        drawHeart(ctx, x + i * (size + 2), y, size, i < lives);
    }
}


// ═══════════════════════════════════════════════════════════════════════
//  Transition Effects
// ═══════════════════════════════════════════════════════════════════════

/**
 * Scene transition state machine.
 */
export class Transition {
    constructor() {
        this.active = false;
        this.duration = 0;
        this.timer = 0;
        this.type = 'fade'; // 'fade', 'wipe', 'circle'
        this.direction = 'in'; // 'in' = black to clear, 'out' = clear to black
        this.onComplete = null;
    }

    /**
     * Start a transition.
     */
    start(type = 'fade', direction = 'in', duration = 0.5, onComplete = null) {
        this.active = true;
        this.type = type;
        this.direction = direction;
        this.duration = duration;
        this.timer = 0;
        this.onComplete = onComplete;
    }

    update(dt) {
        if (!this.active) return;
        this.timer += dt;
        if (this.timer >= this.duration) {
            this.active = false;
            if (this.onComplete) this.onComplete();
        }
    }

    get progress() {
        if (!this.active) return this.direction === 'in' ? 0 : 1;
        const p = this.timer / this.duration;
        return this.direction === 'in' ? 1 - p : p;
    }

    render(ctx, w, h) {
        if (!this.active && this.direction === 'in') return;
        const alpha = this.direction === 'in'
            ? Math.max(0, 1 - this.timer / this.duration)
            : Math.min(1, this.timer / this.duration);

        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }
}
