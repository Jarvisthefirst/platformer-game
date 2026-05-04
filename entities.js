/**
 * entities.js — Entity System
 * 
 * Base entity classes for the platformer:
 *   - Entity (base)
 *   - Player (movement, jumping, states)
 *   - Enemy (base class for AI-driven enemies)
 *   - Collectible (coins, power-ups)
 *   - Projectile (bullets, thrown objects)
 *   - ParticleSystem (trails, effects)
 */

import { PhysicsBody, PHYSICS, applyPhysics } from './physics.js';

// ═══════════════════════════════════════════════════════════════════════
//  Base Entity
// ═══════════════════════════════════════════════════════════════════════

export class Entity {
    constructor(x, y, width = 16, height = 16) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.body = new PhysicsBody();
        this.alive = true;
        this.active = true;

        // Visual
        this.sprite = null;     // Sprite name from asset loader
        this.tint = null;       // CSS color or null
        this.flipX = false;
        this.flipY = false;
        this.alpha = 1;
        this.rotation = 0;
        this.zIndex = 0;        // Render order

        // Tags for identification
        this.tags = [];
    }

    /**
     * Called every fixed timestep.
     */
    update(dt) {
        // Override in subclasses
    }

    /**
     * Called after physics/collision resolution.
     */
    lateUpdate(dt) {
        // Override in subclasses
    }

    /**
     * Called when the entity collides with something.
     */
    onCollide(other) {
        // Override in subclasses
    }

    /**
     * Mark for removal.
     */
    destroy() {
        this.alive = false;
    }

    /**
     * Get the center position.
     */
    getCenter() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
        };
    }

    /**
     * Get collision rect (same as position by default).
     */
    getRect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}


// ═══════════════════════════════════════════════════════════════════════
//  Player
// ═══════════════════════════════════════════════════════════════════════

export class Player extends Entity {
    constructor(x, y) {
        super(x, y, 14, 16); // Slightly smaller than tile for tight fits

        this.body.maxSpeedX = PHYSICS.playerMoveSpeed;
        this.body.friction = PHYSICS.playerFriction;
        this.body.airFriction = PHYSICS.playerAirFriction;

        // Movement
        this.moveInput = { x: 0, y: 0 };
        this.jumpPressed = false;
        this.jumpHeld = false;

        // Jump mechanics
        this.jumpForce = PHYSICS.playerJumpForce;
        this.coyoteTimer = 0;            // Time since last ground contact
        this.jumpBufferTimer = 0;        // Time since jump button pressed
        this.jumpHoldTimer = 0;          // How long jump has been held (for variable height)
        this.jumpHoldTimeMax = 0.2;      // Max hold time for variable jump height
        this.wallJumped = false;         // Prevent re-wall-jump
        this.wallSlideSpeed = 100;       // Fall speed while wall sliding

        // State machine
        this.state = 'idle'; // idle, running, jumping, falling, wallSlide, dead

        // Animations (frame indices for spritesheet — set externally)
        this.animFrame = 0;
        this.animTimer = 0;
        this.animSpeed = 0.1;

        // Invincibility frames
        this.invincible = false;
        this.invincibleTimer = 0;

        // Stats
        this.lives = 3;
        this.score = 0;
        this.health = 5;
        this.maxHealth = 5;

        // Double jump
        this.jumpsLeft = 2;
        this.maxJumps = 2;
    }

    /**
     * Set input for this frame.
     * @param {object} input - { x: -1|0|1, jump: bool }
     */
    setInput(input) {
        this.moveInput.x = input.x || 0;
        this.jumpPressed = input.jump || false;
        this.jumpHeld = input.jumpHeld || false;
    }

    update(dt) {
        // Invincibility timer
        if (this.invincible) {
            this.invincibleTimer -= dt;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }

        // ── Coyote time ──
        if (this.body.onGround) {
            this.coyoteTimer = PHYSICS.coyoteTime;
            this.jumpsLeft = this.maxJumps;
        } else {
            this.coyoteTimer -= dt;
        }

        // ── Jump buffer ──
        if (this.jumpPressed && this.jumpBufferTimer <= 0) {
            this.jumpBufferTimer = PHYSICS.jumpBufferTime;
        }
        if (this.jumpBufferTimer > 0) {
            this.jumpBufferTimer -= dt;
        }

        // ── Variable height jump ──
        if (this.jumpHeld && this.body.vy < 0) {
            this.jumpHoldTimer += dt;
            if (this.jumpHoldTimer > this.jumpHoldTimeMax) {
                this.jumpHoldTimer = this.jumpHoldTimeMax;
            }
            // Reduce gravity while holding jump (feels floatier)
            this.body.gravityScale = 0.6;
        } else {
            this.jumpHoldTimer = 0;
            this.body.gravityScale = 1;
        }

        // ── Horizontal movement ──
        this.body.ax = this.moveInput.x * (this.body.maxSpeedX / 0.1); // Acceleration to reach max speed in ~0.1s

        // ── Jump execution ──
        const canCoyoteJump = this.coyoteTimer > 0;
        const canDoubleJump = !this.body.onGround && this.jumpsLeft > 0 && !canCoyoteJump;

        if (this.jumpBufferTimer > 0 && (canCoyoteJump || canDoubleJump || this.body.onWallLeft || this.body.onWallRight)) {
            if (this.body.onWallLeft || this.body.onWallRight) {
                // Wall jump
                const wallDir = this.body.onWallLeft ? 1 : -1;
                this.body.vx = wallDir * this.body.maxSpeedX * 0.8;
                this.body.vy = this.jumpForce * 0.85;
                this.coyoteTimer = 0;
                this.jumpBufferTimer = 0;
                this.jumpsLeft = this.maxJumps - 1;
            } else if (canCoyoteJump) {
                // Ground jump
                this.body.vy = this.jumpForce;
                this.coyoteTimer = 0;
                this.jumpBufferTimer = 0;
            } else if (canDoubleJump) {
                // Double jump
                this.body.vy = this.jumpForce * 0.85;
                this.jumpsLeft--;
                this.jumpBufferTimer = 0;
            }
        }

        // ── Wall sliding ──
        if ((this.body.onWallLeft || this.body.onWallRight) && !this.body.onGround && this.body.vy > 0) {
            this.body.vy = Math.min(this.body.vy, this.wallSlideSpeed);
        }

        // ── Apply physics ──
        applyPhysics(this.body, dt);

        // ── State transitions ──
        if (!this.alive) {
            this.state = 'dead';
        } else if (this.body.onGround) {
            this.state = Math.abs(this.body.vx) > 10 ? 'running' : 'idle';
        } else if (this.body.vy < 0) {
            this.state = 'jumping';
        } else {
            this.state = 'falling';
        }

        // ── Animation timer ──
        this.animTimer += dt;
        if (this.animTimer >= this.animSpeed) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        // ── Facing direction ──
        if (this.moveInput.x > 0) this.flipX = false;
        if (this.moveInput.x < 0) this.flipX = true;
    }

    /**
     * Take damage from an enemy or hazard.
     */
    takeDamage(amount = 1) {
        if (this.invincible || !this.alive) return;

        this.health -= amount;
        this.invincible = true;
        this.invincibleTimer = 1.5; // 1.5 seconds of invincibility

        if (this.health <= 0) {
            this.die();
        }
    }

    /**
     * Player death.
     */
    die() {
        this.alive = false;
        this.state = 'dead';
        this.body.vx = 0;
        this.body.vy = -300; // Death bounce
        this.body.gravityScale = 1;
    }

    /**
     * Add score.
     */
    addScore(points) {
        this.score += points;
    }

    onCollide(other) {
        if (other.tags.includes('enemy')) {
            // Check if stomping (falling onto enemy from above)
            if (this.body.vy > 0 && this.y + this.height - 8 < other.y) {
                // Stomp!
                other.destroy();
                this.body.vy = -250; // Bounce
                this.addScore(100);
            } else {
                this.takeDamage(1);
            }
        }

        if (other.tags.includes('collectible')) {
            this.addScore(50);
            other.destroy();
        }
    }
}


// ═══════════════════════════════════════════════════════════════════════
//  Enemy (Base Class)
// ═══════════════════════════════════════════════════════════════════════

export class Enemy extends Entity {
    constructor(x, y, width = 16, height = 16) {
        super(x, y, width, height);

        this.tags.push('enemy');
        this.body.gravityScale = 0.8;
        this.body.maxSpeedX = 60;
        this.body.friction = 200;

        // AI
        this.direction = -1;    // -1 = left, 1 = right
        this.patrolRange = 60;  // Pixels from spawn point
        this.spawnX = x;
        this.detectRange = 100; // Pixels — aggro range
        this.aggro = false;

        this.health = 1;
        this.damage = 1;

        // Anim state
        this.animFrame = 0;
        this.animTimer = 0;
        this.animSpeed = 0.2;
    }

    update(dt) {
        // ── Basic patrol AI ──
        if (!this.aggro) {
            // Walk in current direction
            this.body.ax = this.direction * (this.body.maxSpeedX / 0.1);

            // Turn around at patrol bounds
            if (this.x < this.spawnX - this.patrolRange) {
                this.direction = 1;
            } else if (this.x > this.spawnX + this.patrolRange) {
                this.direction = -1;
            }

            // Turn at walls
            if (this.body.onWallLeft) this.direction = 1;
            if (this.body.onWallRight) this.direction = -1;
        }

        // ── Apply physics ──
        applyPhysics(this.body, dt);

        // ── Animations ──
        if (Math.abs(this.body.vx) > 5) {
            this.animTimer += dt;
            if (this.animTimer >= this.animSpeed) {
                this.animTimer = 0;
                this.animFrame = (this.animFrame + 1) % 2;
            }
        } else {
            this.animFrame = 0;
        }

        // Facing
        this.flipX = this.direction < 0;

        // ── Death ──
        if (this.health <= 0 || this.y > 2000) {
            this.destroy();
        }
    }

    takeDamage(amount = 1) {
        this.health -= amount;
        if (this.health <= 0) {
            this.destroy();
        }
    }

    onCollide(other) {
        // Enemies react to projectiles
        if (other.tags.includes('projectile')) {
            this.takeDamage(1);
            other.destroy();
        }
    }
}


// ═══════════════════════════════════════════════════════════════════════
//  Collectible (Coins, Power-ups, etc.)
// ═══════════════════════════════════════════════════════════════════════

export class Collectible extends Entity {
    constructor(x, y, type = 'coin') {
        super(x, y, 8, 8);

        this.tags.push('collectible');
        this.collectibleType = type; // 'coin', 'heart', 'star', 'gem'

        // Floating animation
        this.baseY = y;
        this.floatTimer = Math.random() * Math.PI * 2;
        this.floatSpeed = 2;
        this.floatHeight = 3;

        // Rotation / sparkle
        this.sparkleFrame = 0;
        this.collected = false;
    }

    update(dt) {
        // Float up and down
        this.floatTimer += dt * this.floatSpeed;
        this.y = this.baseY + Math.sin(this.floatTimer) * this.floatHeight;

        // Simple sparkle animation
        this.sparkleFrame = (this.sparkleFrame + 1) % 60;
    }

    collect() {
        if (this.collected) return 0;
        this.collected = true;
        this.destroy();

        // Return point value based on type
        switch (this.collectibleType) {
            case 'coin': return 50;
            case 'gem':  return 200;
            case 'star': return 500;
            case 'heart': return 0; // Restores health, handled by game logic
            default: return 10;
        }
    }
}


// ═══════════════════════════════════════════════════════════════════════
//  Projectile
// ═══════════════════════════════════════════════════════════════════════

export class Projectile extends Entity {
    constructor(x, y, dirX, dirY, speed = 400) {
        super(x, y, 4, 4);

        this.tags.push('projectile');

        // Normalize direction
        const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
        this.body.vx = (dirX / len) * speed;
        this.body.vy = (dirY / len) * speed;

        this.body.gravityScale = 0; // No gravity for projectiles
        this.lifetime = 2;          // Seconds before auto-destroy
        this.timer = 0;
        this.trailTimer = 0;
    }

    update(dt) {
        this.timer += dt;
        if (this.timer >= this.lifetime) {
            this.destroy();
        }

        // Movement (no gravity)
        this.x += this.body.vx * dt;
        this.y += this.body.vy * dt;

        // Trail particles (spawned by particle system externally)
        this.trailTimer += dt;
    }

    onCollide(other) {
        if (other.tags.includes('solid')) {
            this.destroy();
        }
    }
}


// ═══════════════════════════════════════════════════════════════════════
//  Particle System
// ═══════════════════════════════════════════════════════════════════════

export class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.life = 1;
        this.maxLife = 1;
        this.size = 2;
        this.color = '#fff';
        this.alpha = 1;
        this.gravity = 0;
        this.friction = 1;
    }
}

export class ParticleSystem {
    constructor(maxParticles = 200) {
        this.particles = [];
        this.maxParticles = maxParticles;
        this.pool = [];

        for (let i = 0; i < maxParticles; i++) {
            this.pool.push(new Particle(0, 0));
        }
    }

    /**
     * Spawn a burst of particles at a position.
     * 
     * @param {number} x - Center x
     * @param {number} y - Center y
     * @param {object} config - Particle configuration
     */
    emit(x, y, config = {}) {
        const count = config.count || 5;
        const spread = config.spread || 0.5;
        const speed = config.speed || 80;
        const life = config.life || 0.5;
        const size = config.size || 2;
        const color = config.color || '#fff';
        const gravity = config.gravity || 0;
        const friction = config.friction || 1;

        for (let i = 0; i < count; i++) {
            const p = this._getParticle();
            if (!p) break;

            const angle = Math.random() * Math.PI * 2;
            const spd = speed * (0.5 + Math.random() * 0.5);

            p.x = x + (Math.random() - 0.5) * spread * 20;
            p.y = y + (Math.random() - 0.5) * spread * 20;
            p.vx = Math.cos(angle) * spd;
            p.vy = Math.sin(angle) * spd;
            p.life = life * (0.5 + Math.random() * 0.5);
            p.maxLife = p.life;
            p.size = size * (0.8 + Math.random() * 0.4);
            p.color = color;
            p.alpha = 1;
            p.gravity = gravity;
            p.friction = friction;

            this.particles.push(p);
        }
    }

    /**
     * Spawn a continuous stream (for trails).
     */
    emitStream(x, y, config = {}) {
        const count = config.perSecond || 20;
        const perFrame = Math.ceil(count / 60);
        this.emit(x, y, { ...config, count: perFrame });
    }

    /**
     * Update all particles.
     */
    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this._recycle(p);
                this.particles.splice(i, 1);
                continue;
            }

            p.vx *= p.friction;
            p.vy *= p.friction;
            p.vy += p.gravity * dt;

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.alpha = Math.max(0, p.life / p.maxLife);
        }
    }

    /**
     * Get a particle from the pool or create one.
     */
    _getParticle() {
        if (this.particles.length >= this.maxParticles) return null;
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return new Particle(0, 0);
    }

    /**
     * Return a particle to the pool.
     */
    _recycle(p) {
        if (this.pool.length < this.maxParticles) {
            this.pool.push(p);
        }
    }

    /**
     * Clear all particles.
     */
    clear() {
        while (this.particles.length > 0) {
            this._recycle(this.particles.pop());
        }
    }

    /**
     * Get active particle count.
     */
    get count() {
        return this.particles.length;
    }
}
