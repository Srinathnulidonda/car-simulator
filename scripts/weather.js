export class WeatherSystem {
    constructor(scene) {
        this.scene = scene;
        this.currentWeather = 'clear';
        this.transitionDuration = 5000; // 5 seconds
        this.isTransitioning = false;

        this.weatherStates = {
            clear: {
                skyColor: 0x87CEEB,
                fogColor: 0x87CEEB,
                fogNear: 100,
                fogFar: 1000,
                ambientIntensity: 0.4,
                directionalIntensity: 1.0,
                precipitation: null,
                windIntensity: 0.1
            },
            rain: {
                skyColor: 0x555555,
                fogColor: 0x666666,
                fogNear: 50,
                fogFar: 400,
                ambientIntensity: 0.2,
                directionalIntensity: 0.4,
                precipitation: 'rain',
                windIntensity: 0.7
            },
            fog: {
                skyColor: 0xcccccc,
                fogColor: 0xcccccc,
                fogNear: 20,
                fogFar: 200,
                ambientIntensity: 0.6,
                directionalIntensity: 0.2,
                precipitation: null,
                windIntensity: 0.3
            },
            night: {
                skyColor: 0x000033,
                fogColor: 0x000044,
                fogNear: 100,
                fogFar: 600,
                ambientIntensity: 0.1,
                directionalIntensity: 0.1,
                precipitation: null,
                windIntensity: 0.2
            },
            storm: {
                skyColor: 0x2a2a2a,
                fogColor: 0x444444,
                fogNear: 30,
                fogFar: 300,
                ambientIntensity: 0.15,
                directionalIntensity: 0.3,
                precipitation: 'storm',
                windIntensity: 1.0
            }
        };

        this.lighting = {
            ambient: null,
            directional: null,
            streetLights: []
        };

        this.effects = {
            rain: null,
            lightning: null,
            windParticles: null,
            clouds: null
        };

        this.timeOfDay = {
            current: 12, // 24-hour format
            speed: 0.1, // Game hours per real second
            enabled: true
        };

        this.init();
    }

    init() {
        this.setupLighting();
        this.createWeatherEffects();
        this.createSkybox();
        this.setWeather('clear');
    }

    setupLighting() {
        // Find existing lights or create new ones
        this.lighting.ambient = this.scene.children.find(child =>
            child.type === 'AmbientLight'
        );

        this.lighting.directional = this.scene.children.find(child =>
            child.type === 'DirectionalLight'
        );

        // Create street lights for night time
        this.createStreetLights();
    }

    createStreetLights() {
        // Street lights are created by the world builder
        // We just need to control their visibility and intensity
        this.lighting.streetLights = this.scene.children.filter(child =>
            child.userData && child.userData.isStreetLight
        );
    }

    createWeatherEffects() {
        this.createRainEffect();
        this.createLightningEffect();
        this.createWindEffect();
        this.createCloudSystem();
    }

    createRainEffect() {
        const rainCount = 2000;
        const rainGeometry = new THREE.BufferGeometry();
        const rainPositions = new Float32Array(rainCount * 3);
        const rainVelocities = new Float32Array(rainCount * 3);

        for (let i = 0; i < rainCount; i++) {
            const i3 = i * 3;
            rainPositions[i3] = (Math.random() - 0.5) * 2000;
            rainPositions[i3 + 1] = Math.random() * 500;
            rainPositions[i3 + 2] = (Math.random() - 0.5) * 2000;

            rainVelocities[i3] = (Math.random() - 0.5) * 2;
            rainVelocities[i3 + 1] = -10 - Math.random() * 10;
            rainVelocities[i3 + 2] = (Math.random() - 0.5) * 2;
        }

        rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
        rainGeometry.setAttribute('velocity', new THREE.BufferAttribute(rainVelocities, 3));

        const rainMaterial = new THREE.PointsMaterial({
            color: 0xaaaaaa,
            size: 0.5,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        this.effects.rain = new THREE.Points(rainGeometry, rainMaterial);
        this.effects.rain.visible = false;
        this.scene.add(this.effects.rain);
    }

    createLightningEffect() {
        // Lightning flash effect
        this.effects.lightning = {
            active: false,
            intensity: 0,
            duration: 0,
            lastStrike: 0,
            interval: 5000 + Math.random() * 10000
        };
    }

    createWindEffect() {
        const windCount = 500;
        const windGeometry = new THREE.BufferGeometry();
        const windPositions = new Float32Array(windCount * 3);

        for (let i = 0; i < windCount; i++) {
            const i3 = i * 3;
            windPositions[i3] = (Math.random() - 0.5) * 1000;
            windPositions[i3 + 1] = Math.random() * 100;
            windPositions[i3 + 2] = (Math.random() - 0.5) * 1000;
        }

        windGeometry.setAttribute('position', new THREE.BufferAttribute(windPositions, 3));

        const windMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            transparent: true,
            opacity: 0.2
        });

        this.effects.windParticles = new THREE.Points(windGeometry, windMaterial);
        this.effects.windParticles.visible = false;
        this.scene.add(this.effects.windParticles);
    }

    createCloudSystem() {
        this.effects.clouds = [];

        for (let i = 0; i < 20; i++) {
            const cloud = this.createCloud();
            cloud.position.set(
                (Math.random() - 0.5) * 3000,
                200 + Math.random() * 100,
                (Math.random() - 0.5) * 3000
            );
            this.scene.add(cloud);
            this.effects.clouds.push(cloud);
        }
    }

    createCloud() {
        const cloud = new THREE.Group();

        // Create cloud using multiple spheres
        const cloudMaterial = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });

        for (let i = 0; i < 5 + Math.random() * 10; i++) {
            const sphereGeometry = new THREE.SphereGeometry(
                10 + Math.random() * 20,
                8,
                8
            );
            const sphere = new THREE.Mesh(sphereGeometry, cloudMaterial);

            sphere.position.set(
                (Math.random() - 0.5) * 60,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 60
            );

            cloud.add(sphere);
        }

        return cloud;
    }

    createSkybox() {
        // Create a dynamic skybox that changes with weather
        const skyGeometry = new THREE.SphereGeometry(1500, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            side: THREE.BackSide
        });

        this.skybox = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.skybox);

        this.updateSkybox();
    }

    updateSkybox() {
        if (!this.skybox) return;

        const weather = this.weatherStates[this.currentWeather];

        // Create gradient skybox
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Create gradient based on weather and time
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);

        const skyColor = new THREE.Color(weather.skyColor);
        const horizonColor = skyColor.clone().multiplyScalar(0.7);

        // Adjust for time of day
        if (this.timeOfDay.current < 6 || this.timeOfDay.current > 20) {
            // Night time
            skyColor.multiplyScalar(0.1);
            horizonColor.multiplyScalar(0.2);
        } else if (this.timeOfDay.current < 8 || this.timeOfDay.current > 18) {
            // Dawn/dusk
            skyColor.r = Math.max(skyColor.r, 0.8);
            skyColor.g = Math.max(skyColor.g * 0.6, 0.4);
            skyColor.b = Math.max(skyColor.b * 0.4, 0.2);
        }

        gradient.addColorStop(0, `rgb(${skyColor.r * 255}, ${skyColor.g * 255}, ${skyColor.b * 255})`);
        gradient.addColorStop(1, `rgb(${horizonColor.r * 255}, ${horizonColor.g * 255}, ${horizonColor.b * 255})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        // Add stars for night time
        if (this.timeOfDay.current < 6 || this.timeOfDay.current > 20) {
            ctx.fillStyle = 'white';
            for (let i = 0; i < 200; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 256; // Only upper half
                const size = Math.random() * 2;
                ctx.fillRect(x, y, size, size);
            }
        }

        const skyTexture = new THREE.CanvasTexture(canvas);
        this.skybox.material.map = skyTexture;
        this.skybox.material.needsUpdate = true;
    }

    setWeather(weatherType) {
        if (!this.weatherStates[weatherType] || this.isTransitioning) {
            return;
        }

        this.isTransitioning = true;
        const previousWeather = this.currentWeather;
        this.currentWeather = weatherType;

        this.transitionWeather(previousWeather, weatherType);

        // Update UI
        this.updateWeatherDisplay();

        // Dispatch weather change event
        window.dispatchEvent(new CustomEvent('weatherChange', {
            detail: {
                weather: weatherType,
                state: this.weatherStates[weatherType]
            }
        }));
    }

    transitionWeather(from, to) {
        const fromState = this.weatherStates[from];
        const toState = this.weatherStates[to];

        const startTime = Date.now();
        const duration = this.transitionDuration;

        const transition = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Smooth easing function
            const easeProgress = progress * progress * (3 - 2 * progress);

            // Interpolate sky and fog colors
            const skyColor = new THREE.Color(fromState.skyColor).lerp(
                new THREE.Color(toState.skyColor), easeProgress
            );
            const fogColor = new THREE.Color(fromState.fogColor).lerp(
                new THREE.Color(toState.fogColor), easeProgress
            );

            // Update scene
            this.scene.background = skyColor;
            this.scene.fog.color = fogColor;
            this.scene.fog.near = THREE.MathUtils.lerp(fromState.fogNear, toState.fogNear, easeProgress);
            this.scene.fog.far = THREE.MathUtils.lerp(fromState.fogFar, toState.fogFar, easeProgress);

            // Update lighting
            if (this.lighting.ambient) {
                this.lighting.ambient.intensity = THREE.MathUtils.lerp(
                    fromState.ambientIntensity, toState.ambientIntensity, easeProgress
                );
            }

            if (this.lighting.directional) {
                this.lighting.directional.intensity = THREE.MathUtils.lerp(
                    fromState.directionalIntensity, toState.directionalIntensity, easeProgress
                );
            }

            // Update precipitation
            this.updatePrecipitation(to, easeProgress);

            // Update skybox
            this.updateSkybox();

            if (progress < 1) {
                requestAnimationFrame(transition);
            } else {
                this.isTransitioning = false;
                this.finalizeWeatherTransition(to);
            }
        };

        transition();
    }

    updatePrecipitation(weatherType, intensity) {
        switch (weatherType) {
            case 'rain':
            case 'storm':
                if (this.effects.rain) {
                    this.effects.rain.visible = true;
                    this.effects.rain.material.opacity = 0.6 * intensity;
                }
                break;
            default:
                if (this.effects.rain) {
                    this.effects.rain.material.opacity = 0.6 * (1 - intensity);
                    if (intensity >= 1) {
                        this.effects.rain.visible = false;
                    }
                }
        }

        // Wind particles
        if (this.effects.windParticles) {
            const windIntensity = this.weatherStates[weatherType].windIntensity;
            this.effects.windParticles.visible = windIntensity > 0.5;
            this.effects.windParticles.material.opacity = windIntensity * 0.3;
        }
    }

    finalizeWeatherTransition(weatherType) {
        // Update street lights visibility
        const isNight = weatherType === 'night' || this.timeOfDay.current < 6 || this.timeOfDay.current > 20;

        this.lighting.streetLights.forEach(light => {
            if (light.children) {
                light.children.forEach(child => {
                    if (child.type === 'SpotLight') {
                        child.visible = isNight;
                        child.intensity = isNight ? 0.5 : 0;
                    }
                });
            }
        });

        // Update cloud colors
        this.updateCloudColors(weatherType);
    }

    updateCloudColors(weatherType) {
        const weather = this.weatherStates[weatherType];
        const cloudColor = new THREE.Color(weather.skyColor).multiplyScalar(1.2);

        this.effects.clouds.forEach(cloud => {
            cloud.children.forEach(sphere => {
                if (sphere.material) {
                    sphere.material.color = cloudColor;
                    sphere.material.opacity = weatherType === 'fog' ? 0.9 : 0.8;
                }
            });
        });
    }

    update(deltaTime) {
        this.updateTimeOfDay(deltaTime);
        this.updateWeatherEffects(deltaTime);
        this.updateLightning(deltaTime);
        this.updateClouds(deltaTime);
    }

    updateTimeOfDay(deltaTime) {
        if (!this.timeOfDay.enabled) return;

        this.timeOfDay.current += this.timeOfDay.speed * deltaTime;

        if (this.timeOfDay.current >= 24) {
            this.timeOfDay.current -= 24;
        }

        // Auto weather changes based on time
        this.checkTimeBasedWeatherChanges();

        // Update sun position
        this.updateSunPosition();
    }

    updateSunPosition() {
        if (!this.lighting.directional) return;

        const hour = this.timeOfDay.current;
        const sunAngle = (hour / 24) * Math.PI * 2 - Math.PI / 2; // -90° to 270°

        const sunX = Math.cos(sunAngle) * 200;
        const sunY = Math.sin(sunAngle) * 200;
        const sunZ = 50;

        this.lighting.directional.position.set(sunX, Math.max(sunY, -50), sunZ);

        // Adjust sun color based on time
        if (hour < 6 || hour > 20) {
            // Night - moon light
            this.lighting.directional.color.setHex(0x4444aa);
            this.lighting.directional.intensity = 0.1;
        } else if (hour < 8 || hour > 18) {
            // Dawn/dusk - orange light
            this.lighting.directional.color.setHex(0xffaa44);
            this.lighting.directional.intensity = 0.6;
        } else {
            // Day - white light
            this.lighting.directional.color.setHex(0xffffff);
            this.lighting.directional.intensity = 1.0;
        }
    }

    checkTimeBasedWeatherChanges() {
        // Automatic weather changes based on time
        if (Math.random() < 0.001) { // Small chance each frame
            const weatherOptions = ['clear', 'rain', 'fog'];
            const randomWeather = weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
            this.setWeather(randomWeather);
        }
    }

    updateWeatherEffects(deltaTime) {
        // Update rain animation
        if (this.effects.rain && this.effects.rain.visible) {
            const positions = this.effects.rain.geometry.attributes.position.array;
            const velocities = this.effects.rain.geometry.attributes.velocity.array;

            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += velocities[i] * deltaTime;
                positions[i + 1] += velocities[i + 1] * deltaTime;
                positions[i + 2] += velocities[i + 2] * deltaTime;

                // Reset raindrops that have fallen below ground
                if (positions[i + 1] < 0) {
                    positions[i] = (Math.random() - 0.5) * 2000;
                    positions[i + 1] = 200 + Math.random() * 300;
                    positions[i + 2] = (Math.random() - 0.5) * 2000;
                }
            }

            this.effects.rain.geometry.attributes.position.needsUpdate = true;
        }

        // Update wind particles
        if (this.effects.windParticles && this.effects.windParticles.visible) {
            const positions = this.effects.windParticles.geometry.attributes.position.array;
            const windSpeed = this.weatherStates[this.currentWeather].windIntensity * 50;

            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += windSpeed * deltaTime;

                if (positions[i] > 500) {
                    positions[i] = -500;
                }
            }

            this.effects.windParticles.geometry.attributes.position.needsUpdate = true;
        }
    }

    updateLightning(deltaTime) {
        if (this.currentWeather !== 'storm') return;

        const lightning = this.effects.lightning;
        const currentTime = Date.now();

        if (!lightning.active && currentTime - lightning.lastStrike > lightning.interval) {
            // Trigger lightning
            lightning.active = true;
            lightning.duration = 100 + Math.random() * 200; // 0.1-0.3 seconds
            lightning.intensity = 0.8 + Math.random() * 0.2;
            lightning.lastStrike = currentTime;
            lightning.interval = 3000 + Math.random() * 7000; // 3-10 seconds

            this.triggerLightningFlash(lightning.intensity);
        }

        if (lightning.active) {
            lightning.duration -= deltaTime * 1000;

            if (lightning.duration <= 0) {
                lightning.active = false;
                this.endLightningFlash();
            }
        }
    }

    triggerLightningFlash(intensity) {
        // Briefly brighten the scene
        if (this.lighting.ambient) {
            this.lighting.ambient.intensity = 1.0;
        }

        // Flash the sky color
        this.scene.background = new THREE.Color(0xffffff);

        // Play thunder sound
        this.playThunderSound();
    }

    endLightningFlash() {
        // Restore normal lighting
        const weather = this.weatherStates[this.currentWeather];

        if (this.lighting.ambient) {
            this.lighting.ambient.intensity = weather.ambientIntensity;
        }

        this.scene.background = new THREE.Color(weather.skyColor);
    }

    updateClouds(deltaTime) {
        const windSpeed = this.weatherStates[this.currentWeather].windIntensity * 5;

        this.effects.clouds.forEach(cloud => {
            cloud.position.x += windSpeed * deltaTime;

            // Reset clouds that have moved too far
            if (cloud.position.x > 1500) {
                cloud.position.x = -1500;
            }

            // Gentle rotation
            cloud.rotation.y += deltaTime * 0.1;
        });
    }

    updateWeatherDisplay() {
        const weatherStatus = document.getElementById('weatherStatus');
        if (weatherStatus) {
            const weatherNames = {
                clear: 'Clear Day ☀️',
                rain: 'Rainy 🌧️',
                fog: 'Foggy 🌫️',
                night: 'Night 🌙',
                storm: 'Storm ⛈️'
            };
            weatherStatus.textContent = weatherNames[this.currentWeather] || 'Unknown';
        }
    }

    playThunderSound() {
        // Generate thunder sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create thunder using noise and filtering
        const bufferSize = audioContext.sampleRate * 2; // 2 seconds
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate brown noise for thunder
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // Amplify

            // Add amplitude envelope
            const envelope = Math.exp(-i / (audioContext.sampleRate * 0.5));
            data[i] *= envelope;
        }

        const source = audioContext.createBufferSource();
        source.buffer = buffer;

        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 1;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.3;

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);

        source.start();
    }

    // Weather control methods
    setTimeOfDay(hour) {
        this.timeOfDay.current = Math.max(0, Math.min(24, hour));
        this.updateSunPosition();
    }

    setTimeSpeed(speed) {
        this.timeOfDay.speed = speed;
    }

    enableAutoWeather(enabled) {
        this.autoWeatherEnabled = enabled;
    }

    getWeatherState() {
        return {
            weather: this.currentWeather,
            timeOfDay: this.timeOfDay.current,
            state: this.weatherStates[this.currentWeather]
        };
    }

    // Seasonal weather patterns
    setSeasonalWeather(season) {
        const seasons = {
            spring: ['clear', 'rain'],
            summer: ['clear', 'storm'],
            autumn: ['fog', 'rain'],
            winter: ['fog', 'clear']
        };

        const seasonWeathers = seasons[season] || ['clear'];
        const randomWeather = seasonWeathers[Math.floor(Math.random() * seasonWeathers.length)];
        this.setWeather(randomWeather);
    }
}