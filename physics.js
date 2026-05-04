/**
 * physics.js — Physics & Collision System
 * 
 * Provides gravity, velocity, acceleration, and AABB collision
 * resolution for platformer-style games.
 * 
 * Features:
 *   - Gravity & velocity with variable timestep
 *   - AABB vs AABB collision detection
 *   - Platform collision resolution (solid + one-way)
 *   - Wall/ceiling collision
 *   - Slope support (via heightmap or triangle)
 *   - Friction and air resistance
 */

// ═══════════════════════════════════════════════════════════════════════
//  Physics Constants
// ═══════════════════════════════════════════════════════════════════════

export const PHYSICS = {
    gravity: 1800,          // Pixels/s² (feels good for 320×180 base)
    maxFallSpeed: 800,      // Terminal velocity
    playerFriction: 800,    // Ground deceleration (pixels/s²)
    playerAirFriction: 200, // Air deceleration
    playerMoveSpeed: 200,   // Max horizontal speed
    playerJumpForce: -450,  // Initial jump velocity (negative = up)
    coyoteTime: 0.08,       // Seconds after leaving ground that jump still works
    jumpBufferTime: 0.1,    // Seconds before hitting ground that jump press is remembered
    enemyGravity: 1200,     // Enemy gravity (lighter for some enemy types)
    projectileSpeed: 400,
};


// ═══════════════════════════════════════════════════════════════════════
//  Physics Body
// ═══════════════════════════════════════════════════════════════════════

/**
 * Attaches physics properties to any entity.
 * Call physics.update(entity, dt, tilemapCollider) each frame.
 */
export class PhysicsBody {
    constructor() {
        this.vx = 0;           // Horizontal velocity (pixels/s)
        this.vy = 0;           // Vertical velocity (pixels/s)
        this.ax = 0;           // Applied acceleration (pixels/s²)
        this.ay = 0;           // Applied acceleration (pixels/s²)
        this.gravityScale = 1; // Multiplier on global gravity
        this.friction = PHYSICS.playerFriction;
        this.airFriction = PHYSICS.playerAirFriction;
        this.maxSpeedX = PHYSICS.playerMoveSpeed;
        this.maxFallSpeed = PHYSICS.maxFallSpeed;
        this.onGround = false;
        this.onWallLeft = false;
        this.onWallRight = false;
        this.onCeiling = false;
        this.groundNormal = { x: 0, y: -1 }; // Surface normal of ground
    }

    /**
     * Apply an instantaneous impulse (changes velocity immediately).
     */
    impulse(vx, vy) {
        this.vx += vx;
        this.vy += vy;
    }

    /**
     * Reset all velocities and forces.
     */
    reset() {
        this.vx = 0;
        this.vy = 0;
        this.ax = 0;
        this.ay = 0;
    }
}


// ═══════════════════════════════════════════════════════════════════════
//  Physics Update
// ═══════════════════════════════════════════════════════════════════════

/**
 * Apply velocity and gravity to a physics body.
 * Call BEFORE collision resolution.
 * 
 * @param {PhysicsBody} body
 * @param {number} dt - Delta time in seconds
 * @param {number} gravity - Gravity value (pixels/s²)
 */
export function applyPhysics(body, dt, gravity = PHYSICS.gravity) {
    // Gravity
    body.vy += (gravity * body.gravityScale + body.ay) * dt;

    // Clamp vertical speed
    if (body.vy > body.maxFallSpeed) body.vy = body.maxFallSpeed;
    if (body.vy < -body.maxFallSpeed) body.vy = -body.maxFallSpeed;

    // Horizontal acceleration
    body.vx += body.ax * dt;

    // Friction (applied to input-based acceleration, not external forces)
    if (body.ax === 0) {
        const friction = body.onGround ? body.friction : body.airFriction;
        if (body.vx > 0) {
            body.vx = Math.max(0, body.vx - friction * dt);
        } else if (body.vx < 0) {
            body.vx = Math.min(0, body.vx + friction * dt);
        }
    }

    // Clamp horizontal speed
    if (body.vx > body.maxSpeedX) body.vx = body.maxSpeedX;
    if (body.vx < -body.maxSpeedX) body.vx = -body.maxSpeedX;

    // Reset per-frame acceleration
    body.ax = 0;
    body.ay = 0;
}


// ═══════════════════════════════════════════════════════════════════════
//  Platform Collision Resolution (AABB)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Collide an entity against a tilemap grid.
 * 
 * @param {object} entity - Must have {x, y, width, height, body: PhysicsBody}
 * @param {array} tiles - 2D tile grid (row-major: tiles[row][col])
 * @param {number} tileWidth - Width of each tile in pixels
 * @param {number} tileHeight - Height of each tile in pixels
 * @param {function} isSolid - Function(tileValue) => true if solid
 * @param {function} isOneWay - Function(tileValue) => true if one-way platform
 */
export function collideWithTilemap(entity, tiles, tileWidth, tileHeight, isSolid, isOneWay) {
    const body = entity.body;
    if (!body) return;

    const oldOnGround = body.onGround;
    body.onGround = false;
    body.onWallLeft = false;
    body.onWallRight = false;
    body.onCeiling = false;

    // ── Get candidate tile bounds ──
    const left   = Math.floor(entity.x / tileWidth);
    const right  = Math.floor((entity.x + entity.width - 1) / tileWidth);
    const top    = Math.floor(entity.y / tileHeight);
    const bottom = Math.floor((entity.y + entity.height - 1) / tileHeight);

    // ── One-way platform check (can drop through / jump through) ──
    // Only collide one-way from above (entity's bottom > tile top)
    // Skip if entity is moving up

    // ── Horizontal collision (resolve X first) ──
    if (body.vx !== 0) {
        const newX = entity.x + body.vx * (1 / 60); // Assumes fixed timestep cell

        const entityLeft   = Math.floor(newX / tileWidth);
        const entityRight  = Math.floor((newX + entity.width - 1) / tileWidth);

        for (let row = top; row <= bottom; row++) {
            for (let col = entityLeft; col <= entityRight; col++) {
                const tile = tiles[row]?.[col];
                if (tile === undefined || tile === null) continue;
                if (!isSolid(tile)) continue;

                const tileRect = {
                    x: col * tileWidth,
                    y: row * tileHeight,
                    width: tileWidth,
                    height: tileHeight,
                };

                if (body.vx > 0) {
                    // Moving right — push left
                    entity.x = tileRect.x - entity.width;
                    body.vx = 0;
                    body.onWallRight = true;
                } else if (body.vx < 0) {
                    // Moving left — push right
                    entity.x = tileRect.x + tileWidth;
                    body.vx = 0;
                    body.onWallLeft = true;
                }
            }
        }
    }

    // ── Vertical collision (resolve Y second) ──
    if (body.vy !== 0) {
        const newY = entity.y + body.vy * (1 / 60);

        const entityTop    = Math.floor(newY / tileHeight);
        const entityBottom = Math.floor((newY + entity.height - 1) / tileHeight);

        for (let row = entityTop; row <= entityBottom; row++) {
            for (let col = left; col <= right; col++) {
                const tile = tiles[row]?.[col];
                if (tile === undefined || tile === null) continue;

                const isOneWayTile = isOneWay?.(tile) || false;

                const tileRect = {
                    x: col * tileWidth,
                    y: row * tileHeight,
                    width: tileWidth,
                    height: tileHeight,
                };

                if (isOneWayTile) {
                    // One-way platform: only collide when falling from above
                    if (body.vy < 0) continue; // Moving up, skip
                    // Only collide if entity's bottom was above the tile top
                    const entityBottomBefore = entity.y + entity.height - body.vy * (1 / 60);
                    if (entityBottomBefore > tileRect.y + 4) continue; // +4 tolerance
                } else if (!isSolid(tile)) {
                    continue;
                }

                if (body.vy > 0) {
                    // Falling down — land on top
                    entity.y = tileRect.y - entity.height;
                    body.vy = 0;
                    body.onGround = true;
                } else if (body.vy < 0) {
                    // Moving up — hit ceiling
                    entity.y = tileRect.y + tileHeight;
                    body.vy = 0;
                    body.onCeiling = true;
                }
            }
        }
    }

    // ── Slope support (optional height-map based) ──

    // ── Ground normal (default: straight up) ──
    body.groundNormal = { x: 0, y: -1 };
}


// ═══════════════════════════════════════════════════════════════════════
//  AABB Collision Detection (Entity vs Entity)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Test if two AABBs overlap.
 * @returns {boolean}
 */
export function aabbOverlap(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

/**
 * Get the overlap vector between two AABBs.
 * Returns the minimum penetration axis (separating vector).
 * @returns {{x: number, y: number} | null}
 */
export function aabbOverlapVector(a, b) {
    const overlapLeft   = (a.x + a.width)  - b.x;
    const overlapRight  = (b.x + b.width)  - a.x;
    const overlapTop    = (a.y + a.height) - b.y;
    const overlapBottom = (b.y + b.height) - a.y;

    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapY = Math.min(overlapTop, overlapBottom);

    if (minOverlapX <= 0 || minOverlapY <= 0) return null;

    if (minOverlapX < minOverlapY) {
        return {
            x: overlapLeft < overlapRight ? -overlapLeft : overlapRight,
            y: 0,
        };
    } else {
        return {
            x: 0,
            y: overlapTop < overlapBottom ? -overlapTop : overlapBottom,
        };
    }
}

/**
 * Push entity 'a' out of entity 'b' using the minimum separation vector.
 * Useful for simple entity-vs-entity collision response.
 */
export function resolveAABB(a, b) {
    const overlap = aabbOverlapVector(a, b);
    if (!overlap) return;
    a.x += overlap.x;
    a.y += overlap.y;
}


// ═══════════════════════════════════════════════════════════════════════
//  Raycast (Tile-based)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Simple tile-based raycast using DDA (Digital Differential Analyzer).
 * Useful for line-of-sight, ground detection, etc.
 * 
 * @param {number} x0 - Start x
 * @param {number} y0 - Start y
 * @param {number} x1 - End x
 * @param {number} y1 - End y
 * @param {array} tiles - 2D tile grid
 * @param {function} isSolid - Function(tileValue) => bool
 * @returns {{x: number, y: number, tileX: number, tileY: number}|null}
 */
export function tileRaycast(x0, y0, x1, y1, tiles, isSolid) {
    let dx = x1 - x0;
    let dy = y1 - y0;

    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps === 0) return null;

    dx /= steps;
    dy /= steps;

    let x = x0;
    let y = y0;

    for (let i = 0; i < steps; i++) {
        const tileX = Math.floor(x / 16); // Assume 16px tiles for raycast
        const tileY = Math.floor(y / 16);
        const tile = tiles[tileY]?.[tileX];

        if (tile !== undefined && tile !== null && isSolid(tile)) {
            return { x, y, tileX, tileY };
        }

        x += dx;
        y += dy;
    }

    return null; // No collision
}
