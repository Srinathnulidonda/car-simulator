export class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.engines = {};
        this.ambient = {};
        this.effects = {};

        // Audio parameters
        this.masterVolume = 0.7;
        this.engineVolume = 0.8;
        this.ambientVolume = 0.5;
        this.effectVolume = 0.6;

        // Engine audio
        this.currentRPM = 800;
        this.currentSpeed = 0;
        this.isAccelerating = false;
        this.isBraking = false;
        this.isSkidding = false;

        // Environmental audio
        this.windIntensity = 0;
        this.rainIntensity = 0;
        this.roadNoise = 0;

        // Audio nodes for processing
        this.audioNodes = {
            masterGain: null,
            engineGain: null,
            ambientGain: null,
            effectGain: null,
            lowPassFilter: null,
            highPassFilter: null,
            reverb: null
        };
    }

    async init() {
        // Initialize Web Audio API
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create audio processing nodes
        this.createAudioNodes();

        // Load all audio files
        await this.loadAudioFiles();

        // Setup engine audio synthesis
        this.setupEngineAudio();

        // Setup ambient audio
        this.setupAmbientAudio();

        console.log('Audio system initialized');
    }

    createAudioNodes() {
        const ctx = this.audioContext;

        // Master volume control
        this.audioNodes.masterGain = ctx.createGain();
        this.audioNodes.masterGain.gain.value = this.masterVolume;
        this.audioNodes.masterGain.connect(ctx.destination);

        // Engine audio chain
        this.audioNodes.engineGain = ctx.createGain();
        this.audioNodes.engineGain.gain.value = this.engineVolume;
        this.audioNodes.engineGain.connect(this.audioNodes.masterGain);

        // Ambient audio chain
        this.audioNodes.ambientGain = ctx.createGain();
        this.audioNodes.ambientGain.gain.value = this.ambientVolume;
        this.audioNodes.ambientGain.connect(this.audioNodes.masterGain);

        // Effect audio chain
        this.audioNodes.effectGain = ctx.createGain();
        this.audioNodes.effectGain.gain.value = this.effectVolume;
        this.audioNodes.effectGain.connect(this.audioNodes.masterGain);

        // Filters for environmental effects
        this.audioNodes.lowPassFilter = ctx.createBiquadFilter();
        this.audioNodes.lowPassFilter.type = 'lowpass';
        this.audioNodes.lowPassFilter.frequency.value = 20000;

        this.audioNodes.highPassFilter = ctx.createBiquadFilter();
        this.audioNodes.highPassFilter.type = 'highpass';
        this.audioNodes.highPassFilter.frequency.value = 20;

        // Reverb for interior/exterior switching
        this.createReverb();
    }

    createReverb() {
        const ctx = this.audioContext;

        // Create convolution reverb
        this.audioNodes.reverb = ctx.createConvolver();

        // Generate impulse response for car interior
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * 0.5; // 0.5 second reverb
        const impulse = ctx.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }

        this.audioNodes.reverb.buffer = impulse;
    }

    async loadAudioFiles() {
        // Engine sounds (generated procedurally)
        this.setupProceduralEngine();

        // Load ambient sounds
        const ambientSounds = {
            wind: this.createWindNoise(),
            rain: this.createRainNoise(),
            road: this.createRoadNoise()
        };

        // Load effect sounds
        await this.loadEffectSounds();

        this.sounds = { ...ambientSounds };
    }

    setupProceduralEngine() {
        const ctx = this.audioContext;

        // Create engine audio using oscillators and noise
        this.engines = {
            oscillator1: ctx.createOscillator(),
            oscillator2: ctx.createOscillator(),
            oscillator3: ctx.createOscillator(),
            noiseGain: ctx.createGain(),
            engineFilter: ctx.createBiquadFilter()
        };

        // Setup oscillators for different engine harmonics
        this.engines.oscillator1.type = 'sawtooth';
        this.engines.oscillator1.frequency.value = 80;

        this.engines.oscillator2.type = 'square';
        this.engines.oscillator2.frequency.value = 160;

        this.engines.oscillator3.type = 'triangle';
        this.engines.oscillator3.frequency.value = 240;

        // Engine filter for realistic sound shaping
        this.engines.engineFilter.type = 'lowpass';
        this.engines.engineFilter.frequency.value = 2000;
        this.engines.engineFilter.Q.value = 2;

        // Noise for engine texture
        this.engines.noiseGain.gain.value = 0.1;

        // Connect engine audio chain
        const engineGain1 = ctx.createGain();
        const engineGain2 = ctx.createGain();
        const engineGain3 = ctx.createGain();

        engineGain1.gain.value = 0.3;
        engineGain2.gain.value = 0.2;
        engineGain3.gain.value = 0.1;

        this.engines.oscillator1.connect(engineGain1);
        this.engines.oscillator2.connect(engineGain2);
        this.engines.oscillator3.connect(engineGain3);

        engineGain1.connect(this.engines.engineFilter);
        engineGain2.connect(this.engines.engineFilter);
        engineGain3.connect(this.engines.engineFilter);

        this.engines.engineFilter.connect(this.audioNodes.engineGain);

        // Start oscillators
        this.engines.oscillator1.start();
        this.engines.oscillator2.start();
        this.engines.oscillator3.start();

        // Add engine noise
        this.createEngineNoise();
    }

    createEngineNoise() {
        const ctx = this.audioContext;

        // White noise for engine texture
        const bufferSize = 4096;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 100;

        whiteNoise.connect(noiseFilter);
        noiseFilter.connect(this.engines.noiseGain);
        this.engines.noiseGain.connect(this.engines.engineFilter);

        whiteNoise.start();
    }

    createWindNoise() {
        const ctx = this.audioContext;

        // Wind sound using filtered noise
        const bufferSize = 8192;
        const windBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const output = windBuffer.getChannelData(channel);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * 0.3;
            }
        }

        const windSource = ctx.createBufferSource();
        windSource.buffer = windBuffer;
        windSource.loop = true;

        const windFilter = ctx.createBiquadFilter();
        windFilter.type = 'lowpass';
        windFilter.frequency.value = 800;
        windFilter.Q.value = 0.5;

        const windGain = ctx.createGain();
        windGain.gain.value = 0;

        windSource.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(this.audioNodes.ambientGain);

        windSource.start();

        return { source: windSource, gain: windGain, filter: windFilter };
    }

    createRainNoise() {
        const ctx = this.audioContext;

        // Rain sound using noise and multiple layers
        const rainGain = ctx.createGain();
        rainGain.gain.value = 0;

        // Heavy rain layer
        const heavyRainSource = this.createNoiseSource(0.2, 300, 2000);
        heavyRainSource.connect(rainGain);

        // Light rain layer
        const lightRainSource = this.createNoiseSource(0.1, 800, 4000);
        lightRainSource.connect(rainGain);

        rainGain.connect(this.audioNodes.ambientGain);

        return { gain: rainGain };
    }

    createRoadNoise() {
        const ctx = this.audioContext;

        // Road noise using modulated noise
        const roadGain = ctx.createGain();
        roadGain.gain.value = 0;

        const roadSource = this.createNoiseSource(0.15, 80, 600);
        roadSource.connect(roadGain);
        roadGain.connect(this.audioNodes.ambientGain);

        return { gain: roadGain };
    }

    createNoiseSource(volume, lowFreq, highFreq) {
        const ctx = this.audioContext;

        const bufferSize = 4096;
        const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const output = noiseBuffer.getChannelData(channel);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * volume;
            }
        }

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        const bandPassFilter = ctx.createBiquadFilter();
        bandPassFilter.type = 'bandpass';
        bandPassFilter.frequency.value = (lowFreq + highFreq) / 2;
        bandPassFilter.Q.value = 1;

        noiseSource.connect(bandPassFilter);
        noiseSource.start();

        return bandPassFilter;
    }

    async loadEffectSounds() {
        // Create procedural sound effects
        this.effects = {
            gearShift: this.createGearShiftSound(),
            brake: this.createBrakeSound(),
            horn: this.createHornSound(),
            indicator: this.createIndicatorSound(),
            door: this.createDoorSound()
        };
    }

    createGearShiftSound() {
        const ctx = this.audioContext;

        return () => {
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();

            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(200, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

            oscillator.connect(gain);
            gain.connect(this.audioNodes.effectGain);

            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.1);
        };
    }

    createBrakeSound() {
        const ctx = this.audioContext;

        return (intensity) => {
            const noiseSource = this.createNoiseSource(intensity * 0.5, 1000, 4000);
            const gain = ctx.createGain();

            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(intensity, ctx.currentTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

            noiseSource.connect(gain);
            gain.connect(this.audioNodes.effectGain);

            setTimeout(() => {
                noiseSource.disconnect();
            }, 500);
        };
    }

    createHornSound() {
        const ctx = this.audioContext;

        return () => {
            const oscillator1 = ctx.createOscillator();
            const oscillator2 = ctx.createOscillator();
            const gain = ctx.createGain();

            oscillator1.type = 'sine';
            oscillator1.frequency.value = 330;
            oscillator2.type = 'sine';
            oscillator2.frequency.value = 415;

            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);

            oscillator1.connect(gain);
            oscillator2.connect(gain);
            gain.connect(this.audioNodes.effectGain);

            oscillator1.start();
            oscillator2.start();
            oscillator1.stop(ctx.currentTime + 1);
            oscillator2.stop(ctx.currentTime + 1);
        };
    }

    createIndicatorSound() {
        const ctx = this.audioContext;

        return () => {
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();

            oscillator.type = 'square';
            oscillator.frequency.value = 800;

            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

            oscillator.connect(gain);
            gain.connect(this.audioNodes.effectGain);

            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.2);
        };
    }

    createDoorSound() {
        const ctx = this.audioContext;

        return () => {
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(100, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);

            filter.type = 'lowpass';
            filter.frequency.value = 500;

            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

            oscillator.connect(filter);
            filter.connect(gain);
            gain.connect(this.audioNodes.effectGain);

            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.3);
        };
    }

    setupEngineAudio() {
        // Already setup in setupProceduralEngine()
    }

    setupAmbientAudio() {
        // Already setup in createWindNoise, createRainNoise, createRoadNoise
    }

    update(speed, weather) {
        this.currentSpeed = speed;
        this.updateEngineAudio();
        this.updateAmbientAudio(weather);
        this.updateEnvironmentalEffects();
    }

    updateEngineAudio() {
        if (!this.engines.oscillator1) return;

        const ctx = this.audioContext;
        const currentTime = ctx.currentTime;

        // Calculate RPM based on speed and gear
        const baseRPM = 800;
        const maxRPM = 6000;
        const speedRatio = Math.min(this.currentSpeed / 200, 1);
        this.currentRPM = baseRPM + (speedRatio * (maxRPM - baseRPM));

        // Update engine frequencies
        const baseFreq = this.currentRPM / 60 * 2; // Convert RPM to Hz

        this.engines.oscillator1.frequency.setTargetAtTime(
            baseFreq, currentTime, 0.1
        );
        this.engines.oscillator2.frequency.setTargetAtTime(
            baseFreq * 2, currentTime, 0.1
        );
        this.engines.oscillator3.frequency.setTargetAtTime(
            baseFreq * 3, currentTime, 0.1
        );

        // Update engine filter based on RPM
        const filterFreq = 1000 + (speedRatio * 3000);
        this.engines.engineFilter.frequency.setTargetAtTime(
            filterFreq, currentTime, 0.1
        );

        // Update engine volume based on acceleration
        const engineVolume = 0.3 + (speedRatio * 0.4);
        this.audioNodes.engineGain.gain.setTargetAtTime(
            engineVolume * this.engineVolume, currentTime, 0.1
        );
    }

    updateAmbientAudio(weather) {
        const ctx = this.audioContext;
        const currentTime = ctx.currentTime;

        // Wind intensity based on speed
        this.windIntensity = Math.min(this.currentSpeed / 100, 1);
        if (this.sounds.wind && this.sounds.wind.gain) {
            this.sounds.wind.gain.gain.setTargetAtTime(
                this.windIntensity * 0.3, currentTime, 0.2
            );

            // Adjust wind filter frequency based on speed
            if (this.sounds.wind.filter) {
                const windFreq = 800 + (this.windIntensity * 1200);
                this.sounds.wind.filter.frequency.setTargetAtTime(
                    windFreq, currentTime, 0.2
                );
            }
        }

        // Road noise based on speed
        this.roadNoise = Math.min(this.currentSpeed / 80, 1);
        if (this.sounds.road && this.sounds.road.gain) {
            this.sounds.road.gain.gain.setTargetAtTime(
                this.roadNoise * 0.2, currentTime, 0.2
            );
        }

        // Weather-based audio
        switch (weather) {
            case 'rain':
                this.rainIntensity = 0.7;
                break;
            case 'fog':
                this.rainIntensity = 0.2;
                break;
            default:
                this.rainIntensity = 0;
        }

        if (this.sounds.rain && this.sounds.rain.gain) {
            this.sounds.rain.gain.gain.setTargetAtTime(
                this.rainIntensity * 0.4, currentTime, 0.5
            );
        }
    }

    updateEnvironmentalEffects() {
        // Apply environmental filters based on conditions
        const ctx = this.audioContext;
        const currentTime = ctx.currentTime;

        // Muffled sound in rain/fog
        if (this.rainIntensity > 0) {
            const dampening = 15000 - (this.rainIntensity * 5000);
            this.audioNodes.lowPassFilter.frequency.setTargetAtTime(
                dampening, currentTime, 0.3
            );
        } else {
            this.audioNodes.lowPassFilter.frequency.setTargetAtTime(
                20000, currentTime, 0.3
            );
        }
    }

    // Sound effect triggers
    playShiftSound() {
        if (this.effects.gearShift) {
            this.effects.gearShift();
        }
    }

    playBrakeSound(intensity = 0.5) {
        if (this.effects.brake) {
            this.effects.brake(intensity);
        }
    }

    playHornSound() {
        if (this.effects.horn) {
            this.effects.horn();
        }
    }

    playIndicatorSound() {
        if (this.effects.indicator) {
            this.effects.indicator();
        }
    }

    playDoorSound() {
        if (this.effects.door) {
            this.effects.door();
        }
    }

    // Volume controls
    setMasterVolume(volume) {
        this.masterVolume = volume;
        if (this.audioNodes.masterGain) {
            this.audioNodes.masterGain.gain.value = volume;
        }
    }

    setEngineVolume(volume) {
        this.engineVolume = volume;
        if (this.audioNodes.engineGain) {
            this.audioNodes.engineGain.gain.value = volume;
        }
    }

    setAmbientVolume(volume) {
        this.ambientVolume = volume;
        if (this.audioNodes.ambientGain) {
            this.audioNodes.ambientGain.gain.value = volume;
        }
    }

    setEffectVolume(volume) {
        this.effectVolume = volume;
        if (this.audioNodes.effectGain) {
            this.audioNodes.effectGain.gain.value = volume;
        }
    }

    // Interior/Exterior audio switching
    setInterior(isInterior) {
        const ctx = this.audioContext;
        const currentTime = ctx.currentTime;

        if (isInterior) {
            // Apply interior reverb and muffling
            this.audioNodes.lowPassFilter.frequency.setTargetAtTime(
                8000, currentTime, 0.2
            );

            // Reduce wind and road noise
            if (this.sounds.wind && this.sounds.wind.gain) {
                this.sounds.wind.gain.gain.setTargetAtTime(
                    this.windIntensity * 0.1, currentTime, 0.2
                );
            }
            if (this.sounds.road && this.sounds.road.gain) {
                this.sounds.road.gain.gain.setTargetAtTime(
                    this.roadNoise * 0.05, currentTime, 0.2
                );
            }
        } else {
            // Remove interior effects
            this.audioNodes.lowPassFilter.frequency.setTargetAtTime(
                20000, currentTime, 0.2
            );

            // Restore wind and road noise
            if (this.sounds.wind && this.sounds.wind.gain) {
                this.sounds.wind.gain.gain.setTargetAtTime(
                    this.windIntensity * 0.3, currentTime, 0.2
                );
            }
            if (this.sounds.road && this.sounds.road.gain) {
                this.sounds.road.gain.gain.setTargetAtTime(
                    this.roadNoise * 0.2, currentTime, 0.2
                );
            }
        }
    }
}