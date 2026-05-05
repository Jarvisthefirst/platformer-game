/**
 * audio.js — Audio System
 * 
 * Procedural sound generation using the Web Audio API.
 * No external audio files required — all sounds are synthesized.
 * 
 * Features:
 *   - Sound effects: jump, land, collect, damage, death, shoot
 *   - Procedural background music (beat-driven)
 *   - Volume control per channel (SFX / music)
 *   - Sound pooling for overlapping effects
 */

// ═══════════════════════════════════════════════════════════════════════
//  Audio Manager
// ═══════════════════════════════════════════════════════════════════════

export class AudioManager {
    constructor() {
        this.ctx = null;       // AudioContext (created on first interaction)
        this.masterGain = null;

        // Volume channels (0.0 to 1.0)
        this.sfxVolume = 0.5;
        this.musicVolume = 0.3;

        // Sound pool (reuse oscillators)
        this.sfxGain = null;
        this.musicGain = null;

        // Music state
        this.musicPlaying = false;
        this.musicOscillators = [];
        this.musicTimer = 0;
        this.bpm = 140;
        this.beatDuration = 0;
        this.currentBeat = 0;

        // Initialized flag
        this._initialized = false;
    }

    /**
     * Initialize the audio context.
     * Must be called from a user interaction (click/keypress) due to browser autoplay policy.
     */
    init() {
        if (this._initialized) return;

        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();

            // Master volume
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 1;
            this.masterGain.connect(this.ctx.destination);

            // SFX channel
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);

            // Music channel
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);

            this._initialized = true;
            this.beatDuration = 60 / this.bpm;
        } catch (e) {
            console.warn('Web Audio API not available:', e);
        }
    }

    /**
     * Ensure audio context is initialized (call this before any sound).
     */
    _ensureInit() {
        if (!this._initialized) this.init();
        if (this.ctx?.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // ── Volume Control ──

    setSFXVolume(vol) {
        this.sfxVolume = Math.max(0, Math.min(1, vol));
        if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
    }

    setMusicVolume(vol) {
        this.musicVolume = Math.max(0, Math.min(1, vol));
        if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
    }

    setMasterVolume(vol) {
        if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, vol));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Sound Effects (Procedural)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Play a jump sound effect.
     * Quick rising tone.
     */
    playJump() {
        this._ensureInit();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.12);
    }

    /**
     * Play a landing sound effect.
     * Quick thud.
     */
    playLand() {
        this._ensureInit();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.1);
    }

    /**
     * Play a collectible pickup sound.
     * Bright ascending chime.
     */
    playCollect() {
        this._ensureInit();
        if (!this.ctx) return;

        const notes = [523, 659, 784]; // C5, E5, G5
        const duration = 0.08;

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const startTime = this.ctx.currentTime + i * duration;
            gain.gain.setValueAtTime(0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });
    }

    /**
     * Play a damage/hit sound.
     * Low, harsh buzz.
     */
    playDamage() {
        this._ensureInit();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.25);
    }

    /**
     * Play a death sound.
     * Descending, sad tone.
     */
    playDeath() {
        this._ensureInit();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.6);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.7);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.7);
    }

    /**
     * Play a shooting sound.
     * Short, sharp noise burst.
     */
    playShoot() {
        this._ensureInit();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noise = this.ctx.createBufferSource();

        // Use oscillator + short burst
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.04);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.06);
    }

    /**
     * Play an enemy stomp sound.
     * Quick squish.
     */
    playStomp() {
        this._ensureInit();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.12);
    }

    /**
     * Play a level complete fanfare.
     * Ascending major chord arpeggio.
     */
    playLevelComplete() {
        this._ensureInit();
        if (!this.ctx) return;

        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        const duration = 0.15;

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const startTime = this.ctx.currentTime + i * duration;
            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Background Music (Procedural)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Start procedural background music.
     * Simple beat-driven bass + chord progression.
     */
    startMusic() {
        this._ensureInit();
        if (!this.ctx || this.musicPlaying) return;
        this.musicPlaying = true;
        this.musicTimer = 0;
        this.currentBeat = 0;
        this._scheduleBeat();
    }

    /**
     * Stop background music.
     */
    stopMusic() {
        this.musicPlaying = false;
        // Stop all active oscillators
        for (const osc of this.musicOscillators) {
            try { osc.stop(); } catch (e) { /* already stopped */ }
        }
        this.musicOscillators = [];
    }

    /**
     * Schedule the next beat (simple lo-fi beat sequence).
     */
    _scheduleBeat() {
        if (!this.musicPlaying || !this.ctx) return;

        const now = this.ctx.currentTime;
        const beatLen = this.beatDuration;

        // Bass line (simple pattern cycling through notes)
        const bassNotes = [130.81, 146.83, 164.81, 174.61]; // C3, D3, E3, F3
        const pattern = [0, 0, 1, 1, 2, 2, 3, 3]; // 8-beat pattern

        // Kick drum (on beats 0, 2, 4, 6)
        if (this.currentBeat % 2 === 0) {
            this._playKick(now, 0.3);
        }

        // Hi-hat (every 8th note)
        this._playHat(now, 0.1);

        // Bass (on each beat)
        const noteIdx = pattern[this.currentBeat % pattern.length];
        const freq = bassNotes[noteIdx];
        this._playBass(now, freq, beatLen * 0.8, 0.15);

        // Schedule next beat
        this.currentBeat++;
        this.musicTimer += beatLen;

        const nextBeatDelay = beatLen * 1000;
        this._beatTimeout = setTimeout(() => {
            this._scheduleBeat();
        }, nextBeatDelay);
    }

    /**
     * Play a kick drum sound.
     */
    _playKick(time, volume) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);

        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.15);
        this.musicOscillators.push(osc);
    }

    /**
     * Play a hi-hat sound.
     */
    _playHat(time, volume) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.value = 4000;

        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.04);
        this.musicOscillators.push(osc);
    }

    /**
     * Play a bass note.
     */
    _playBass(time, freq, duration, volume) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(volume, time);
        gain.gain.setValueAtTime(volume, time + duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + duration);
        this.musicOscillators.push(osc);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Cleanup
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Stop all sounds and clean up.
     */
    stopAll() {
        this.stopMusic();
        if (this._beatTimeout) {
            clearTimeout(this._beatTimeout);
            this._beatTimeout = null;
        }
    }

    /**
     * Dispose of the audio context.
     */
    dispose() {
        this.stopAll();
        if (this.ctx) {
            this.ctx.close();
            this.ctx = null;
        }
        this._initialized = false;
    }
}
