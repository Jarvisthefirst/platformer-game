/**
 * test-helper.js — Browser API mocks for Node.js tests
 * 
 * Provides minimal mocks for Canvas API, AudioContext, localStorage,
 * and other browser globals so game modules can be imported in Node.
 */

// ── Minimal Canvas mock ──
class MockCanvasRenderingContext2D {
    constructor() {
        this.fillStyle = '#000';
        this.strokeStyle = '#000';
        this.font = '';
        this.textAlign = 'start';
        this.textBaseline = 'alphabetic';
        this.lineWidth = 1;
        this.globalAlpha = 1;
        this.globalCompositeOperation = 'source-over';
        this._calls = [];
    }
    save() { this._calls.push('save'); }
    restore() { this._calls.push('restore'); }
    fillRect(x, y, w, h) { this._calls.push(`fillRect(${x},${y},${w},${h})`); }
    strokeRect(x, y, w, h) { this._calls.push(`strokeRect(${x},${y},${w},${h})`); }
    clearRect(x, y, w, h) { this._calls.push(`clearRect(${x},${y},${w},${h})`); }
    fillText(t, x, y) { this._calls.push(`fillText(${t},${x},${y})`); }
    beginPath() { this._calls.push('beginPath'); }
    closePath() { this._calls.push('closePath'); }
    moveTo(x, y) { this._calls.push(`moveTo(${x},${y})`); }
    lineTo(x, y) { this._calls.push(`lineTo(${x},${y})`); }
    arc(x, y, r, sa, ea) { this._calls.push(`arc(${x},${y},${r})`); }
    bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey) { this._calls.push(`bezierCurveTo`); }
    stroke() { this._calls.push('stroke'); }
    fill() { this._calls.push('fill'); }
    drawImage(...args) { this._calls.push(`drawImage(${args.length} args)`); }
    translate(x, y) { this._calls.push(`translate(${x},${y})`); }
    scale(x, y) { this._calls.push(`scale(${x},${y})`); }
    rotate(a) { this._calls.push(`rotate(${a})`); }
    setTransform(a, b, c, d, e, f) { this._calls.push(`setTransform`); }
    createLinearGradient(x1, y1, x2, y2) {
        return { addColorStop: () => {} };
    }
    createRadialGradient(x1, y1, r1, x2, y2, r2) {
        return { addColorStop: () => {} };
    }
    measureText(text) {
        return { width: text.length * 6 };
    }
}

class MockCanvas {
    constructor(width = 320, height = 180) {
        this.width = width;
        this.height = height;
        this.style = {};
    }
    getContext(type) {
        if (!this._ctx) this._ctx = new MockCanvasRenderingContext2D();
        return this._ctx;
    }
}

// ── Mock HTMLImageElement ──
globalThis.Image = class {
    constructor() { this._listeners = {}; }
    get onload() { return this._onload; }
    set onload(fn) { this._onload = fn; if (fn) setTimeout(fn, 0); }
    get onerror() { return this._onerror; }
    set onerror(fn) { this._onerror = fn; }
    set src(url) { /* no-op */ }
    get complete() { return true; }
    addEventListener(e, fn) { this._listeners[e] = this._listeners[e] || []; this._listeners[e].push(fn); }
};

// ── Mock Audio element ──
globalThis.Audio = class {
    constructor() { this._listeners = {}; }
    get oncanplaythrough() { return this._oncanplaythrough; }
    set oncanplaythrough(fn) { this._oncanplaythrough = fn; if (fn) setTimeout(fn, 0); }
    set src(url) { /* no-op */ }
    addEventListener(e, fn) { this._listeners[e] = this._listeners[e] || []; this._listeners[e].push(fn); }
    play() { return Promise.resolve(); }
    pause() {}
};

// ── Mock AudioContext ──
let audioContextIdCounter = 0;

class MockAudioDestinationNode {
    constructor() { this._nodes = []; }
}

class MockAudioNode {
    constructor() {
        this.id = ++audioContextIdCounter;
        this._connections = [];
    }
    connect(node) { this._connections.push(node); return node; }
    disconnect() { this._connections = []; }
}

class MockOscillatorNode extends MockAudioNode {
    constructor(ctx) {
        super();
        this.type = 'sine';
        this.frequency = { value: 440, setValueAtTime: (v, t) => {}, exponentialRampToValueAtTime: (v, t) => {} };
        this._startTime = null;
        this._stopTime = null;
    }
    start(t) { this._startTime = t; }
    stop(t) { this._stopTime = t; }
}

class MockGainNode extends MockAudioNode {
    constructor(ctx) {
        super();
        this.gain = { value: 1, setValueAtTime: (v, t) => {}, exponentialRampToValueAtTime: (v, t) => {} };
    }
}

class MockAudioContext {
    constructor() {
        this.state = 'running';
        this.destination = new MockAudioDestinationNode();
        this.currentTime = 0;
    }
    createOscillator() { return new MockOscillatorNode(this); }
    createGain() { return new MockGainNode(this); }
    createBufferSource() { return new MockAudioNode(this); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
}

globalThis.AudioContext = MockAudioContext;
globalThis.webkitAudioContext = MockAudioContext;
globalThis.window = globalThis;

// ── Mock Keyboard events dispatching ──
const _keyListeners = { down: [], up: [] };
globalThis.addEventListener = function(type, fn) {
    if (type === 'keydown') _keyListeners.down.push(fn);
    else if (type === 'keyup') _keyListeners.up.push(fn);
    else if (type === 'gamepadconnected' || type === 'gamepaddisconnected') {
        // no-op in tests
    }
};

// Export a helper for simulating key events
export function simulateKeyDown(code) {
    const e = { code, repeat: false, preventDefault: () => {} };
    for (const fn of _keyListeners.down) fn(e);
}

export function simulateKeyUp(code) {
    const e = { code, repeat: false, preventDefault: () => {} };
    for (const fn of _keyListeners.up) fn(e);
}

// ── Mock requestAnimationFrame / cancelAnimationFrame ──
let rafId = 0;
const rafCallbacks = new Map();

globalThis.requestAnimationFrame = function(cb) {
    const id = ++rafId;
    rafCallbacks.set(id, cb);
    return id;
};

globalThis.cancelAnimationFrame = function(id) {
    rafCallbacks.delete(id);
};

export function tickAnimationFrame(timestamp = 0) {
    const currentIds = [...rafCallbacks.keys()];
    for (const id of currentIds) {
        const cb = rafCallbacks.get(id);
        if (cb) {
            rafCallbacks.delete(id);
            cb(timestamp);
        }
    }
}

export function clearAnimationFrames() {
    rafCallbacks.clear();
    rafId = 0;
}

// ── Mock performance.now ──
let _perfTime = 0;
globalThis.performance = globalThis.performance || {};
globalThis.performance.now = () => _perfTime;
export function advancePerfTime(ms) {
    _perfTime += ms;
}

// ── Mock localStorage ──
const _storage = new Map();
globalThis.localStorage = {
    getItem: (key) => _storage.get(key) ?? null,
    setItem: (key, val) => _storage.set(key, String(val)),
    removeItem: (key) => _storage.delete(key),
    clear: () => _storage.clear(),
    get length() { return _storage.size; },
    key: (i) => [..._storage.keys()][i] ?? null,
};

export function clearLocalStorage() {
    _storage.clear();
}

// ── Mock navigator.getGamepads ──
delete globalThis.navigator;
globalThis.navigator = { userAgent: 'node', language: 'en', platform: 'node', getGamepads: () => [null] };

// ── Mock fetch for testing ──
globalThis.fetch = async (url) => {
    throw new Error(`fetch not mocked: ${url}`);
};

// ── Create a test canvas instance ──
export function createTestCanvas(w = 320, h = 180) {
    return new MockCanvas(w, h);
}

// ── Test assertion helpers ──
export function assert(condition, message) {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function assertEqual(actual, expected, label) {
    if (actual !== expected) {
        throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

export function deepEqual(actual, expected, label) {
    if (typeof actual !== typeof expected) {
        throw new Error(`${label}: type mismatch (${typeof actual} vs ${typeof expected})`);
    }
    if (actual === null || expected === null) {
        if (actual !== expected) throw new Error(`${label}: null mismatch`);
        return;
    }
    if (Array.isArray(actual) && Array.isArray(expected)) {
        if (actual.length !== expected.length) {
            throw new Error(`${label}: array length ${actual.length} !== ${expected.length}`);
        }
        for (let i = 0; i < actual.length; i++) {
            try {
                deepEqual(actual[i], expected[i], `${label}[${i}]`);
            } catch (e) {
                throw new Error(`${label}: array mismatch at [${i}]: got ${JSON.stringify(actual[i])}, expected ${JSON.stringify(expected[i])}`);
            }
        }
        return;
    }
    if (typeof actual === 'object') {
        const aKeys = Object.keys(actual).sort();
        const eKeys = Object.keys(expected).sort();
        if (JSON.stringify(aKeys) !== JSON.stringify(eKeys)) {
            throw new Error(`${label}: key mismatch (${aKeys} vs ${eKeys})`);
        }
        for (const k of aKeys) {
            try {
                deepEqual(actual[k], expected[k], `${label}.${k}`);
            } catch (e) {
                throw new Error(`${label}: key "${k}" mismatch: got ${JSON.stringify(actual[k])}, expected ${JSON.stringify(expected[k])}`);
            }
        }
        return;
    }
    if (actual !== expected) {
        throw new Error(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
    }
}

export function assertClose(actual, expected, tolerance = 0.01, label = '') {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${label}: expected ${expected} ± ${tolerance}, got ${actual}`);
    }
}

export function assertDeepEqual(actual, expected, label) {
    if (!_isDeepEqual(actual, expected)) {
        throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

export function _isDeepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!_isDeepEqual(a[i], b[i])) return false;
        }
        return true;
    }
    if (typeof a === 'object' && typeof b === 'object') {
        const ka = Object.keys(a);
        const kb = Object.keys(b);
        if (ka.length !== kb.length) return false;
        for (const k of ka) {
            if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
            if (!_isDeepEqual(a[k], b[k])) return false;
        }
        return true;
    }
    return false;
}

// ── Color strings for output ──
export const C = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m',
};
