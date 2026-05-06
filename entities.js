/**
 * entities.js — Full Entity System
 * 
 * Player with: run, jump (variable), double jump, wall slide,
 * wall jump, dash, attack combo (3-hit).
 * 
 * Enemy types: Walker (patrol), Chaser (aggro/shooter).
 * Collectibles, Projectiles, ParticleSystem.
 */

import { PhysicsBody, PHYSICS, applyPhysics, moveAndCollide, aabbOverlap } from './physics.js';

// ═══════════════════════════════════════════════════════════
//  Base Entity
// ═══════════════════════════════════════════════════════════

export class Entity {
    constructor(x, y, width = 16, height = 16) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.body = new PhysicsBody();
        this.alive = true;
        this.active = true;
        this.sprite = null;
        this.tint = null;
        this.flipX = false;
        this.flipY = false;
        this.alpha = 1;
        this.rotation = 0;
        this.zIndex = 0;
        this.tags = [];
    }

    update(dt) {}
    lateUpdate(dt) {}
    onCollide(other) {}

    destroy() { this.alive = false; }

    setTileGrid(tiles, tileW, tileH) {
        this.tiles = tiles;
        this.tileW = tileW;
        this.tileH = tileH;
    }

    getCenter() {
        return { x: this.x + this.width / 2, y: this.y + this.height / 2 };
    }

    getRect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}

// ═══════════════════════════════════════════════════════════
//  Player — Full Implementation
// ═══════════════════════════════════════════════════════════

export class Player extends Entity {
    constructor(x, y) {
        super(x, y, 14, 16);

        this.body.maxSpeedX = PHYSICS.playerMoveSpeed;
        this.body.friction = PHYSICS.playerFriction;
        this.body.airFriction = PHYSICS.playerAirFriction;

        // ── Input ──
        this.moveInput = { x: 0, y: 0, jump: false, jumpHeld: false, dash: false, attack: false, power: false };

        // ── Jump mechanics ──
        this.jumpForce = PHYSICS.playerJumpForce;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.jumpHoldTimer = 0;
        this.jumpHoldTimeMax = 0.2;
        this.jumpsLeft = 1;
        this.maxJumps = 1;
        this.canDoubleJump = false;
        this.wallJumpCooldown = 0;
        this.canWallJump = true;

        // ── Dash ──
        this.canDash = true;
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashDuration = 0.15;
        this.dashSpeed = 2000;
        this.dashCooldown = 0.35;
        this.dashCDTimer = 0;
        this.dashDir = 1;

        // ── Attack combo ──
        this.attackTimer = 0;
        this.comboStep = 0;       // 0, 1, 2, 3 (0 = idle)
        this.comboWindow = 0.4;   // Seconds to continue combo
        this.attackActiveFrames = 0;  // How long hitbox is active
        this.attackCooldown = 0;
        this.attackHitSet = new Set(); // Track hit enemies this swing

        // ── State ──
        this.state = 'idle';
        this.animFrame = 0;
        this.animTimer = 0;
        this.animSpeed = 0.1;

        // ── Invincibility ──
        this.invincible = false;
        this.invincibleTimer = 0;

        // ── Stats ──
        this.health = 4;
        this.maxHealth = 4;
        this.lives = 3;
        this.score = 0;

        // ── Chrono Gauge ──
        this.chronoGauge = 8;
        this.chronoGaugeMax = 8;
        this.chronoRechargeDelay = 0.5;
        this.chronoRechargeTimer = 0;
        this.chronoRechargeRate = 0.666; // seconds of gauge per real second

        // Time powers
        this.unlockedPowers = ['burst', 'slow', 'rush', 'rewind', 'echo'];
        this.activePower = null; // null, 'slow', 'rush'
        this.burstTimer = 0;
        this.burstDuration = 0.3;
        this.burstCooldown = 0;
        this.slowActive = false;
        this.rushActive = false;

        // ── Rewind ──
        this.positionHistory = new Array(180); // 3 seconds at 60fps
        this.historyIndex = 0;
        this.historyFull = false;
        this.rewindCooldown = 0;

        // ── Echo recording (position history for frozen-movement playback) ──
        this.echoPositionHistory = [];
        this.maxEchoHistory = 240; // 4 seconds at 60fps — GDD spec

        // ── Visual ──
        this.footstepTimer = 0;
        this.dashTrailTimer = 0;

        // ── Movement stats (for camera look-ahead) ──
        this.lastGroundedY = y;
        this._prevOnGround = true;
    }

    setInput(input) {
        this.moveInput.x = input.x || 0;
        this.moveInput.jump = !!input.jump;
        this.moveInput.jumpHeld = !!input.jumpHeld;
        this.moveInput.dash = !!input.dash;
        this.moveInput.attack = !!input.attack;
        this.moveInput.power = !!input.power;
    }

    update(dt) {
        // ── Timers ──
        this.invincibleTimer -= dt;
        if (this.invincibleTimer <= 0) this.invincible = false;

        this.attackTimer -= dt;
        this.attackCooldown -= dt;
        if (this.attackTimer <= 0 && this.comboStep > 0) {
            this.comboStep = 0;
            this.attackHitSet.clear();
        }

        this.dashCDTimer -= dt;
        this.wallJumpCooldown -= dt;

        this.burstTimer -= dt;
        this.burstCooldown -= dt;
        this.rewindCooldown -= dt;

        // Chrono gauge recharge
        if (this.chronoRechargeTimer > 0) {
            this.chronoRechargeTimer -= dt;
        } else if (!this.slowActive && !this.rushActive && this.burstTimer <= 0) {
            this.chronoGauge = Math.min(this.chronoGaugeMax, this.chronoGauge + this.chronoRechargeRate * dt);
        }

        // ── Slow field drain (1 bar/sec) ──
        if (this.slowActive && this.chronoGauge > 0) {
            this.chronoGauge -= 1.0 * dt;
            if (this.chronoGauge <= 0) {
                this.slowActive = false;
                this.activePower = null;
            }
        }

        // ── Time rush drain (1.5 bars/sec) ──
        if (this.rushActive && this.chronoGauge > 0) {
            this.chronoGauge -= 1.5 * dt;
            if (this.chronoGauge <= 0) {
                this.rushActive = false;
                this.activePower = null;
            }
        }

        // ── Dash state ──
        if (this.isDashing) {
            this.dashTimer -= dt;
            // Fixed velocity during dash
            this.body.vx = this.dashDir * this.dashSpeed;
            this.body.vy = 0;
            this.body.gravityScale = 0;
            // I-frames during dash
            this.invincible = true;

            // Trail particles (handled externally)
            this.dashTrailTimer += dt;

            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.body.gravityScale = 1;
                this.body.vx = this.dashDir * 50; // Dash residual speed
                this.dashCDTimer = this.dashCooldown;
            }
            return; // Skip other updates while dashing
        }

        // ── Coyote time & jump reset ──
        if (this.body.onGround) {
            this.coyoteTimer = PHYSICS.coyoteTime;
            this.jumpsLeft = this.maxJumps;
            this.canDash = true;
            this.lastGroundedY = this.y;
        } else {
            this.coyoteTimer -= dt;
        }

        // ── Jump buffer ──
        if (this.moveInput.jump && this.jumpBufferTimer <= 0) {
            this.jumpBufferTimer = PHYSICS.jumpBufferTime;
        }
        if (this.jumpBufferTimer > 0) {
            this.jumpBufferTimer -= dt;
        }

        // ── Variable height jump ──
        if (this.moveInput.jumpHeld && this.body.vy < 0) {
            this.jumpHoldTimer += dt;
            if (this.jumpHoldTimer > this.jumpHoldTimeMax) {
                this.jumpHoldTimer = this.jumpHoldTimeMax;
            }
            this.body.gravityScale = 0.55;
        } else {
            this.jumpHoldTimer = 0;
            this.body.gravityScale = 1;
        }

        // ── Horizontal movement ──
        let baseSpeed = 200;
        if (this.rushActive) baseSpeed = 400;
        if (this.burstTimer > 0) baseSpeed = 600; // 3x normal speed (200 * 3 = 600)
        if (this.slowActive) baseSpeed = 160; // 80% of normal speed
        const speed = baseSpeed;
        this.body.maxSpeedX = speed;
        const accel = speed / 0.08; // Reach max speed in ~80ms
        this.body.ax = this.moveInput.x * accel;

        // ── Jump execution ──
        const canCoyoteJump = this.coyoteTimer > 0 && this.jumpsLeft > 0;
        const canAirJump = !this.body.onGround && this.jumpsLeft >= 1 && this.canDoubleJump;

        if (this.jumpBufferTimer > 0 && (canCoyoteJump || canAirJump || this.body.onWallLeft || this.body.onWallRight)) {
            if ((this.body.onWallLeft || this.body.onWallRight) && this.wallJumpCooldown <= 0) {
                const wallDir = this.body.onWallLeft ? 1 : -1;
                this.body.vx = wallDir * speed * 0.6;
                this.body.vy = this.jumpForce * 0.85;
                this.coyoteTimer = 0;
                this.jumpBufferTimer = 0;
                this.wallJumpCooldown = 0.25;
                this.jumpsLeft = this.maxJumps - 1;
                this.flipX = wallDir < 0;
            } else if (canCoyoteJump) {
                this.body.vy = this.jumpForce;
                this.coyoteTimer = 0;
                this.jumpBufferTimer = 0;
                this.jumpsLeft = Math.max(0, this.jumpsLeft - 1);
            } else if (canAirJump) {
                this.body.vy = this.jumpForce * 0.85;
                this.jumpsLeft--;
                this.jumpBufferTimer = 0;
            }
        }

        // ── Wall slide ──
        if ((this.body.onWallLeft || this.body.onWallRight) && !this.body.onGround && this.body.vy > 0) {
            this.body.vy = Math.min(this.body.vy, 80);
            this.body.gravityScale = 0.3;
        }

        // ── Dash activation ──
        if (this.moveInput.dash && this.canDash && this.dashCDTimer <= 0 && !this.isDashing) {
            this.isDashing = true;
            this.dashTimer = this.dashDuration;
            this.canDash = false;
            this.dashDir = this.moveInput.x !== 0 ? this.moveInput.x : (this.flipX ? -1 : 1);
            this.body.vx = this.dashDir * this.dashSpeed;
            this.body.vy = 0;
            this.body.gravityScale = 0;
            this.invincible = true;
            this.attackHitSet.clear();
            return;
        }

        // ── Attack ──
        if (this.moveInput.attack && this.attackCooldown <= 0 && !this.isDashing) {
            this._executeAttack();
        }

        // ── Time power ──
        if (this.moveInput.power && this.chronoGauge >= 2.0 && this.burstCooldown <= 0 && this.burstTimer <= 0) {
            this._activateTimePower();
        }

        // ── Apply physics ──
        applyPhysics(this.body, dt);

        // ── Tile collision ──
        if (this.tiles) {
            moveAndCollide(this, dt, this.tiles, this.tileW, this.tileH, id => id >= 1, id => id === 2);
        }

        // ── State ──
        if (!this.alive) {
            this.state = 'dead';
        } else if (this.attackActiveFrames > 0) {
            this.state = 'attack';
        } else if (this.body.onGround) {
            this.state = Math.abs(this.body.vx) > 15 ? 'running' : 'idle';
        } else if (this.body.vy < 0) {
            this.state = 'jumping';
        } else {
            this.state = 'falling';
        }

        // ── Animation ──
        this.animTimer += dt;
        const animSpeed = this.state === 'running' ? 0.06 : (this.state === 'attack' ? 0.04 : 0.12);
        if (this.animTimer >= animSpeed) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        // ── Record position history (for rewind) ──
        this._recordPosition();

        // ── Record position history (for echo frozen copy) ──
        this._recordEchoPosition();

        // ── Facing ──
        if (this.moveInput.x > 0) this.flipX = false;
        if (this.moveInput.x < 0) this.flipX = true;

        // ── Ground state tracking ──
        this._prevOnGround = this.body.onGround;

        // ── Footsteps ──
        this.footstepTimer += dt;
    }

    _executeAttack() {
        // Combo system
        if (this.comboStep === 0) {
            this.comboStep = 1;
        } else if (this.comboStep < 3 && this.attackTimer > 0) {
            this.comboStep++;
        } else if (this.comboStep >= 3) {
            // Combo complete, reset
            this.comboStep = 1;
        }
        this.attackTimer = this.comboWindow;
        this.attackCooldown = 0.12;
        this.attackActiveFrames = 6; // ~100ms at 60fps
        this.attackHitSet.clear();
    }

    /**
     * Get attack hitbox based on current combo step.
     */
    getAttackHitbox() {
        if (this.attackActiveFrames <= 0 || this.comboStep === 0) return null;

        const dir = this.flipX ? -1 : 1;
        const range = this.comboStep >= 3 ? 40 : 32;
        const damage = this.comboStep >= 3 ? 2 : 1;

        return {
            x: dir > 0 ? this.x + this.width : this.x - range,
            y: this.y,
            width: range,
            height: this.height,
            damage,
            step: this.comboStep,
        };
    }

    _activateTimePower() {
        if (this.unlockedPowers.includes('burst') && this.chronoGauge >= 0.5 && this.burstCooldown <= 0) {
            // Chrono Burst — slow enemies & projectiles 60% for 0.5s (GDD spec)
            this.chronoGauge -= 0.5;
            this.burstTimer = 0.5;
            this.burstCooldown = 1.0;
            this.chronoRechargeTimer = this.chronoRechargeDelay;
        }
    }

    /**
     * Toggle slow field.
     */
    toggleSlowField() {
        if (!this.unlockedPowers.includes('slow')) return false;
        if (this.slowActive) {
            this.slowActive = false;
            this.activePower = null;
            return true;
        }
        if (this.chronoGauge < 2.0) return false;
        // Deactivate rush if active (mutually exclusive)
        if (this.rushActive) {
            this.rushActive = false;
        }
        this.chronoGauge -= 2.0;
        this.slowActive = true;
        this.activePower = 'slow';
        this.chronoRechargeTimer = 0.5;
        return true;
    }

    /**
     * Toggle time rush.
     */
    toggleTimeRush() {
        if (!this.unlockedPowers.includes('rush')) return false;
        if (this.rushActive) {
            this.rushActive = false;
            this.activePower = null;
            return true;
        }
        if (this.chronoGauge < 1.0) return false;
        // Deactivate slow if active (mutually exclusive)
        if (this.slowActive) {
            this.slowActive = false;
        }
        this.chronoGauge -= 1.0;
        this.rushActive = true;
        this.activePower = 'rush';
        this.chronoRechargeTimer = 0.5;
        return true;
    }

    // ── Position recording (for rewind) ──

    _recordPosition() {
        this.positionHistory[this.historyIndex] = { x: this.x, y: this.y, health: this.health };
        this.historyIndex = (this.historyIndex + 1) % this.positionHistory.length;
        if (this.historyIndex === 0) this.historyFull = true;
    }

    /**
     * Rewind — restore position & health to 3 seconds ago. Cost 3 bars. Cooldown 5s.
     */
    activateRewind() {
        if (!this.unlockedPowers.includes('rewind')) return false;
        if (this.chronoGauge < 3.0) return false;
        if (this.rewindCooldown > 0) return false;
        const lookback = Math.min(180, this.historyFull ? 180 : this.historyIndex);
        if (lookback < 2) return false;
        let idx = this.historyIndex - lookback;
        if (idx < 0) {
            if (this.historyFull) {
                idx += this.positionHistory.length;
            } else {
                return false;
            }
        }
        const pos = this.positionHistory[idx];
        if (!pos) return false;
        this.chronoGauge -= 3.0;
        this.chronoRechargeTimer = this.chronoRechargeDelay;
        this.rewindCooldown = 5.0;
        this.x = pos.x;
        this.y = pos.y;
        // Restore health to snapshot value (max 3s ago)
        if (pos.health !== undefined) {
            this.health = Math.min(this.maxHealth, Math.max(1, pos.health));
        }
        this.body.vx = 0;
        this.body.vy = 0;
        this.body.gravityScale = 1;
        this.invincible = true;
        this.invincibleTimer = 0.3;
        return true;
    }

    // ── Position recording (for echo frozen copy) ──

    _recordEchoPosition() {
        this.echoPositionHistory.push({ x: this.x, y: this.y, flipX: this.flipX });
        if (this.echoPositionHistory.length > this.maxEchoHistory) {
            this.echoPositionHistory.shift();
        }
    }

    /**
     * Echo — creates a frozen copy of the player's last 4 seconds of movement.
     * Cost 3.0 bars. GDD spec: "Spawns a frozen copy of the player's last 2s of movement.
     * Echoes deal damage on contact. One at a time."
     * Returns position history array or null if insufficient gauge.
     */
    activateEcho() {
        if (!this.unlockedPowers.includes('echo')) return false;
        if (this.chronoGauge < 3.0) return false;
        if (this.echoPositionHistory.length < 30) return null; // Need at least 30 frames
        this.chronoGauge -= 3.0;
        this.chronoRechargeTimer = this.chronoRechargeDelay;
        return this.echoPositionHistory.slice();
    }

    isBurstActive() {
        return this.burstTimer > 0;
    }

    takeDamage(amount = 1) {
        if (this.invincible || !this.alive || this.isDashing) return;
        this.health -= amount;
        this.invincible = true;
        this.invincibleTimer = 1.5;
        this.body.vy = -200;
        this.body.vx = this.flipX ? 100 : -100;
        if (this.health <= 0) this.die();
    }

    die() {
        this.alive = false;
        this.state = 'dead';
        this.body.vx = 0;
        this.body.vy = -300;
        this.body.gravityScale = 1;
        this.isDashing = false;
        this.slowActive = false;
        this.rushActive = false;
        this.activePower = null;
    }

    addScore(points) { this.score += points; }
}

// ═══════════════════════════════════════════════════════════
//  Enemy — Walker (basic patrol)
// ═══════════════════════════════════════════════════════════

export class Enemy extends Entity {
    constructor(x, y, width = 16, height = 16) {
        super(x, y, width, height);
        this.tags.push('enemy');
        this.body.gravityScale = 0.8;
        this.body.maxSpeedX = 60;
        this.body.friction = 200;
        this.direction = -1;
        this.spawnX = x;
        this.patrolRange = 60;
        this.detectRange = 120;
        this.patrolRangeY = 0; // vertical patrol tolerance
        this.aggro = false;
        this.aggroTimer = 0;
        this.health = 2;
        this.maxHealth = 2;
        this.damage = 1;
        this.scoreValue = 100;
        this.hitFlash = 0;
        this.animFrame = 0;
        this.animTimer = 0;
        this.animSpeed = 0.15;
    }

    update(dt) {
        this.hitFlash -= dt;
        if (!this.aggro) {
            this.body.ax = this.direction * (this.body.maxSpeedX / 0.1);
            if (this.x < this.spawnX - this.patrolRange) this.direction = 1;
            else if (this.x > this.spawnX + this.patrolRange) this.direction = -1;
            if (this.body.onWallLeft) this.direction = 1;
            if (this.body.onWallRight) this.direction = -1;
        } else {
            this.aggroTimer -= dt;
            if (this.aggroTimer <= 0) this.aggro = false;
        }

        applyPhysics(this.body, dt, PHYSICS.enemyGravity);

        // ── Tile collision ──
        if (this.tiles) {
            moveAndCollide(this, dt, this.tiles, this.tileW, this.tileH, id => id >= 1, id => id === 2);
        }

        if (Math.abs(this.body.vx) > 5) {
            this.animTimer += dt;
            if (this.animTimer >= this.animSpeed) {
                this.animTimer = 0;
                this.animFrame = (this.animFrame + 1) % 2;
            }
        }

        this.flipX = this.direction < 0;

        if (this.health <= 0 || this.y > 2000) this.destroy();
    }

    aggroTowards(player) {
        if (!player || !player.alive) return;
        this.aggro = true;
        this.aggroTimer = 2.0;
        this.direction = player.x < this.x ? -1 : 1;
        this.body.maxSpeedX = 120;
    }

    takeDamage(amount = 1) {
        this.health -= amount;
        this.hitFlash = 0.1;
        if (this.health <= 0) this.destroy();
    }

    onCollide(other) {
        if (other.tags.includes('projectile')) {
            this.takeDamage(1);
            other.destroy();
        }
    }
}

// ═══════════════════════════════════════════════════════════
//  Enemy — Chaser (follows & attacks)
// ═══════════════════════════════════════════════════════════

export class ChaserEnemy extends Enemy {
    constructor(x, y) {
        super(x, y, 16, 16);
        this.health = 3;
        this.maxHealth = 3;
        this.damage = 1;
        this.scoreValue = 200;
        this.body.maxSpeedX = 90;
        this.detectRange = 160;
        this.chaseSpeed = 140;
        this.attackCooldown = 0;
        this.attackRange = 24;
    }

    update(dt) {
        this.attackCooldown -= dt;
        this.hitFlash -= dt;

        if (this.aggro) {
            this.aggroTimer -= dt;
            if (this.aggroTimer <= 0) this.aggro = false;
            this.body.maxSpeedX = this.chaseSpeed;
            this.body.ax = this.direction * (this.body.maxSpeedX / 0.08);
            // Check walls when chasing
            if (this.body.onWallLeft) this.direction = 1;
            if (this.body.onWallRight) this.direction = -1;
        } else {
            this.body.maxSpeedX = 60;
            this.body.ax = this.direction * (this.body.maxSpeedX / 0.1);
            if (this.x < this.spawnX - this.patrolRange) this.direction = 1;
            else if (this.x > this.spawnX + this.patrolRange) this.direction = -1;
            if (this.body.onWallLeft) this.direction = 1;
            if (this.body.onWallRight) this.direction = -1;
        }

        applyPhysics(this.body, dt, PHYSICS.enemyGravity);

        // ── Tile collision ──
        if (this.tiles) {
            moveAndCollide(this, dt, this.tiles, this.tileW, this.tileH, id => id >= 1, id => id === 2);
        }

        this.flipX = this.direction < 0;
        if (this.health <= 0 || this.y > 2000) this.destroy();
    }

    aggroTowards(player) {
        if (!player || !player.alive) return;
        this.aggro = true;
        this.aggroTimer = 2.5;
        this.direction = player.x < this.x ? -1 : 1;
    }

    canAttack(player) {
        if (this.attackCooldown > 0 || !player || !player.alive) return false;
        const dist = Math.abs(player.x - this.x);
        return dist < this.attackRange;
    }

    performAttack() {
        this.attackCooldown = 1.0;
    }
}

// ═══════════════════════════════════════════════════════════
//  Enemy — Shooter (ranged)
// ═══════════════════════════════════════════════════════════

export class ShooterEnemy extends Enemy {
    constructor(x, y) {
        super(x, y, 16, 16);
        this.health = 3;
        this.damage = 1;
        this.scoreValue = 250;
        this.shootTimer = 0;
        this.shootInterval = 2.0;
        this.body.maxSpeedX = 0; // Stationary
        this.detectRange = 200;
    }

    update(dt) {
        this.shootTimer -= dt;
        this.hitFlash -= dt;

        if (this.aggro) {
            this.aggroTimer -= dt;
            if (this.aggroTimer <= 0) this.aggro = false;
        }

        applyPhysics(this.body, dt, PHYSICS.enemyGravity);

        // ── Tile collision ──
        if (this.tiles) {
            moveAndCollide(this, dt, this.tiles, this.tileW, this.tileH, id => id >= 1, id => id === 2);
        }

        this.flipX = this.direction < 0;
        if (this.health <= 0 || this.y > 2000) this.destroy();
    }

    canShoot() {
        return this.aggro && this.shootTimer <= 0;
    }

    getProjectileSpawn() {
        const dir = this.flipX ? -1 : 1;
        return {
            x: dir > 0 ? this.x + this.width : this.x,
            y: this.y + this.height / 2,
            dirX: dir,
            dirY: 0,
        };
    }

    resetShootTimer() {
        this.shootTimer = this.shootInterval;
    }
}

// ═══════════════════════════════════════════════════════════
//  Collectible
// ═══════════════════════════════════════════════════════════

export class Collectible extends Entity {
    constructor(x, y, type = 'coin') {
        super(x, y, 8, 8);
        this.tags.push('collectible');
        this.collectibleType = type;
        this.baseY = y;
        this.floatTimer = Math.random() * Math.PI * 2;
        this.floatSpeed = 2;
        this.floatHeight = 3;
        this.collected = false;
        this.sparkleFrame = 0;
    }

    update(dt) {
        this.floatTimer += dt * this.floatSpeed;
        this.y = this.baseY + Math.sin(this.floatTimer) * this.floatHeight;
        this.sparkleFrame = (this.sparkleFrame + 1) % 60;
    }

    collect() {
        if (this.collected) return 0;
        this.collected = true;
        this.destroy();
        switch (this.collectibleType) {
            case 'coin': return 50;
            case 'gem': return 200;
            case 'star': return 500;
            case 'heart': return 0;
            case 'shard': return 50;
            default: return 10;
        }
    }
}

// ═══════════════════════════════════════════════════════════
//  Projectile
// ═══════════════════════════════════════════════════════════

export class Projectile extends Entity {
    constructor(x, y, dirX, dirY, speed = 400, fromPlayer = true) {
        super(x, y, 4, 4);
        this.tags.push('projectile');
        const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
        this.body.vx = (dirX / len) * speed;
        this.body.vy = (dirY / len) * speed;
        this.body.gravityScale = 0;
        this.lifetime = 2;
        this.timer = 0;
        this.fromPlayer = fromPlayer; // true = player projectile, false = enemy
        if (!this.fromPlayer) this.tags.push('enemy_projectile');
    }

    update(dt) {
        this.timer += dt;
        if (this.timer >= this.lifetime) this.destroy();

        // ── Tile collision ──
        if (this.tiles) {
            moveAndCollide(this, dt, this.tiles, this.tileW, this.tileH, id => id >= 1, id => id === 2);
        } else {
            this.x += this.body.vx * dt;
            this.y += this.body.vy * dt;
        }
    }

    onCollide(other) {
        if (other.tags.includes('solid')) this.destroy();
    }
}

// ═══════════════════════════════════════════════════════════
//  Echo Entity — replays recorded player input
// ═══════════════════════════════════════════════════════════

export class EchoEntity extends Entity {
    constructor(x, y, positionHistory) {
        super(x, y, 14, 16);
        this.tags.push('echo', 'ally');
        // Position history: [{x, y, flipX}, ...] — exact player positions
        this.positionHistory = positionHistory;
        this.currentFrame = 0;
        this.lifetime = positionHistory.length / 60; // ~4 seconds at 240 frames
        this.timer = 0;
        this.alpha = 0.7;
        this.zIndex = 5;
        this.dealtDamage = new Set(); // Track enemies hit
        // Set initial position from first snapshot
        if (positionHistory.length > 0) {
            const first = positionHistory[0];
            this.x = first.x;
            this.y = first.y;
            this.flipX = first.flipX;
        }
    }

    update(dt) {
        this.timer += dt;
        this.currentFrame = Math.floor(this.timer * 60);
        if (this.currentFrame >= this.positionHistory.length) {
            this.destroy();
            return;
        }
        // Exact position playback — no physics simulation needed
        const pos = this.positionHistory[this.currentFrame];
        this.x = pos.x;
        this.y = pos.y;
        this.flipX = pos.flipX;
        // Pulse alpha for visual feedback
        this.alpha = 0.5 + Math.sin(this.timer * 4) * 0.2;
    }

    getCenter() {
        return { x: this.x + this.width / 2, y: this.y + this.height / 2 };
    }

    getRect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}

// ═══════════════════════════════════════════════════════════
//  Particle System
// ═══════════════════════════════════════════════════════════

export class Particle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = 0; this.vy = 0;
        this.life = 1; this.maxLife = 1;
        this.size = 2; this.color = '#fff';
        this.alpha = 1; this.gravity = 0; this.friction = 1;
    }
}

export class ParticleSystem {
    constructor(maxParticles = 300) {
        this.particles = [];
        this.maxParticles = maxParticles;
        this.pool = [];
        for (let i = 0; i < maxParticles; i++) this.pool.push(new Particle(0, 0));
    }

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

    emitStream(x, y, config = {}) {
        const perFrame = Math.ceil((config.perSecond || 20) / 60);
        this.emit(x, y, { ...config, count: perFrame });
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) { this._recycle(p); this.particles.splice(i, 1); continue; }
            p.vx *= p.friction;
            p.vy *= p.friction;
            p.vy += p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.alpha = Math.max(0, p.life / p.maxLife);
        }
    }

    _getParticle() {
        if (this.particles.length >= this.maxParticles) return null;
        return this.pool.length > 0 ? this.pool.pop() : new Particle(0, 0);
    }

    _recycle(p) {
        if (this.pool.length < this.maxParticles) this.pool.push(p);
    }

    clear() { while (this.particles.length > 0) this._recycle(this.particles.pop()); }
    get count() { return this.particles.length; }
}
