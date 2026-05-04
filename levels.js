/**
 * levels.js — Level System with 3 Test Levels
 * 
 * Three Zone 1 tutorial-style rooms:
 *   Level 1: "The Great Gearworks" — Intro, gaps, spikes, platforms
 *   Level 2: "Gears & Steam" — Moving platforms, wall jumps, enemies
 *   Level 3: "Crystal Hall" — Vertical ascent, sentry enemies, collectibles
 * 
 * Tile IDs: 0 = empty, 1 = ground/stone, 2 = wall/brick, 3 = platform/brown,
 *           4 = one-way, 5 = spikes, 6 = gear (decorative)
 * 
 * Collision: 1, 2 = solid | 4 = one-way | 5 = hazard
 * Colors: 1=#5a8a5a, 2=#7a7a7a, 3=#8a6a4a, 4=#4a6a8a, 5=#aa4444, 6=#c8a84a
 */

export class LevelManager {
    constructor() {
        this.currentLevel = null;
        this.levelData = null;
        this.solidTiles = new Set([1, 2, 3, 5, 6]);
        this.oneWayTiles = new Set([4]);
        this.hazardTiles = new Set([5]);
        this.colorMap = {
            1: '#5a8a5a',
            2: '#7a7a7a',
            3: '#8a6a4a',
            4: '#4a6a8a',
            5: '#aa4444',
            6: '#c8a84a',
        };
        this.layers = {};
        this.objects = {};
        this.parallax = {};
        this.width = 0;
        this.height = 0;
    }

    loadFromData(data) {
        this.levelData = data;
        this.width = data.width * (data.tileWidth || 16);
        this.height = data.height * (data.tileHeight || 16);
        this.layers = {};
        if (data.layers) {
            for (const [name, layer] of Object.entries(data.layers)) {
                this.layers[name] = layer;
            }
        }
        this.objects = data.objects || {};
        this.parallax = data.parallax || {};
        if (data.colorMap) this.colorMap = data.colorMap;
        return this;
    }

    getCollisionLayer() { return this.layers['foreground'] || this.layers['tiles'] || []; }
    getLayer(name) { return this.layers[name] || []; }
    isSolid(tileId) { return this.solidTiles.has(tileId); }
    isOneWay(tileId) { return this.oneWayTiles.has(tileId); }
    isHazard(tileId) { return this.hazardTiles.has(tileId); }
    getObjects(type) { return this.objects[type] || []; }
    getPlayerSpawn() { return this.objects.player_spawn || { x: 32, y: 32 }; }
    getProperties() { return this.levelData?.properties || {}; }

    static createTemplate(width = 40, height = 20) {
        const empty = () => Array.from({ length: height }, () => Array(width).fill(0));
        return {
            width, height, tileWidth: 16, tileHeight: 16,
            layers: { background: empty(), foreground: empty(), decorative: empty() },
            objects: { player_spawn: { x: 32, y: 32 }, enemies: [], collectibles: [] },
            parallax: { sky: '#1a1a2e' },
            properties: { name: 'Untitled', gravity: 1800 },
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════
//  Level 1: "The Great Gearworks" — Intro (60×20 tiles)
// ═══════════════════════════════════════════════════════════════════════

export function getLevel1() {
    const W = 60, H = 20;
    const fg = Array.from({ length: H }, () => Array(W).fill(0));
    const bg = Array.from({ length: H }, () => Array(W).fill(0));
    const dec = Array.from({ length: H }, () => Array(W).fill(0));

    // ── Ground floor (rows 18-19) ──
    for (let c = 0; c < W; c++) {
        fg[18][c] = 1;
        fg[19][c] = 1;
    }

    // ── Ceiling (row 0) ──
    for (let c = 0; c < W; c++) fg[0][c] = 2;

    // ── Walls at edges ──
    for (let r = 0; r < H; r++) { fg[r][0] = 2; fg[r][W-1] = 2; }

    // ── Section 1: Simple gap at cols 10-12 ──
    // Remove ground at gap
    fg[18][10] = 0; fg[18][11] = 0; fg[18][12] = 0;
    fg[19][10] = 0; fg[19][11] = 0; fg[19][12] = 0;

    // ── Section 2: Elevated platform at col 14-16, row 15 ──
    for (let c = 14; c <= 16; c++) fg[15][c] = 1;
    // Stair up from ground
    fg[16][13] = 1; fg[17][13] = 1;
    fg[16][14] = 0; fg[17][14] = 0;
    // Gap after platform
    fg[15][17] = 0; fg[16][17] = 0; fg[15][18] = 0; fg[16][18] = 0;

    // ── Section 3: Wide platforms at row 13-14, cols 20-28 ──
    for (let c = 20; c <= 28; c++) fg[14][c] = 1;
    // Stairs
    for (let c = 20; c <= 22; c++) { fg[16][c] = 1; fg[17][c] = 1; }

    // ── Section 4: Spike pit at cols 30-32 ──
    // Remove ground top layer at pit
    fg[18][30] = 0; fg[18][31] = 0; fg[18][32] = 0;
    // Spikes at pit bottom (row 19)
    fg[19][30] = 5; fg[19][31] = 5; fg[19][32] = 5;

    // Narrow platforms over pit
    fg[16][30] = 1; fg[16][32] = 1;
    // Middle platform at row 13
    fg[13][31] = 1;

    // ── Section 5: Ascending platforms (cols 35-40) ──
    fg[16][35] = 1; fg[16][36] = 1;
    fg[14][37] = 1; fg[14][38] = 1;
    fg[12][39] = 1; fg[12][40] = 1;
    fg[10][41] = 1; fg[10][42] = 1;

    // ── Section 6: Final landing (cols 44-50) ──
    for (let c = 44; c <= 50; c++) { fg[17][c] = 1; fg[18][c] = 1; }

    // ── Decorative gears ──
    dec[8][5] = 6; dec[8][6] = 6;
    dec[12][22] = 6; dec[12][23] = 6;
    dec[7][42] = 6;

    // ── Background: simple pattern ──
    for (let r = 1; r < H-2; r++) {
        for (let c = 0; c < W; c++) {
            if (r % 4 === 0 && c % 4 === 0) bg[r][c] = 1;
        }
    }

    // ── Objects ──
    const objects = {
        player_spawn: { x: 40, y: 16 * 17 },
        enemies: [
            { type: 'walker', x: 160, y: 16 * 17 },
            { type: 'walker', x: 360, y: 16 * 13 },
            { type: 'chaser', x: 660, y: 16 * 16 },
        ],
        collectibles: [
            { type: 'coin', x: 100, y: 16 * 15 },
            { type: 'coin', x: 160, y: 16 * 13 },
            { type: 'coin', x: 200, y: 16 * 14 },
            { type: 'coin', x: 216, y: 16 * 14 },
            { type: 'coin', x: 232, y: 16 * 14 },
            { type: 'gem', x: 400, y: 16 * 11 },
            { type: 'coin', x: 580, y: 16 * 11 },
            { type: 'coin', x: 596, y: 16 * 11 },
            { type: 'heart', x: 720, y: 16 * 16 },
            { type: 'gem', x: 768, y: 16 * 15 },
        ],
        exit: { x: 795, y: 16 * 16 },
    };

    return {
        width: W, height: H, tileWidth: 16, tileHeight: 16,
        layers: { foreground: fg, background: bg, decorative: dec },
        objects,
        parallax: { sky: '#1a1a2e', mountains: { color: '#2d2d5e', speed: 0.2 }, trees: { color: '#1e4a2e', speed: 0.5 } },
        properties: { name: 'The Great Gearworks', gravity: 1800 },
        colorMap: { 1: '#5a8a5a', 2: '#7a7a7a', 3: '#8a6a4a', 4: '#4a6a8a', 5: '#cc3333', 6: '#c8a84a' },
    };
}

// ═══════════════════════════════════════════════════════════════════════
//  Level 2: "Gears & Steam" — Vertical + Wall Jumps + Enemies (60×25)
// ═══════════════════════════════════════════════════════════════════════

export function getLevel2() {
    const W = 60, H = 25;
    const fg = Array.from({ length: H }, () => Array(W).fill(0));
    const bg = Array.from({ length: H }, () => Array(W).fill(0));
    const dec = Array.from({ length: H }, () => Array(W).fill(0));

    // ── Ground ──
    for (let c = 0; c < W; c++) { fg[23][c] = 1; fg[24][c] = 1; }
    // Ceiling
    for (let c = 0; c < W; c++) fg[0][c] = 2;
    // Walls
    for (let r = 0; r < H; r++) { fg[r][0] = 2; fg[r][W-1] = 2; }

    // ── Section 1: Narrow shaft (wall jump practice) cols 2-10 ──
    // Left wall from ground to row 10
    fg[10][5] = 2; fg[10][6] = 2;
    // Thin platforms inside shaft
    for (let c = 3; c <= 7; c++) fg[21][c] = 1;
    for (let c = 3; c <= 7; c++) fg[19][c] = 1;
    for (let c = 3; c <= 7; c++) fg[17][c] = 1;
    for (let c = 3; c <= 7; c++) fg[15][c] = 1;
    for (let c = 3; c <= 7; c++) fg[13][c] = 1;
    for (let c = 3; c <= 7; c++) fg[11][c] = 1;

    // ── Section 2: Wall corridor (cols 12-16) ──
    // Two walls with small gap — practice wall jump
    for (let r = 11; r < 22; r++) { fg[r][12] = 2; fg[r][16] = 2; }

    // Ground inside corridor
    for (let c = 13; c <= 15; c++) fg[22][c] = 1;

    // Wall jump exit path — staggered platforms up
    fg[20][14] = 1; // middle at row 20
    fg[18][13] = 1; fg[18][15] = 1; // sides at row 18
    fg[16][14] = 1; // middle at row 16
    fg[14][13] = 1; fg[14][15] = 1; // sides at row 14
    fg[12][14] = 1; // top

    // ── Section 3: Spikes + platforms (cols 18-28) ──
    // Spike pit
    fg[23][20] = 5; fg[23][21] = 5; fg[23][22] = 5;
    fg[24][20] = 0; fg[24][21] = 0; fg[24][22] = 0;

    // Platforms over spikes
    fg[21][20] = 1; fg[21][21] = 1; fg[21][22] = 1;
    fg[19][18] = 1; fg[19][19] = 1;
    fg[19][23] = 1; fg[19][24] = 1;
    fg[17][20] = 1; fg[17][21] = 1;

    // ── Section 4: Wide open + enemies (cols 25-40) ──
    for (let c = 25; c <= 40; c++) fg[17][c] = 1;

    // Floating platforms above
    for (let c = 27; c <= 30; c++) fg[14][c] = 1;
    for (let c = 33; c <= 36; c++) fg[12][c] = 1;
    for (let c = 37; c <= 40; c++) fg[15][c] = 1;

    // One-way platforms
    for (let c = 30; c <= 32; c++) fg[10][c] = 4;
    for (let c = 34; c <= 38; c++) fg[8][c] = 4;

    // ── Section 5: Exit path (cols 42-56) ──
    for (let c = 42; c <= 48; c++) fg[20][c] = 1;
    // Gaps on exits
    fg[20][44] = 0; fg[19][44] = 1; // Step down
    fg[20][47] = 0; fg[18][47] = 1; // Step up

    // Final ground
    for (let c = 50; c <= 56; c++) fg[21][c] = 1;

    // ── Decorative ──
    dec[5][15] = 6; dec[5][16] = 6; dec[5][40] = 6;
    dec[6][30] = 6;

    // Background pattern
    for (let r = 2; r < H-2; r += 4) {
        for (let c = 0; c < W; c += 5) bg[r][c] = 1;
    }

    // ── Objects ──
    const objects = {
        player_spawn: { x: 48, y: 16 * 22 },
        enemies: [
            { type: 'walker', x: 400, y: 16 * 16 },
            { type: 'chaser', x: 500, y: 16 * 16 },
            { type: 'walker', x: 750, y: 16 * 20 },
        ],
        collectibles: [
            { type: 'coin', x: 60, y: 16 * 20 },
            { type: 'coin', x: 80, y: 16 * 18 },
            { type: 'coin', x: 100, y: 16 * 16 },
            { type: 'coin', x: 120, y: 16 * 14 },
            { type: 'gem', x: 228, y: 16 * 14 },
            { type: 'coin', x: 340, y: 16 * 13 },
            { type: 'coin', x: 356, y: 16 * 13 },
            { type: 'coin', x: 450, y: 16 * 11 },
            { type: 'gem', x: 540, y: 16 * 11 },
            { type: 'heart', x: 600, y: 16 * 14 },
        ],
        exit: { x: 830, y: 16 * 20 },
    };

    return {
        width: W, height: H, tileWidth: 16, tileHeight: 16,
        layers: { foreground: fg, background: bg, decorative: dec },
        objects,
        parallax: { sky: '#1a152e', mountains: { color: '#2d2d5e', speed: 0.2 }, trees: { color: '#4a2a1e', speed: 0.5 } },
        properties: { name: 'Gears & Steam', gravity: 1800 },
        colorMap: { 1: '#6a6a5a', 2: '#6a5a6a', 3: '#8a6a4a', 4: '#4a6a8a', 5: '#cc3333', 6: '#c8a84a' },
    };
}

// ═══════════════════════════════════════════════════════════════════════
//  Level 3: "Crystal Hall" — Vertical Ascent + Ranged Enemies (60×30)
// ═══════════════════════════════════════════════════════════════════════

export function getLevel3() {
    const W = 60, H = 30;
    const fg = Array.from({ length: H }, () => Array(W).fill(0));
    const bg = Array.from({ length: H }, () => Array(W).fill(0));
    const dec = Array.from({ length: H }, () => Array(W).fill(0));

    // ── Ground ──
    for (let c = 0; c < W; c++) { fg[28][c] = 1; fg[29][c] = 1; }
    // Ceiling
    for (let c = 0; c < W; c++) fg[0][c] = 2;
    // Walls
    for (let r = 0; r < H; r++) { fg[r][0] = 2; fg[r][W-1] = 2; }

    // ── Section 1: Intro platforms (cols 2-12) ──
    for (let c = 2; c <= 12; c++) fg[23][c] = 1;
    for (let c = 5; c <= 9; c++) fg[20][c] = 1;
    for (let c = 3; c <= 7; c++) fg[17][c] = 1;
    for (let c = 5; c <= 8; c++) fg[14][c] = 1;
    for (let c = 3; c <= 6; c++) fg[11][c] = 1;

    // ── Section 2: Narrow corridors with sentries (cols 14-24) ──
    // Walls forming a corridor
    for (let r = 12; r < 22; r++) { fg[r][14] = 2; fg[r][18] = 2; }
    for (let r = 8; r < 18; r++) { fg[r][20] = 2; fg[r][24] = 2; }

    // Floor inside corridors
    for (let c = 15; c <= 17; c++) fg[22][c] = 1;
    for (let c = 21; c <= 23; c++) fg[20][c] = 1;

    // Platforms inside
    fg[18][16] = 1; fg[15][16] = 1; fg[13][16] = 1;
    fg[16][22] = 1; fg[13][22] = 1; fg[11][22] = 1;

    // ── Section 3: Vertical shaft (cols 26-30) ──
    for (let r = 6; r < 24; r++) { fg[r][26] = 2; fg[r][30] = 2; }
    // Ascending platforms inside shaft
    fg[24][27] = 1; fg[24][28] = 1; fg[24][29] = 1;
    fg[22][27] = 1; fg[22][29] = 1;
    fg[20][28] = 1;
    fg[18][27] = 1; fg[18][29] = 1;
    fg[16][28] = 1;
    fg[14][27] = 1; fg[14][29] = 1;
    fg[12][28] = 1;
    fg[10][27] = 1; fg[10][29] = 1;
    fg[8][28] = 1;

    // ── Section 4: Crystal platforms (cols 32-44) ──
    for (let c = 31; c <= 44; c++) fg[24][c] = 1;
    for (let c = 32; c <= 36; c++) fg[21][c] = 1;
    for (let c = 38; c <= 42; c++) fg[18][c] = 1;
    for (let c = 34; c <= 38; c++) fg[15][c] = 1;
    for (let c = 40; c <= 44; c++) fg[12][c] = 1;

    // One-way platforms
    for (let c = 35; c <= 39; c++) fg[9][c] = 4;

    // ── Section 5: Gauntlet to exit (cols 46-56) ──
    // Ground level path with gaps
    for (let c = 46; c <= 48; c++) fg[25][c] = 1;
    fg[25][49] = 0; fg[25][50] = 0; // gap with spikes
    fg[28][49] = 5; fg[28][50] = 5;
    fg[25][51] = 1; fg[25][52] = 1;
    fg[25][53] = 0; fg[22][53] = 1; // step up
    fg[25][54] = 1;
    // Final area
    fg[24][55] = 1; fg[24][56] = 1; fg[25][55] = 0;

    // ── One-way at top ──
    for (let c = 49; c <= 52; c++) fg[7][c] = 4;

    // ── Decorative crystals ──
    dec[10][35] = 6; dec[10][36] = 6;
    dec[7][40] = 6; dec[7][41] = 6;
    dec[5][50] = 6;

    // Background
    for (let r = 2; r < H-2; r += 3) {
        for (let c = 0; c < W; c += 4) bg[r][c] = 1;
    }

    // ── Objects ──
    const objects = {
        player_spawn: { x: 40, y: 16 * 27 },
        enemies: [
            { type: 'shooter', x: 256, y: 16 * 14 },
            { type: 'chaser', x: 350, y: 16 * 23 },
            { type: 'walker', x: 500, y: 16 * 17 },
            { type: 'walker', x: 650, y: 16 * 20 },
            { type: 'shooter', x: 700, y: 16 * 14 },
            { type: 'chaser', x: 840, y: 16 * 23 },
        ],
        collectibles: [
            { type: 'coin', x: 80, y: 16 * 22 },
            { type: 'coin', x: 120, y: 16 * 19 },
            { type: 'coin', x: 160, y: 16 * 16 },
            { type: 'gem', x: 244, y: 16 * 13 },
            { type: 'coin', x: 340, y: 16 * 19 },
            { type: 'coin', x: 356, y: 16 * 19 },
            { type: 'shard', x: 450, y: 16 * 13 },
            { type: 'shard', x: 500, y: 16 * 17 },
            { type: 'shard', x: 600, y: 16 * 14 },
            { type: 'gem', x: 660, y: 16 * 14 },
            { type: 'heart', x: 760, y: 16 * 14 },
            { type: 'gem', x: 840, y: 16 * 20 },
        ],
        exit: { x: 880, y: 16 * 22 },
    };

    return {
        width: W, height: H, tileWidth: 16, tileHeight: 16,
        layers: { foreground: fg, background: bg, decorative: dec },
        objects,
        parallax: { sky: '#1a0a2e', mountains: { color: '#2d1d5e', speed: 0.2 }, trees: { color: '#1e2a4e', speed: 0.5 } },
        properties: { name: 'Crystal Hall', gravity: 1800 },
        colorMap: { 1: '#5a6a7a', 2: '#6a5a7a', 3: '#7a6a5a', 4: '#4a6a8a', 5: '#cc3333', 6: '#aaccff' },
    };
}

// ═══════════════════════════════════════════════════════════════════════
//  Level Index
// ═══════════════════════════════════════════════════════════════════════

export const LEVELS = [getLevel1, getLevel2, getLevel3];
export const LEVEL_NAMES = ['The Great Gearworks', 'Gears & Steam', 'Crystal Hall'];

// ═══════════════════════════════════════════════════════════════════════
export class GameState {
    constructor(data = {}) {
        this.score = data.score ?? 0;
        this.lives = data.lives ?? 3;
        this.levelIndex = data.levelIndex ?? 0;
        this.totalDeaths = data.totalDeaths ?? 0;
        this.deathTimer = 0;
        this.collectiblesCollected = data.collectiblesCollected ?? [];
    }

    addScore(points) {
        this.score += points;
    }

    loseLife() {
        if (this.lives > 0) this.lives--;
    }

    isGameOver() {
        return this.lives <= 0;
    }

    toJSON() {
        return {
            score: this.score,
            lives: this.lives,
            levelIndex: this.levelIndex,
            totalDeaths: this.totalDeaths,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════
//  LevelManager extensions for test support
// ═══════════════════════════════════════════════════════════════════════

/**
 * Load multiple levels from an array of factory functions.
 * @param {Function[]} levelFactories - Array of level-builder functions
 */
LevelManager.prototype.loadLevels = function loadLevels(levelFactories) {
    this._levelFactories = levelFactories;
    this.levels = levelFactories.map((fn, i) => {
        const data = fn();
        return {
            data,
            name: data.properties?.name || `Level ${i + 1}`,
            width: data.width,
            height: data.height,
        };
    });
};

/**
 * Switch to a level by index, loading its data into the manager.
 * @param {number} index - Level index
 */
LevelManager.prototype.switchLevel = function switchLevel(index) {
    if (!this._levelFactories || index < 0 || index >= this._levelFactories.length) {
        console.warn(`Level index ${index} out of range`);
        return;
    }
    this.loadFromData(this._levelFactories[index]());
    this.currentLevel = index;
};

/**
 * Get tile ID at a specific column and row in a given layer.
 * @param {number} col - Tile column
 * @param {number} row - Tile row
 * @param {string} [layerName='foreground'] - Layer to query
 * @returns {number} Tile ID (0 for empty/out of bounds)
 */
LevelManager.prototype.getTileAt = function getTileAt(col, row, layerName = 'foreground') {
    const layer = this.layers[layerName];
    if (!layer) return 0;
    if (row < 0 || row >= layer.length) return 0;
    if (col < 0 || col >= layer[0].length) return 0;
    return layer[row][col] || 0;
};

/**
 * Get the collision layer for the current level.
 * @returns {number[][]} 2D array of tile IDs (fg layer)
 */
LevelManager.prototype.getCollisionLayer = function getCollisionLayer() {
    return this.layers.foreground || [];
};

/**
 * Check if a tile ID is solid.
 * @param {number} id - Tile ID
 * @returns {boolean}
 */
LevelManager.prototype.isSolid = function isSolid(id) {
    return this.solidTiles.has(id);
};

/**
 * Check if a tile ID is a one-way platform.
 * @param {number} id - Tile ID
 * @returns {boolean}
 */
LevelManager.prototype.isOneWay = function isOneWay(id) {
    return this.oneWayTiles.has(id);
};

/**
 * Get a list of all solid tile IDs (deduplicated).
 * @returns {number[]}
 */
LevelManager.prototype.getSolidTileIds = function getSolidTileIds() {
    return [...this.solidTiles];
};
