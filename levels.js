/**
 * levels.js — Level System
 * 
 * Handles tilemap loading, level data format, object placement,
 * and background layer management.
 * 
 * Level Format (JSON):
 * {
 *   "width": 40,           // Tiles wide
 *   "height": 20,          // Tiles tall
 *   "tileWidth": 16,       // Pixels per tile
 *   "tileHeight": 16,
 *   "layers": {
 *     "background": [[...]],   // 2D array [row][col] of tile IDs
 *     "foreground": [[...]],   // Main collision layer
 *     "decorative": [[...]]    // Non-colliding detail layer
 *   },
 *   "objects": {
 *     "player_spawn": { "x": 32, "y": 240 },
 *     "enemies": [
 *       { "type": "walker", "x": 160, "y": 256 },
 *       { "type": "jumper", "x": 320, "y": 128 }
 *     ],
 *     "collectibles": [
 *       { "type": "coin", "x": 96, "y": 192 },
 *       { "type": "gem", "x": 256, "y": 144 }
 *     ]
 *   },
 *   "parallax": {
 *     "sky": "#1a1a2e",
 *     "mountains": { "color": "#2d2d5e", "speed": 0.2 },
 *     "trees": { "color": "#1e4a2e", "speed": 0.5 }
 *   },
 *   "bounds": {
 *     "width": 640,
 *     "height": 320
 *   },
 *   "properties": {
 *     "music": "level1",
 *     "ambient": "forest",
 *     "gravity": 1800
 *   }
 * }
 * 
 * Compressed Encoding (optional):
 *   Tiles can be stored as RLE strings for smaller files.
 *   Pattern: "5,1:10,2:5,0" = five 1s, ten 2s, five 0s
 */

// ═══════════════════════════════════════════════════════════════════════
//  Level Manager
// ═══════════════════════════════════════════════════════════════════════

export class LevelManager {
    constructor() {
        this.currentLevel = null;
        this.levelData = null;

        // Tile collision mappings
        this.solidTiles = new Set();
        this.oneWayTiles = new Set();
        this.hazardTiles = new Set();

        // Default tile colors (for no-tileset rendering)
        this.colorMap = {};

        // Loaded tile images / tilesets
        this.tilesets = {};

        // Parsed layers (expanded from compressed format)
        this.layers = {};

        // Object instances (populated by scene on load)
        this.objects = {};

        // Level dimensions in pixels
        this.width = 0;
        this.height = 0;
    }

    /**
     * Define which tile IDs are solid, one-way, or hazards.
     * 
     * @param {number[]} solid - Array of tile IDs that block movement
     * @param {number[]} [oneWay] - Array of tile IDs for one-way platforms
     * @param {number[]} [hazards] - Array of tile IDs that damage the player
     */
    defineTileTypes(solid, oneWay = [], hazards = []) {
        this.solidTiles = new Set(solid);
        this.oneWayTiles = new Set(oneWay);
        this.hazardTiles = new Set(hazards);
    }

    /**
     * Set a color map for rendering tiles without a tileset image.
     * @param {object} map - e.g. { 1: '#4a4', 2: '#666', 3: '#a44' }
     */
    setColorMap(map) {
        this.colorMap = map;
    }

    /**
     * Load a level from a JSON object.
     * 
     * @param {object} data - Level data object
     */
    loadFromData(data) {
        this.levelData = data;
        this.width = data.width * data.tileWidth;
        this.height = data.height * data.tileHeight;

        // Decompress layers
        this.layers = {};
        if (data.layers) {
            for (const [name, layer] of Object.entries(data.layers)) {
                if (typeof layer[0] === 'string') {
                    // RLE-compressed layer
                    this.layers[name] = this._decompressLayer(layer, data.width, data.height);
                } else {
                    this.layers[name] = layer;
                }
            }
        }

        // Store object placements
        this.objects = data.objects || {};
        this.parallax = data.parallax || {};

        return this;
    }

    /**
     * Load a level from a URL (JSON file).
     * 
     * @param {string} url - Path to level JSON file
     * @returns {Promise<object>} Loaded level data
     */
    async loadFromURL(url) {
        const response = await fetch(url);
        const data = await response.json();
        return this.loadFromData(data);
    }

    /**
     * Get the collision layer (typically 'foreground').
     */
    getCollisionLayer() {
        return this.layers['foreground'] || this.layers['tiles'] || [];
    }

    /**
     * Get a specific layer.
     */
    getLayer(name) {
        return this.layers[name] || [];
    }

    /**
     * Check if a tile ID is solid.
     */
    isSolid(tileId) {
        return this.solidTiles.has(tileId);
    }

    /**
     * Check if a tile ID is a one-way platform.
     */
    isOneWay(tileId) {
        return this.oneWayTiles.has(tileId);
    }

    /**
     * Check if a tile ID is a hazard.
     */
    isHazard(tileId) {
        return this.hazardTiles.has(tileId);
    }

    /**
     * Get all object placements of a given type.
     */
    getObjects(type) {
        return this.objects[type] || [];
    }

    /**
     * Get the player spawn position.
     */
    getPlayerSpawn() {
        const spawn = this.objects.player_spawn;
        if (!spawn) return { x: 32, y: 32 };
        return spawn;
    }

    /**
     * Get level properties.
     */
    getProperties() {
        return this.levelData?.properties || {};
    }

    // ── Compression / Decompression ──

    /**
     * RLE-decompress a layer.
     * Input: array of strings like "5,1:10,2:5,0"
     * Each string is a row. "5,1" = 5 tiles of ID 1.
     * 
     * @param {string[]} compressed - Array of RLE row strings
     * @param {number} w - Expected width in tiles
     * @param {number} h - Expected height in tiles
     * @returns {number[][]} 2D array [row][col]
     */
    _decompressLayer(compressed, w, h) {
        const result = [];
        for (let row = 0; row < h; row++) {
            const rowData = [];
            const rleStr = compressed[row] || '';
            if (!rleStr) {
                // Fill with zeros if row is missing
                for (let c = 0; c < w; c++) rowData.push(0);
            } else {
                const segments = rleStr.split(':');
                for (const seg of segments) {
                    const [count, tileId] = seg.split(',').map(Number);
                    for (let i = 0; i < count; i++) {
                        rowData.push(tileId);
                    }
                }
                // Pad if under width
                while (rowData.length < w) rowData.push(0);
            }
            result.push(rowData);
        }
        return result;
    }

    /**
     * Compress a tile layer to RLE format.
     * Inverse of _decompressLayer.
     * 
     * @param {number[][]} layer - 2D array
     * @returns {string[]} RLE strings per row
     */
    compressLayer(layer) {
        return layer.map(row => {
            const parts = [];
            let count = 1;
            let current = row[0];
            for (let i = 1; i < row.length; i++) {
                if (row[i] === current) {
                    count++;
                } else {
                    parts.push(`${count},${current}`);
                    count = 1;
                    current = row[i];
                }
            }
            parts.push(`${count},${current}`);
            return parts.join(':');
        });
    }

    /**
     * Utility: create an empty level template.
     */
    static createTemplate(width = 40, height = 20) {
        const emptyLayer = Array.from({ length: height }, () => Array(width).fill(0));

        return {
            width,
            height,
            tileWidth: 16,
            tileHeight: 16,
            layers: {
                background: emptyLayer.map(r => [...r]),
                foreground: emptyLayer.map(r => [...r]),
                decorative: emptyLayer.map(r => [...r]),
            },
            objects: {
                player_spawn: { x: 32, y: Math.floor(height / 2) * 16 - 16 },
                enemies: [],
                collectibles: [],
            },
            parallax: {
                sky: '#1a1a2e',
            },
            properties: {
                name: 'Untitled Level',
                gravity: 1800,
            },
        };
    }
}


// ═══════════════════════════════════════════════════════════════════════
//  Example Level Data (inline for testing)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Returns a simple test level with basic platform layout.
 * Tile IDs: 1=ground, 2=wall, 3=platform, 4=one-way
 */
export function getTestLevel() {
    const level = LevelManager.createTemplate(40, 20);

    // Ground floor (row 18, 19)
    const groundRow = 18;
    const groundRow2 = 19;
    for (let c = 0; c < 40; c++) {
        level.layers.foreground[groundRow][c] = 1;
        level.layers.foreground[groundRow2][c] = 1;
    }

    // Floating platforms
    // Platform at row 14, cols 5-10
    for (let c = 5; c <= 10; c++) {
        level.layers.foreground[14][c] = 1;
    }

    // Platform at row 10, cols 15-18
    for (let c = 15; c <= 18; c++) {
        level.layers.foreground[10][c] = 1;
    }

    // Staircase (row 16-17, cols 20-24)
    level.layers.foreground[16][20] = 1;
    level.layers.foreground[16][21] = 1;
    level.layers.foreground[15][22] = 1;
    level.layers.foreground[15][23] = 1;
    level.layers.foreground[14][24] = 1;

    // One-way platforms (row 7, cols 25-30)
    for (let c = 25; c <= 30; c++) {
        level.layers.foreground[7][c] = 4; // one-way marker
    }

    // Walls on left and right edges
    for (let r = 0; r < 20; r++) {
        level.layers.foreground[r][0] = 2;
        level.layers.foreground[r][39] = 2;
    }

    // Ceiling
    for (let c = 0; c < 40; c++) {
        level.layers.foreground[0][c] = 2;
    }

    // Object placements
    level.objects.player_spawn = { x: 48, y: 16 * 17 - 16 };
    level.objects.enemies = [
        { type: 'walker', x: 200, y: 16 * 17 },
        { type: 'walker', x: 400, y: 16 * 17 },
    ];
    level.objects.collectibles = [
        { type: 'coin', x: 120, y: 16 * 14 - 16 },
        { type: 'coin', x: 136, y: 16 * 14 - 16 },
        { type: 'coin', x: 152, y: 16 * 14 - 16 },
        { type: 'gem', x: 280, y: 16 * 10 - 16 },
        { type: 'heart', x: 360, y: 16 * 17 },
    ];

    // Parallax
    level.parallax = {
        sky: '#1a1a2e',
        mountains: { color: '#2d2d5e', speed: 0.2 },
        trees: { color: '#1e4a2e', speed: 0.5 },
    };

    level.properties = {
        name: 'Test Level',
        gravity: 1800,
    };

    return level;
}
