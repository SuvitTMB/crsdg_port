/**
 * Web Audio API Sound Effects Synthesizer for Lucky Draw Game Show
 * Generates drumrolls, tension sweeps, ticks, and victory fanfares without external audio files.
 */

class SoundEffects {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem('crsdg_sound_muted') === 'true';
        this.spinInterval = null;
        this.spinRate = 40; // ms
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    isMuted() {
        return this.muted;
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('crsdg_sound_muted', this.muted);
        return this.muted;
    }

    playClick() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playTick(pitchModifier = 1) {
        this.playWheelClick(pitchModifier);
    }

    /**
     * Crisp Mechanical Wheel Ratchet Click
     * Simulates the peg hitting the flexible pointer flapper on a prize wheel / slot reel.
     */
    playWheelClick(pitchModifier = 1) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;

            // 1. Resonant wood/plastic ticker tap (body)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            const baseFreq = (720 + Math.random() * 260) * pitchModifier;
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.024);

            gain.gain.setValueAtTime(0.38, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.024);

            // 2. High snap click transient (peg striking pointer)
            const snapOsc = this.ctx.createOscillator();
            const snapGain = this.ctx.createGain();

            snapOsc.type = 'sawtooth';
            snapOsc.frequency.setValueAtTime(2400 + Math.random() * 600, now);
            snapOsc.frequency.exponentialRampToValueAtTime(500, now + 0.010);

            snapGain.gain.setValueAtTime(0.22, now);
            snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.010);

            snapOsc.connect(snapGain);
            snapGain.connect(this.ctx.destination);

            snapOsc.start(now);
            snapOsc.stop(now + 0.010);
        } catch (e) {
            console.warn('[Audio] playWheelClick error:', e);
        }
    }

    /**
     * Start wheel spinning clicks
     */
    startWheelSpin() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        this.stopWheelSpin();

        let step = 0;
        this.spinInterval = setInterval(() => {
            step++;
            const pitch = 0.95 + (step % 5) * 0.07;
            this.playWheelClick(pitch);
        }, 42); // ~24 clicks per second for high-speed wheel spin
    }

    stopWheelSpin() {
        if (this.spinInterval) {
            clearInterval(this.spinInterval);
            this.spinInterval = null;
        }
    }

    startDrumroll() {
        this.startWheelSpin();
    }

    stopDrumroll() {
        this.stopWheelSpin();
    }

    playDigitLock(index = 0) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
            const freq = freqs[Math.min(index, freqs.length - 1)] || 800;

            // 1. Solid tone chime
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.05, now + 0.14);

            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.16);

            // 2. Heavy mechanical vault clunk (latch locking into place)
            const thud = this.ctx.createOscillator();
            const thudGain = this.ctx.createGain();
            thud.type = 'sine';
            thud.frequency.setValueAtTime(180, now);
            thud.frequency.exponentialRampToValueAtTime(45, now + 0.07);

            thudGain.gain.setValueAtTime(0.5, now);
            thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

            thud.connect(thudGain);
            thudGain.connect(this.ctx.destination);
            thud.start(now);
            thud.stop(now + 0.07);
        } catch (e) {
            console.warn('[Audio] playDigitLock error:', e);
        }
    }

    playWin() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        this.stopDrumroll();

        const now = this.ctx.currentTime;

        // Fanfare chord progression: C4 -> E4 -> G4 -> C5 with trumpet-like timbre
        const notes = [
            { freq: 261.63, start: 0.00, dur: 0.15 }, // C4
            { freq: 329.63, start: 0.12, dur: 0.15 }, // E4
            { freq: 392.00, start: 0.24, dur: 0.20 }, // G4
            { freq: 523.25, start: 0.40, dur: 0.80 }, // C5
            { freq: 659.25, start: 0.40, dur: 0.80 }, // E5 harmony
            { freq: 783.99, start: 0.40, dur: 0.80 }  // G5 harmony
        ];

        notes.forEach(({ freq, start, dur }) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + start);

            gain.gain.setValueAtTime(0, now + start);
            gain.gain.linearRampToValueAtTime(0.18, now + start + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

            // Subtle lowpass filter for warmth
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2400, now + start);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + start);
            osc.stop(now + start + dur);
        });

        // Sparkle chimes
        setTimeout(() => this.playSparkle(), 400);
    }

    playSparkle() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const chimeFreqs = [1046.50, 1318.51, 1567.98, 2093.00];

        chimeFreqs.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);

            gain.gain.setValueAtTime(0.12, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.35);
        });
    }

    playBuzzer() {
        this.playSingleBuzzer(0.38);
    }

    playSingleBuzzer(duration = 0.20) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(125, now);
        osc2.frequency.setValueAtTime(133, now);

        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }

    playBuzzerDouble() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        // เสียงออด 2 ครั้ง (บัสเซอร์ 2 จังหวะต่อเนื่อง)
        for (let i = 0; i < 2; i++) {
            setTimeout(() => {
                this.playSingleBuzzer(0.24);
            }, i * 320);
        }
    }

    playBuzzerTriple() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        // เสียงออด 3 ครั้ง (บัสเซอร์ 3 จังหวะต่อเนื่อง)
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.playSingleBuzzer(0.18);
            }, i * 220);
        }
    }

    /**
     * Pleasant success ascending chime for save, confirm, and reset actions
     */
    playSuccess() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const chords = [
                { freq: 523.25, time: 0.00, dur: 0.12 }, // C5
                { freq: 659.25, time: 0.09, dur: 0.12 }, // E5
                { freq: 783.99, time: 0.18, dur: 0.28 }  // G5
            ];
            chords.forEach(({ freq, time, dur }) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + time);
                gain.gain.setValueAtTime(0.24, now + time);
                gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + time);
                osc.stop(now + time + dur);
            });
        } catch (e) {
            console.warn('[Audio] playSuccess error:', e);
        }
    }

    playDing() {
        this.playSuccess();
    }

    /**
     * Synthesizes crowd cheering and applause effect using Web Audio API
     */
    playApplause(duration = 5.0) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const sampleRate = this.ctx.sampleRate;
            const bufferSize = Math.floor(sampleRate * duration);
            const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
            const data = buffer.getChannelData(0);

            // Generate noise with clapping burst impulses
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                // Burst modulation simulating hundreds of desynchronized hand claps
                const burstMod = Math.pow(Math.random(), 4) * 2.2;
                data[i] = white * (0.3 + burstMod);
            }

            const noiseNode = this.ctx.createBufferSource();
            noiseNode.buffer = buffer;

            // Bandpass filter to shape clapping timbre (center ~1200Hz)
            const bandpass = this.ctx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.setValueAtTime(1200, now);
            bandpass.Q.setValueAtTime(1.2, now);

            // Highpass filter to eliminate mud
            const highpass = this.ctx.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.setValueAtTime(450, now);

            // Master envelope: swell up quickly, sustain, and fade out smoothly
            const gainNode = this.ctx.createGain();
            gainNode.gain.setValueAtTime(0.01, now);
            gainNode.gain.linearRampToValueAtTime(0.48, now + 0.35); // Fast swell
            gainNode.gain.setValueAtTime(0.48, now + duration - 1.2);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Smooth fade

            noiseNode.connect(bandpass);
            bandpass.connect(highpass);
            highpass.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            noiseNode.start(now);
            noiseNode.stop(now + duration);

            // Also trigger triumph brass fanfare
            this.playWin();
        } catch (e) {
            console.warn('[Audio] playApplause error:', e);
        }
    }
}

// Global audio instance
const globalSoundInstance = new SoundEffects();
window.soundEffects = globalSoundInstance;
window.sound = globalSoundInstance;
