/**
 * physics.js — Physics & Collision System
 * 
 * Provides gravity, velocity, acceleration, and AABB collision
 * resolution for platformer-style games.
 * 
 * dt-based movement with correct collision resolution order:
 *   X first, then Y (standard platformer approach).
 */

export const PHYSICS = {
    gravity: 1800,
    maxFallSpeed: 900,
    playerFriction: 800,
    playerAirFriction: 200,
    playerMoveSpeed: 200,
    playerJumpForce: -420,
    coyoteTime: 0.12,
    jumpBufferTime: 0.1,
    enemyGravity: 1200,
    projectileSpeed: 400,
};

export class PhysicsBody {
    constructor() {
        this.vx = 0;
        this.vy = 0;
        this.ax = 0;
        this.ay = 0;
        this.gravityScale = 1;
        this.friction = PHYSICS.playerFriction;
        this.airFriction = PHYSICS.playerAirFriction;
        this.maxSpeedX = PHYSICS.playerMoveSpeed;
        this.maxFallSpeed = PHYSICS.maxFallSpeed;
        this.onGround = false;
        this.onWallLeft = false;
        this.onWallRight = false;
        this.onCeiling = false;
        this.groundNormal = { x: 0, y: -1 };
        this.speedMultiplier = 1.0;
    }

    impulse(vx, vy) {
        this.vx += vx;
        this.vy += vy;
    }

    reset() {
        this.vx = 0;
        this.vy = 0;
        this.ax = 0;
        this.ay = 0;
    }
}

/**
 * Apply gravity, friction, and acceleration to a body.
 * Does NOT move the entity — use moveAndCollide for that.
 */
export function applyPhysics(body, dt, gravity = PHYSICS.gravity) {
    body.vy += (gravity * body.gravityScale + body.ay) * dt;

    if (body.vy > body.maxFallSpeed) body.vy = body.maxFallSpeed;
    if (body.vy < -body.maxFallSpeed) body.vy = -body.maxFallSpeed;

    body.vx += body.ax * dt;

    if (body.ax === 0) {
        const f = body.onGround ? body.friction : body.airFriction;
        if (body.vx > 0) {
            body.vx = Math.max(0, body.vx - f * dt);
        } else if (body.vx < 0) {
            body.vx = Math.min(0, body.vx + f * dt);
        }
    }

    if (body.vx > body.maxSpeedX) body.vx = body.maxSpeedX;
    if (body.vx < -body.maxSpeedX) body.vx = -body.maxSpeedX;

    body.ax = 0;
    body.ay = 0;
}

/**
 * Move entity by velocity * dt, then resolve tile collisions.
 * 
 * Resolution order: X axis first, then Y axis.
 * Sets body.onGround, onWallLeft, onWallRight, onCeiling flags.
 * 
 * @param {object} entity - Has {x, y, width, height, body}
 * @param {number} dt - Delta time
 * @param {number[][]} tiles - 2D grid [row][col]
 * @param {number} tileW
 * @param {number} tileH
 * @param {function} isSolid - (tileId) => boolean
 * @param {function} isOneWay - (tileId) => boolean
 */
export function moveAndCollide(entity, dt, tiles, tileW, tileH, isSolid, isOneWay) {
    const body = entity.body;
    if (!body) return;

    body.onGround = false;
    body.onWallLeft = false;
    body.onWallRight = false;
    body.onCeiling = false;

    // ── Horizontal movement ──
    if (body.vx !== 0) {
        const newX = entity.x + body.vx * dt;
        const left = Math.floor(newX / tileW);
        const right = Math.floor((newX + entity.width - 1) / tileW);
        const top = Math.floor(entity.y / tileH);
        const bottom = Math.floor((entity.y + entity.height - 1) / tileH);

        let blocked = false;
        for (let row = top; row <= bottom && !blocked; row++) {
            for (let col = left; col <= right && !blocked; col++) {
                // Treat out-of-bounds tiles as solid boundary walls
                if (col < 0 || row < 0 || row >= tiles.length || col >= (tiles[row]?.length || 0)) {
                    blocked = true;
                    if (body.vx > 0) {
                        entity.x = col * tileW - entity.width;
                        body.vx = 0;
                        body.onWallRight = true;
                    } else {
                        entity.x = (col + 1) * tileW;
                        body.vx = 0;
                        body.onWallLeft = true;
                    }
                    continue;
                }
                const tile = tiles[row]?.[col];
                if (!tile || !isSolid(tile)) continue;
                blocked = true;
                if (body.vx > 0) {
                    entity.x = col * tileW - entity.width;
                    body.vx = 0;
                    body.onWallRight = true;
                } else {
                    entity.x = (col + 1) * tileW;
                    body.vx = 0;
                    body.onWallLeft = true;
                }
            }
        }
        if (!blocked) {
            entity.x = newX;
        }
    }

    // ── Vertical movement ──
    if (body.vy !== 0) {
        const newY = entity.y + body.vy * dt;
        const left = Math.floor(entity.x / tileW);
        const right = Math.floor((entity.x + entity.width - 1) / tileW);
        const top = Math.floor(newY / tileH);
        const bottom = Math.floor((newY + entity.height - 1) / tileH);

        let blocked = false;
        for (let row = top; row <= bottom && !blocked; row++) {
            for (let col = left; col <= right && !blocked; col++) {
                // Treat out-of-bounds tiles as solid boundary
                if (col < 0 || row < 0 || row >= tiles.length || col >= (tiles[row]?.length || 0)) {
                    blocked = true;
                    if (body.vy > 0) {
                        entity.y = row * tileH - entity.height;
                        body.vy = 0;
                        body.onGround = true;
                    } else {
                        entity.y = (row + 1) * tileH;
                        body.vy = 0;
                        body.onCeiling = true;
                    }
                    continue;
                }
                const tile = tiles[row]?.[col];
                if (!tile) continue;

                const isPlatform = isOneWay ? isOneWay(tile) : false;

                if (isPlatform) {
                    // One-way: only from above, only when falling
                    if (body.vy < 0) continue;
                    const prevBottom = entity.y + entity.height;
                    if (prevBottom > row * tileH + 4) continue;
                } else if (!isSolid(tile)) {
                    continue;
                }

                blocked = true;
                if (body.vy > 0) {
                    entity.y = row * tileH - entity.height;
                    body.vy = 0;
                    body.onGround = true;
                } else {
                    entity.y = (row + 1) * tileH;
                    body.vy = 0;
                    body.onCeiling = true;
                }
            }
        }
        if (!blocked) {
            entity.y = newY;
        }
    }
}

export function aabbOverlap(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

export function resolveAABB(a, b) {
    const overlapLeft = (a.x + a.width) - b.x;
    const overlapRight = (b.x + b.width) - a.x;
    const overlapTop = (a.y + a.height) - b.y;
    const overlapBottom = (b.y + b.height) - a.y;

    const minX = Math.min(overlapLeft, overlapRight);
    const minY = Math.min(overlapTop, overlapBottom);

    if (minX < minY) {
        if (overlapLeft < overlapRight) a.x -= overlapLeft;
        else a.x += overlapRight;
    } else {
        if (overlapTop < overlapBottom) a.y -= overlapTop;
        else a.y += overlapBottom;
    }
}
