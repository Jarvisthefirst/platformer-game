/**
 * engine.js — Core Game Engine
 * 
 * Modular 2D game engine with game loop, scene management,
 * input handling, camera system, asset loading, and resolution scaling.
 * 
 * Pure JavaScript, no frameworks. ES6+ modules.
 * 
 * Usage:
 *   import { Engine } from './engine.js';
 *   const game = new Engine(canvas);
 *   game.start();
 */

export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fixedTimestep = 1 / 60; // 60 updates per second
        this.accumulator = 0;
        this.running = false;
        this.rafId = null;

        // Frame rate tracking
        this.fps = 0;
        this.frameCount = 0;
        this.fpsTimer = 0;

        // Scene management
        this.scenes = {};
        this.currentScene = null;
        this.nextScene = null;

        // Input
        this.input = new InputManager();

        // Camera
        this.camera = new Camera(0, 0, canvas.width, canvas.height);

        // Asset loader
        this.assets = new AssetLoader();

        // Resolution scaling
        this.baseWidth = 320;    // Base resolution (think retro/portable)
        this.baseHeight = 180;
        this.scaleX = 1;
        this.scaleY = 1;
        this._updateScale();

        // Performance monitoring
        this.stats = {
            drawCalls: 0,
            entityCount: 0,
            particles: 0,
        };

        // Bind the loop
        this._loop = this._loop.bind(this);
    }

    // ── Scene Management ──────────────────────────────────────────────

    /**
     * Register a scene with a name.
     * @param {string} name - Scene identifier
     * @param {Scene} scene - Scene instance
     */
    addScene(name, scene) {
        scene.engine = this;
        this.scenes[name] = scene;
    }

    /**
     * Switch to a registered scene (queued, applied at next update).
     * @param {string} name - Scene name to switch to
     * @param {object} [data] - Optional data to pass to the scene
     */
    switchScene(name, data) {
        if (!this.scenes[name]) {
            console.warn(`Scene "${name}" not found.`);
            return;
        }
        this.nextScene = { name, data };
    }

    /**
     * Apply a pending scene transition.
     */
    _applySceneSwitch() {
        if (!this.nextScene) return;
        if (this.currentScene && this.currentScene.exit) {
            this.currentScene.exit();
        }
        this.currentScene = this.scenes[this.nextScene.name];
        if (this.currentScene.enter) {
            this.currentScene.enter(this.nextScene.data);
        }
        this.nextScene = null;
    }

    // ── Game Loop ─────────────────────────────────────────────────────

    /**
     * Start the game loop.
     */
    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.rafId = requestAnimationFrame(this._loop);
    }

    /**
     * Stop the game loop.
     */
    stop() {
        this.running = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /**
     * Main game loop with fixed timestep.
     */
    _loop(timestamp) {
        if (!this.running) return;

        const frameTime = Math.min((timestamp - this.lastTime) / 1000, 0.25); // Cap at 250ms
        this.lastTime = timestamp;
        this.accumulator += frameTime;

        // FPS tracking
        this.frameCount++;
        this.fpsTimer += frameTime;
        if (this.fpsTimer >= 1.0) {
            this.fps = Math.round(this.frameCount / this.fpsTimer);
            this.frameCount = 0;
            this.fpsTimer = 0;
        }

        // Fixed timestep updates
        while (this.accumulator >= this.fixedTimestep) {
            this._applySceneSwitch();

            if (this.currentScene) {
                this.input.update();
                this.currentScene.update(this.fixedTimestep);
                this.currentScene.lateUpdate?.(this.fixedTimestep);
            }

            this.accumulator -= this.fixedTimestep;
        }

        // Render (interpolation alpha for smooth rendering)
        this._render(this.accumulator / this.fixedTimestep);

        this.rafId = requestAnimationFrame(this._loop);
    }

    /**
     * Render the current frame.
     * @param {number} alpha - Interpolation factor from fixed timestep
     */
    _render(alpha) {
        const ctx = this.ctx;

        // Clear and apply scaling
        ctx.save();
        ctx.setTransform(
            this.scaleX, 0,
            0, this.scaleY,
            0, 0
        );

        // Clear the scaled canvas
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);

        // Render scene
        if (this.currentScene) {
            // Apply camera transform
            ctx.save();
            ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

            this.currentScene.render(ctx, alpha);

            ctx.restore();

            // Render HUD (not affected by camera)
            this.currentScene.renderHUD?.(ctx, alpha);
        }

        // Debug FPS
        if (this.debug) {
            ctx.fillStyle = '#0f0';
            ctx.font = '8px monospace';
            ctx.fillText(`FPS: ${this.fps}`, 4, 10);
            ctx.fillText(`DC: ${this.stats.drawCalls}`, 4, 20);
        }

        ctx.restore();

        // Reset stats each frame
        this.stats.drawCalls = 0;
        this.stats.entityCount = 0;
        this.stats.particles = 0;
    }

    // ── Resolution Scaling ────────────────────────────────────────────

    /**
     * Calculate scale based on canvas vs base resolution.
     */
    _updateScale() {
        this.scaleX = this.canvas.width / this.baseWidth;
        this.scaleY = this.canvas.height / this.baseHeight;
    }

    /**
     * Set base resolution (the logical game resolution).
     * @param {number} w - Base width
     * @param {number} h - Base height
     */
    setBaseResolution(w, h) {
        this.baseWidth = w;
        this.baseHeight = h;
        this._updateScale();
        this.camera.setViewport(w, h);
    }

    /**
     * Resize the canvas (call when window resizes).
     * @param {number} w - New pixel width
     * @param {number} h - New pixel height
     */
    resize(w, h) {
        this.canvas.width = w;
        this.canvas.height = h;
        this._updateScale();
    }

    // ── Input Convenience ─────────────────────────────────────────────

    /** Check if a key is currently held down. */
    keyDown(key) { return this.input.isDown(key); }

    /** Check if a key was just pressed this frame. */
    keyPressed(key) { return this.input.justPressed(key); }

    /** Check if a key was just released this frame. */
    keyReleased(key) { return this.input.justReleased(key); }
}


// ═══════════════════════════════════════════════════════════════════════
//  Input Manager
// ═══════════════════════════════════════════════════════════════════════

export class InputManager {
    constructor() {
        this._keys = {};       // Current state
        this._prevKeys = {};   // Previous frame state

        // Gamepad support
        this.gamepadIndex = -1;
        this.deadZone = 0.25;

        // Bind listeners
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onGamepadConnected = this._onGamepadConnected.bind(this);

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        window.addEventListener('gamepadconnected', this._onGamepadConnected);
        window.addEventListener('gamepaddisconnected', () => {
            this.gamepadIndex = -1;
        });
    }

    /** Call once per fixed timestep to update just-pressed/just-released. */
    update() {
        // Save previous state
        for (const key in this._keys) {
            this._prevKeys[key] = this._keys[key];
        }
        // Poll gamepad if connected
        this._pollGamepad();
    }

    // ── Keyboard ──

    _onKeyDown(e) {
        if (e.repeat) return;
        this._keys[e.code] = true;
    }

    _onKeyUp(e) {
        this._keys[e.code] = false;
    }

    isDown(key) { return !!this._keys[key]; }

    justPressed(key) {
        return this._keys[key] && !this._prevKeys[key];
    }

    justReleased(key) {
        return !this._keys[key] && this._prevKeys[key];
    }

    // ── Gamepad ──

    _onGamepadConnected(e) {
        this.gamepadIndex = e.gamepad.index;
    }

    _pollGamepad() {
        if (this.gamepadIndex < 0) return;
        const gp = navigator.getGamepads?.()[this.gamepadIndex];
        if (!gp) return;

        // Map gamepad buttons to keyboard-style codes
        // D-pad
        this._keys['DPAD_UP']    = gp.buttons[12]?.pressed || false;
        this._keys['DPAD_DOWN']  = gp.buttons[13]?.pressed || false;
        this._keys['DPAD_LEFT']  = gp.buttons[14]?.pressed || false;
        this._keys['DPAD_RIGHT'] = gp.buttons[15]?.pressed || false;

        // Face buttons → action keys
        this._keys['GAMEPAD_A'] = gp.buttons[0]?.pressed || false; // Jump
        this._keys['GAMEPAD_B'] = gp.buttons[1]?.pressed || false; // Action
        this._keys['GAMEPAD_X'] = gp.buttons[2]?.pressed || false; // Shoot
        this._keys['GAMEPAD_Y'] = gp.buttons[3]?.pressed || false; // Switch

        // Start / Select
        this._keys['GAMEPAD_START']  = gp.buttons[9]?.pressed || false;
        this._keys['GAMEPAD_SELECT'] = gp.buttons[8]?.pressed || false;

        // Map left stick to arrow keys (for movement)
        const lx = gp.axes[0] || 0;
        const ly = gp.axes[1] || 0;
        if (lx < -this.deadZone) this._keys['STICK_LEFT']  = true;
        else this._keys['STICK_LEFT'] = false;
        if (lx >  this.deadZone) this._keys['STICK_RIGHT'] = true;
        else this._keys['STICK_RIGHT'] = false;
        if (ly < -this.deadZone) this._keys['STICK_UP']    = true;
        else this._keys['STICK_UP'] = false;
        if (ly >  this.deadZone) this._keys['STICK_DOWN']  = true;
        else this._keys['STICK_DOWN'] = false;
    }

    /** Get left stick X axis (-1 to 1). */
    getStickX() {
        if (this.gamepadIndex < 0) return 0;
        const gp = navigator.getGamepads?.()[this.gamepadIndex];
        if (!gp) return 0;
        const val = gp.axes[0] || 0;
        return Math.abs(val) > this.deadZone ? val : 0;
    }

    /** Get left stick Y axis (-1 to 1). */
    getStickY() {
        if (this.gamepadIndex < 0) return 0;
        const gp = navigator.getGamepads?.()[this.gamepadIndex];
        if (!gp) return 0;
        const val = gp.axes[1] || 0;
        return Math.abs(val) > this.deadZone ? val : 0;
    }

    /**
     * Check if any key or button is pressed.
     * Useful for "press any key to continue" screens.
     */
    anyPressed() {
        for (const key in this._keys) {
            if (this.justPressed(key)) return true;
        }
        return false;
    }
}


// ═══════════════════════════════════════════════════════════════════════
//  Camera
// ═══════════════════════════════════════════════════════════════════════

export class Camera {
    constructor(x = 0, y = 0, viewportW = 320, viewportH = 180) {
        this.x = x;
        this.y = y;
        this.viewportW = viewportW;
        this.viewportH = viewportH;

        // Smooth follow
        this.target = null;
        this.followSpeed = 0.08;  // Lerp factor per frame
        this.offsetX = 0;
        this.offsetY = 0;

        // Bounds (optional — prevent camera from going outside the level)
        this.minX = -Infinity;
        this.maxX = Infinity;
        this.minY = -Infinity;
        this.maxY = Infinity;

        // Shake
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;
    }

    setViewport(w, h) {
        this.viewportW = w;
        this.viewportH = h;
    }

    /**
     * Set bounds for the camera (level dimensions).
     */
    setBounds(minX, minY, maxX, maxY) {
        this.minX = minX;
        this.maxX = maxX - this.viewportW;
        this.minY = minY;
        this.maxY = maxY - this.viewportH;
    }

    /**
     * Follow a target entity (should have x, y, width, height).
     */
    follow(target, speed = 0.08) {
        this.target = target;
        this.followSpeed = speed;
    }

    /**
     * Trigger a screen shake.
     * @param {number} intensity - Pixel offset magnitude
     * @param {number} duration - Duration in seconds
     */
    shake(intensity = 4, duration = 0.3) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    }

    /**
     * Update camera position (smooth follow + shake).
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // Smooth follow
        if (this.target) {
            const targetX = this.target.x + this.target.width / 2 - this.viewportW / 2 + this.offsetX;
            const targetY = this.target.y + this.target.height / 2 - this.viewportH / 2 + this.offsetY;
            this.x += (targetX - this.x) * this.followSpeed * 60 * dt;
            this.y += (targetY - this.y) * this.followSpeed * 60 * dt;
        }

        // Clamp to bounds
        this.x = Math.max(this.minX, Math.min(this.maxX, this.x));
        this.y = Math.max(this.minY, Math.min(this.maxY, this.y));

        // Shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            this._shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this._shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
        } else {
            this._shakeOffsetX = 0;
            this._shakeOffsetY = 0;
        }
    }

    /**
     * Get the final camera position including shake.
     * @returns {{x: number, y: number}}
     */
    getPosition() {
        return {
            x: Math.round(this.x + (this._shakeOffsetX || 0)),
            y: Math.round(this.y + (this._shakeOffsetY || 0)),
        };
    }

    /**
     * Check if a rectangle is visible within the camera viewport.
     * @param {number} x - Entity x position
     * @param {number} y - Entity y position
     * @param {number} w - Entity width
     * @param {number} h - Entity height
     * @returns {boolean}
     */
    isVisible(x, y, w, h) {
        const cam = this.getPosition();
        return (
            x + w > cam.x &&
            x < cam.x + this.viewportW &&
            y + h > cam.y &&
            y < cam.y + this.viewportH
        );
    }
}


// ═══════════════════════════════════════════════════════════════════════
//  Asset Loader
// ═══════════════════════════════════════════════════════════════════════

export class AssetLoader {
    constructor() {
        this.images = {};
        this.sounds = {};
        this.data = {};
        this._loading = false;
        this._queue = [];
    }

    /**
     * Queue an image for loading.
     * @param {string} name - Asset identifier
     * @param {string} url - Path to image file
     */
    addImage(name, url) {
        this._queue.push({ type: 'image', name, url });
    }

    /**
     * Queue a sound for loading.
     * @param {string} name - Asset identifier
     * @param {string} url - Path to audio file
     */
    addSound(name, url) {
        this._queue.push({ type: 'sound', name, url });
    }

    /**
     * Queue a JSON data file for loading.
     * @param {string} name - Asset identifier
     * @param {string} url - Path to JSON file
     */
    addData(name, url) {
        this._queue.push({ type: 'data', name, url });
    }

    /**
     * Load all queued assets.
     * @returns {Promise<void>} Resolves when all assets are loaded
     */
    async loadAll(onProgress) {
        if (this._loading) return;
        this._loading = true;

        const total = this._queue.length;
        let loaded = 0;

        const promises = this._queue.map(async (item) => {
            try {
                switch (item.type) {
                    case 'image':
                        await this._loadImage(item.name, item.url);
                        break;
                    case 'sound':
                        await this._loadSound(item.name, item.url);
                        break;
                    case 'data':
                        await this._loadData(item.name, item.url);
                        break;
                }
            } catch (err) {
                console.warn(`Failed to load asset "${item.name}" (${item.url}):`, err);
            }
            loaded++;
            onProgress?.(loaded / total);
        });

        await Promise.allSettled(promises);
        this._queue = [];
        this._loading = false;
    }

    _loadImage(name, url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images[name] = img;
                resolve(img);
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    _loadSound(name, url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => {
                this.sounds[name] = audio;
                resolve(audio);
            };
            audio.onerror = reject;
            audio.src = url;
        });
    }

    async _loadData(name, url) {
        const response = await fetch(url);
        this.data[name] = await response.json();
    }

    /**
     * Get a loaded image by name.
     */
    getImage(name) {
        return this.images[name] || null;
    }

    /**
     * Get a loaded sound by name.
     */
    getSound(name) {
        return this.sounds[name] || null;
    }

    /**
     * Get loaded data by name.
     */
    getData(name) {
        return this.data[name] || null;
    }
}


// ═══════════════════════════════════════════════════════════════════════
//  Base Scene
// ═══════════════════════════════════════════════════════════════════════

/**
 * Base class for all scenes. Extend this and override the lifecycle methods.
 */
export class Scene {
    constructor() {
        this.engine = null;
        this.entities = [];
        this.paused = false;
    }

    /** Called when switching to this scene. */
    enter(data) {}

    /** Called every fixed timestep. */
    update(dt) {}

    /** Called after update. Good for physics cleanup. */
    lateUpdate(dt) {}

    /** Called every frame for game world rendering. */
    render(ctx, alpha) {}

    /** Called every frame for HUD/UI rendering (not affected by camera). */
    renderHUD(ctx, alpha) {}

    /** Called when switching away from this scene. */
    exit() {}
}
