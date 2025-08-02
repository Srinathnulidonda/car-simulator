import { WorldBuilder } from './world.js';
import { Vehicle } from './vehicle.js';
import { CameraSystem } from './camera.js';
import { MirrorSystem } from './mirrors.js';
import { AudioSystem } from './audio.js';
import { ShopSystem } from './shops.js';
import { WeatherSystem } from './weather.js';
import { UISystem } from './ui.js';
import { PhysicsSystem } from './physics.js';

class CarSimulator {
    constructor() {
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.world = null;
        this.vehicle = null;
        this.cameraSystem = null;
        this.mirrors = null;
        this.audio = null;
        this.shops = null;
        this.weather = null;
        this.ui = null;
        this.physics = null;

        this.clock = new THREE.Clock();
        this.isLoaded = false;
        this.gameState = {
            money: 1000,
            fuel: 100,
            damage: 0,
            speed: 0,
            rpm: 800,
            gear: 1,
            maxGear: 6
        };

        this.controls = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            brake: false,
            boost: false
        };
    }

    async init() {
        try {
            this.updateLoadingProgress(10, "Initializing renderer...");
            await this.initRenderer();

            this.updateLoadingProgress(20, "Setting up scene...");
            await this.initScene();

            this.updateLoadingProgress(30, "Loading physics...");
            this.physics = new PhysicsSystem();
            await this.physics.init();

            this.updateLoadingProgress(40, "Building world...");
            this.world = new WorldBuilder(this.scene, this.physics.world);
            await this.world.build();

            this.updateLoadingProgress(50, "Creating vehicle...");
            this.vehicle = new Vehicle(this.scene, this.physics.world);
            await this.vehicle.load();

            this.updateLoadingProgress(60, "Setting up cameras...");
            this.cameraSystem = new CameraSystem(this.camera, this.vehicle);

            this.updateLoadingProgress(70, "Initializing mirrors...");
            this.mirrors = new MirrorSystem(this.scene, this.renderer, this.vehicle);

            this.updateLoadingProgress(80, "Loading audio...");
            this.audio = new AudioSystem();
            await this.audio.init();

            this.updateLoadingProgress(85, "Setting up shops...");
            this.shops = new ShopSystem(this.world.shops, this.gameState);

            this.updateLoadingProgress(90, "Initializing weather...");
            this.weather = new WeatherSystem(this.scene);

            this.updateLoadingProgress(95, "Setting up UI...");
            this.ui = new UISystem(this.gameState);

            this.updateLoadingProgress(100, "Ready to drive!");

            this.setupEventListeners();
            this.hideLoadingScreen();
            this.startGameLoop();

            this.isLoaded = true;
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.updateLoadingProgress(0, "Error loading game. Please refresh.");
        }
    }

    async initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('gameCanvas'),
            antialias: true,
            powerPreference: "high-performance"
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
    }

    async initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 1000);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        this.camera.position.set(0, 5, 10);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));

        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Weather control
        document.getElementById('weatherSelect').addEventListener('change', (e) => {
            this.weather.setWeather(e.target.value);
        });

        // Mirror controls
        this.setupMirrorControls();

        // Seat controls
        this.setupSeatControls();
    }

    setupMirrorControls() {
        const controls = ['leftMirrorH', 'leftMirrorV', 'rearMirrorH', 'rearMirrorV', 'rightMirrorH', 'rightMirrorV'];
        controls.forEach(controlId => {
            document.getElementById(controlId).addEventListener('input', (e) => {
                if (this.mirrors) {
                    this.mirrors.adjustMirror(controlId, parseFloat(e.target.value));
                }
            });
        });
    }

    setupSeatControls() {
        document.getElementById('seatHeight').addEventListener('input', (e) => {
            this.cameraSystem.adjustSeat('height', parseFloat(e.target.value));
        });

        document.getElementById('seatDistance').addEventListener('input', (e) => {
            this.cameraSystem.adjustSeat('distance', parseFloat(e.target.value));
        });
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.controls.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.controls.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.controls.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.controls.right = true;
                break;
            case 'Space':
                this.controls.brake = true;
                event.preventDefault();
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.controls.boost = true;
                break;
            case 'KeyC':
                this.toggleCameraMode();
                break;
            case 'KeyG':
                this.shiftGearUp();
                break;
            case 'KeyB':
                this.shiftGearDown();
                break;
            case 'KeyF':
                this.checkShopProximity();
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.controls.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.controls.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.controls.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.controls.right = false;
                break;
            case 'Space':
                this.controls.brake = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.controls.boost = false;
                break;
        }
    }

    toggleCameraMode() {
        this.cameraSystem.toggleMode();

        // Show/hide FPP-specific controls
        const mirrorControls = document.getElementById('mirrorControls');
        const seatControls = document.getElementById('seatControls');

        if (this.cameraSystem.mode === 'fpp') {
            mirrorControls.classList.add('active');
            seatControls.classList.add('active');
        } else {
            mirrorControls.classList.remove('active');
            seatControls.classList.remove('active');
        }
    }

    shiftGearUp() {
        if (this.gameState.gear < this.gameState.maxGear) {
            this.gameState.gear++;
            this.audio.playShiftSound();
        }
    }

    shiftGearDown() {
        if (this.gameState.gear > 1) {
            this.gameState.gear--;
            this.audio.playShiftSound();
        }
    }

    checkShopProximity() {
        const nearbyShop = this.shops.checkProximity(this.vehicle.position);
        if (nearbyShop) {
            this.shops.openShop(nearbyShop);
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateLoadingProgress(percent, text) {
        const progressFill = document.getElementById('progressFill');
        const loadingText = document.getElementById('loadingText');

        if (progressFill) progressFill.style.width = percent + '%';
        if (loadingText) loadingText.textContent = text;
    }

    hideLoadingScreen() {
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
        }, 500);
    }

    update() {
        if (!this.isLoaded) return;

        const deltaTime = this.clock.getDelta();

        // Update physics
        this.physics.update(deltaTime);

        // Update vehicle
        this.vehicle.update(this.controls, deltaTime);

        // Update game state
        this.updateGameState();

        // Update systems
        this.cameraSystem.update(deltaTime);
        this.mirrors.update();
        this.audio.update(this.gameState.speed, this.weather.currentWeather);
        this.weather.update(deltaTime);
        this.ui.update(this.gameState);

        // Update shops
        this.shops.update(this.vehicle.position);
    }

    updateGameState() {
        // Update speed and RPM based on vehicle
        this.gameState.speed = this.vehicle.getSpeed();
        this.gameState.rpm = this.vehicle.getRPM(this.gameState.gear);

        // Consume fuel
        const fuelConsumption = (Math.abs(this.gameState.speed) * 0.001 + 0.0005) * (this.controls.boost ? 2 : 1);
        this.gameState.fuel = Math.max(this.gameState.fuel - fuelConsumption, 0);

        // Check fuel empty
        if (this.gameState.fuel <= 0) {
            this.vehicle.setMaxSpeed(0);
        } else {
            this.vehicle.setMaxSpeed(this.gameState.gear * 20);
        }
    }

    render() {
        if (!this.isLoaded) return;

        // Render main scene
        this.renderer.render(this.scene, this.camera);

        // Render mirrors (if in FPP mode)
        if (this.cameraSystem.mode === 'fpp') {
            this.mirrors.render();
        }
    }

    startGameLoop() {
        const gameLoop = () => {
            this.update();
            this.render();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }
}

// Global functions for shop interface
window.refuelCar = () => game.shops.refuel();
window.repairCar = () => game.shops.repair();
window.paintCar = () => game.shops.paint();
window.upgradeEngine = () => game.shops.upgradeEngine();
window.upgradeTires = () => game.shops.upgradeTires();
window.exitShop = () => game.shops.closeShop();

// Global functions for mirror/seat reset
window.resetMirrors = () => game.mirrors.resetAll();
window.resetSeat = () => game.cameraSystem.resetSeat();

// Initialize game
const game = new CarSimulator();
game.init();