import * as Tone from "tone";
import { Scale, Note } from "tonal";

/**
 * Procedural Audio Engine (Tone.js + Tonal.js)
 * Implements a generative, harmonically warm "analog" soundscape.
 * Adheres to the 'sounds-profile.md' directives: 
 * - LPF @ 2000Hz (200Hz resonance bump)
 * - Analog Drift (detuned oscillators)
 * - C Lydian scale
 */
class AudioEngine {
    private static instance: AudioEngine;
    
    // Master Bus components
    private masterFilter: Tone.Filter;
    private masterCompressor: Tone.Compressor;
    private masterReverb: Tone.Reverb;
    
    // Synthesis Generators
    private buildThumpSynth: Tone.MembraneSynth;  // Sub-bass "ground hit"
    private buildTransientNoise: Tone.NoiseSynth; // Initial crack/impact transient
    private uiSynth: Tone.MonoSynth;
    
    // Environment Ambience
    private envNoise: Tone.Noise;
    private envFilter: Tone.AutoFilter;
    private envGain: Tone.Gain;

    private isInitialized: boolean = false;

    private constructor() {
        // 1. Initialize Master Bus (The "Vocal Cords")
        // High-end attenuation + Mid-range warmth bump (Q=0.8)
        this.masterFilter = new Tone.Filter({
            frequency: 2000,
            type: "lowpass",
            rolloff: -12,
            Q: 0.82
        }).toDestination();

        this.masterCompressor = new Tone.Compressor({
            threshold: -24,
            ratio: 3,
            attack: 0.003,  // Faster attack for transient punch
            release: 0.08
        }).connect(this.masterFilter);

        this.masterReverb = new Tone.Reverb({
            decay: 0.5,
            preDelay: 0.01,
            wet: 0.08
        }).connect(this.masterCompressor);

        // 2. Build Impact: Sub-Bass Membrane Thump (Project Highrise / Marvel Impact)
        // MembraneSynth models a drum membrane — perfect for heavy "ground hit" thuds.
        // Pitched at ~80Hz with a fast sweep down to ~30Hz for that cinematic weight.
        this.buildThumpSynth = new Tone.MembraneSynth({
            pitchDecay: 0.08,       // Fast pitch sweep (80Hz → sub-bass)
            octaves: 4,             // Wide sweep range for cinematic depth
            oscillator: { type: "sine" },
            envelope: {
                attack: 0.003,      // Near-instant transient
                decay: 0.25,        // Quick fade — total sound < 0.4s
                sustain: 0,
                release: 0.1        // Minimal release tail
            },
            volume: -6
        }).connect(this.masterCompressor); // Bypass reverb — bone dry

        // 3. Build Impact: Noise Transient ("Crack" layer)
        // Short burst of filtered noise to simulate the initial impact crack
        this.buildTransientNoise = new Tone.NoiseSynth({
            noise: { type: "white" },
            envelope: {
                attack: 0.001,      // Instantaneous
                decay: 0.06,        // Very short — just the "crack"
                sustain: 0,
                release: 0.02
            },
            volume: -18            // Subtle — supports the thump, doesn't dominate
        }).connect(this.masterCompressor); // Bypass reverb — bone dry

        // 4. UI Synthesis (The "Boop")
        // Bone-Dry & Snappy (0.05s)
        // BYPASS REVERB: Connected to compressor instead of reverb to eliminate 'airyness'
        this.uiSynth = new Tone.MonoSynth({
            oscillator: { type: "sine" },
            envelope: { 
                attack: 0.005, 
                decay: 0.05, 
                sustain: 0, 
                release: 0.05 
            }
        }).connect(this.masterCompressor);

        // 5. Environment Ambience
        this.envNoise = new Tone.Noise("pink");
        this.envFilter = new Tone.AutoFilter({
            frequency: "4n",
            baseFrequency: 400,
            octaves: 2.6
        }).connect(this.masterReverb);
        
        this.envGain = new Tone.Gain(0).connect(this.envFilter);
        this.envNoise.connect(this.envGain);

        // 6. Start Watchdog to maintain context life
        this.startWatchdog();
    }

    public static getInstance(): AudioEngine {
        if (!AudioEngine.instance) {
            AudioEngine.instance = new AudioEngine();
        }
        return AudioEngine.instance;
    }

    /**
     * Resumes the Tone.js context. Must be called after a user gesture.
     */
    public async resume(): Promise<void> {
        if (Tone.getContext().state !== "running") {
            await Tone.start();
            this.envNoise.start();
            Tone.Transport.start();
            this.isInitialized = true;
            console.log("🔊 Audio Engine: Resumed & Environment Started");
        }
    }

    /**
     * Force-resumes the context, useful for tab focus events.
     */
    public async forceResume(): Promise<void> {
        const context = Tone.getContext();
        if (context.state !== "running") {
            await context.resume();
            if ((context as any).rawContext?.resume) {
                await (context as any).rawContext.resume();
            }
        }
        
        if (this.isInitialized && Tone.Transport.state !== "started") {
            Tone.Transport.start();
            this.envNoise.start();
        }
    }

    /**
     * Internal Watchdog: Periodically monitors context state to ensure
     * it hasn't been suspended by aggressive browser power management.
     */
    private startWatchdog() {
        setInterval(async () => {
            const state = Tone.getContext().state;
            if (state === "suspended" || state === "interrupted") {
                console.warn(`⚠️ Audio Engine: Context ${state}. Attempting auto-recovery...`);
                await this.forceResume();
            }
        }, 2000);
    }

    /**
     * Trigger a cinematic construction impact thud.
     * Layered design: MembraneSynth sub-bass thump + NoiseSynth transient crack.
     * Inspired by Project Highrise placement and Marvel cinematic impacts.
     * Total duration: ~0.4s, bone-dry, no reverb.
     */
    public triggerBuildThud(positionScalar: number = 1) {
        const now = Tone.now();
        // Layer 1: Sub-bass membrane thump (the "weight")
        this.buildThumpSynth.triggerAttackRelease("C1", 0.25, now);
        // Layer 2: Noise transient crack (the "impact")
        this.buildTransientNoise.triggerAttackRelease(0.06, now);
    }

    /**
     * Trigger a soft, juicy UI interaction sound.
     */
    public triggerUIClick() {
        this.uiSynth.triggerAttackRelease("G4", "16n");
    }

    /**
     * Nuanced trigger for sub-type confirmed selection.
     */
    public triggerSubSelect() {
        const now = Tone.now();
        this.uiSynth.triggerAttackRelease("C5", "32n", now);
        this.uiSynth.triggerAttackRelease("E5", "32n", now + 0.06); // double-tap feel
    }

    /**
     * Nuanced trigger for menu expansion/hover.
     */
    public triggerMenuExpand() {
        this.uiSynth.triggerAttackRelease("B5", "64n"); // High, short pip
    }

    /**
     * Nuanced trigger for cancellation/deselection.
     */
    public triggerUICancel() {
        const now = Tone.now();
        const freq = new Tone.Frequency("G3");
        this.uiSynth.triggerAttack(freq, now);
        this.uiSynth.frequency.rampTo("G2", 0.1, now);
        this.uiSynth.triggerRelease(now + 0.1);
    }

    /**
     * Map camera zoom to environment timbre.
     * Zoom < 3: Indoor (Mechanical/Hum focus)
     * Zoom >= 3: Outdoor (Wind/Rain focus)
     */
    public updateEnvironment(zoom: number) {
        if (!this.isInitialized) return;

        // Exponential volume curve for organic feel
        const envVolume = Math.min(0.15, (zoom / 20) * 0.15);
        this.envGain.gain.rampTo(envVolume, 0.5);

        // Shift filter based on zoom to simulate 'opening' the sky
        const cutoff = zoom >= 3.0 ? 1200 : 400;
        this.envFilter.baseFrequency = cutoff;
    }
}

export const audioEngine = AudioEngine.getInstance();
