// Standalone Car Simulator Game
// Combined all modules into one file for easy loading

class CarSimulator {
    constructor() {
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.world = null;
        this.vehicle = null;
        this.clock = new THREE.Clock();
        this.isLoaded = false;

        this.gameState = {
            money: 1000,
            fuel: 100,
            damage: 0,
            speed: 0,
            rpm: 800,
            gear: 1,
            maxGear: 6,
            cameraMode: 'tpp' // tpp or fpp
        };

        this.controls = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            brake: false,
            boost: false
        };

        this.weather = 'clear';
        this.shops = [];
        this.vehicles = [];
        this.buildings = [];
        this.roads = [];
    }

    async init() {
        try {
            this.updateLoadingProgress(10, "Initializing renderer...");
            await this.initRenderer();

            this.updateLoadingProgress(20, "Setting up scene...");
            await this.initScene();

            this.updateLoadingProgress(40, "Building world...");
            await this.buildWorld();

            this.updateLoadingProgress(60, "Creating vehicle...");
            await this.createVehicle();

            this.updateLoadingProgress(80, "Setting up controls...");
            this.setupEventListeners();

            this.updateLoadingProgress(100, "Ready to drive!");

            this.hideLoadingScreen();
            this.startGameLoop();

            this.isLoaded = true;
            console.log('Game initialized successfully');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.updateLoadingProgress(0, "Error loading game. Please refresh.");
        }
    }

    async initRenderer() {
        const canvas = document.getElementById('gameCanvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            powerPreference: "high-performance"
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.setClearColor(0x87CEEB);
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
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        this.scene.add(directionalLight);
    }

    async buildWorld() {
        this.createTerrain();
        this.createRoads();
        this.createBuildings();
        this.createShops();
        this.createTraffic();
        this.createTrees();
    }

    createTerrain() {
        const terrainSize = 2000;
        const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, 50, 50);

        // Create grass texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#2d5016';
        ctx.fillRect(0, 0, 512, 512);

        for (let i = 0; i < 1000; i++) {
            const alpha = Math.random() * 0.3;
            ctx.fillStyle = `rgba(${Math.random() * 100}, ${100 + Math.random() * 50}, ${Math.random() * 50}, ${alpha})`;
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
        }

        const terrainTexture = new THREE.CanvasTexture(canvas);
        terrainTexture.wrapS = terrainTexture.wrapT = THREE.RepeatWrapping;
        terrainTexture.repeat.set(10, 10);

        const material = new THREE.MeshLambertMaterial({ map: terrainTexture });
        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        this.scene.add(terrain);
    }

    createRoads() {
        const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });

        // Main roads
        const roads = [
            { start: [-800, 0], end: [800, 0], width: 20 },
            { start: [0, -800], end: [0, 800], width: 20 },
            { start: [-600, -600], end: [600, 600], width: 15 },
            { start: [-600, 600], end: [600, -600], width: 15 }
        ];

        roads.forEach(road => {
            const length = Math.sqrt(
                Math.pow(road.end[0] - road.start[0], 2) +
                Math.pow(road.end[1] - road.start[1], 2)
            );

            const geometry = new THREE.PlaneGeometry(length, road.width);
            const roadMesh = new THREE.Mesh(geometry, roadMaterial);

            roadMesh.position.set(
                (road.start[0] + road.end[0]) / 2,
                0.1,
                (road.start[1] + road.end[1]) / 2
            );
            roadMesh.rotation.x = -Math.PI / 2;
            roadMesh.rotation.z = Math.atan2(road.end[1] - road.start[1], road.end[0] - road.start[0]);
            roadMesh.receiveShadow = true;

            this.scene.add(roadMesh);
            this.roads.push(roadMesh);
        });
    }

    createBuildings() {
        const buildingColors = [0x8B4513, 0x696969, 0xF5F5DC, 0x2F4F4F];

        for (let i = 0; i < 20; i++) {
            const width = 20 + Math.random() * 30;
            const height = 30 + Math.random() * 60;
            const depth = 20 + Math.random() * 30;

            const geometry = new THREE.BoxGeometry(width, height, depth);
            const material = new THREE.MeshLambertMaterial({
                color: buildingColors[Math.floor(Math.random() * buildingColors.length)]
            });
            const building = new THREE.Mesh(geometry, material);

            building.position.set(
                (Math.random() - 0.5) * 1400,
                height / 2,
                (Math.random() - 0.5) * 1400
            );

            // Avoid placing on roads
            if (Math.abs(building.position.x) < 50 || Math.abs(building.position.z) < 50) {
                building.position.x += building.position.x > 0 ? 100 : -100;
                building.position.z += building.position.z > 0 ? 100 : -100;
            }

            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);
            this.buildings.push(building);
        }
    }

    createShops() {
        const shopTypes = [
            { type: 'gas', color: 0x00ff00, icon: '⛽', name: 'Gas Station' },
            { type: 'repair', color: 0xff8800, icon: '🔧', name: 'Auto Repair' },
            { type: 'paint', color: 0xff00ff, icon: '🎨', name: 'Paint Shop' },
            { type: 'tuning', color: 0x00ffff, icon: '⚡', name: 'Tuning Shop' }
        ];

        shopTypes.forEach((shopType, index) => {
            const shop = new THREE.Group();

            // Building
            const buildingGeometry = new THREE.BoxGeometry(40, 15, 30);
            const buildingMaterial = new THREE.MeshLambertMaterial({ color: shopType.color });
            const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
            building.position.y = 7.5;
            building.castShadow = true;
            shop.add(building);

            // Sign
            const signGeometry = new THREE.PlaneGeometry(20, 5);
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 400, 100);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${shopType.icon} ${shopType.name}`, 200, 50);

            const signTexture = new THREE.CanvasTexture(canvas);
            const signMaterial = new THREE.MeshBasicMaterial({ map: signTexture });
            const sign = new THREE.Mesh(signGeometry, signMaterial);
            sign.position.set(0, 20, 16);
            shop.add(sign);

            // Position shops
            const angle = (index / shopTypes.length) * Math.PI * 2;
            const distance = 300;
            shop.position.set(
                Math.cos(angle) * distance,
                0,
                Math.sin(angle) * distance
            );

            this.scene.add(shop);
            this.shops.push({
                mesh: shop,
                type: shopType.type,
                position: shop.position.clone()
            });
        });
    }

    createTraffic() {
        const vehicleColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0x000000, 0xffffff];

        for (let i = 0; i < 10; i++) {
            const vehicle = this.createTrafficVehicle(
                vehicleColors[Math.floor(Math.random() * vehicleColors.length)]
            );

            vehicle.position.set(
                (Math.random() - 0.5) * 1000,
                2,
                (Math.random() - 0.5) * 1000
            );

            this.scene.add(vehicle);
            this.vehicles.push({
                mesh: vehicle,
                speed: 0.5 + Math.random() * 1.5,
                direction: Math.random() * Math.PI * 2
            });
        }
    }

    createTrafficVehicle(color) {
        const vehicle = new THREE.Group();

        // Body
        const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 7);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        body.castShadow = true;
        vehicle.add(body);

        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 12);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

        const wheelPositions = [
            [-1.8, 0.8, 2.5], [1.8, 0.8, 2.5],
            [-1.8, 0.8, -2.5], [1.8, 0.8, -2.5]
        ];

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos[0], pos[1], pos[2]);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            vehicle.add(wheel);
        });

        return vehicle;
    }

    createTrees() {
        for (let i = 0; i < 50; i++) {
            const tree = new THREE.Group();

            // Trunk
            const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 6, 8);
            const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = 3;
            trunk.castShadow = true;
            tree.add(trunk);

            // Leaves
            const leavesGeometry = new THREE.SphereGeometry(3, 12, 8);
            const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.y = 7;
            leaves.castShadow = true;
            tree.add(leaves);

            // Position randomly but away from roads
            let validPosition = false;
            let attempts = 0;
            while (!validPosition && attempts < 20) {
                tree.position.set(
                    (Math.random() - 0.5) * 1800,
                    0,
                    (Math.random() - 0.5) * 1800
                );

                if (Math.abs(tree.position.x) > 60 && Math.abs(tree.position.z) > 60) {
                    validPosition = true;
                }
                attempts++;
            }

            this.scene.add(tree);
        }
    }

    async createVehicle() {
        this.vehicle = new THREE.Group();

        // Car body
        const bodyGeometry = new THREE.BoxGeometry(4.5, 1.8, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        body.castShadow = true;
        this.vehicle.add(body);

        // Car roof
        const roofGeometry = new THREE.BoxGeometry(4, 1.2, 4.5);
        const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
        roof.position.set(0, 2.2, -0.5);
        roof.castShadow = true;
        this.vehicle.add(roof);

        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.5, 16);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

        this.wheels = [];
        const wheelPositions = [
            [-2, 0.5, 2.8], [2, 0.5, 2.8],
            [-2, 0.5, -2.8], [2, 0.5, -2.8]
        ];

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos[0], pos[1], pos[2]);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            this.vehicle.add(wheel);
            this.wheels.push(wheel);
        });

        // Headlights
        const headlightGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffaa });

        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(-1.5, 1.2, 4);
        this.vehicle.add(leftHeadlight);

        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(1.5, 1.2, 4);
        this.vehicle.add(rightHeadlight);

        this.vehicle.position.set(0, 2, 0);
        this.scene.add(this.vehicle);

        // Vehicle physics properties
        this.vehiclePhysics = {
            speed: 0,
            maxSpeed: 8,
            acceleration: 0.2,
            friction: 0.95,
            turnSpeed: 0.05,
            steering: 0
        };
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));

        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Weather control
        document.getElementById('weatherSelect').addEventListener('change', (e) => {
            this.setWeather(e.target.value);
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
        this.gameState.cameraMode = this.gameState.cameraMode === 'tpp' ? 'fpp' : 'tpp';

        const mirrorControls = document.getElementById('mirrorControls');
        const seatControls = document.getElementById('seatControls');

        if (this.gameState.cameraMode === 'fpp') {
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
        }
    }

    shiftGearDown() {
        if (this.gameState.gear > 1) {
            this.gameState.gear--;
        }
    }

    checkShopProximity() {
        const vehiclePos = this.vehicle.position;

        this.shops.forEach(shop => {
            const distance = vehiclePos.distanceTo(shop.position);
            if (distance < 20) {
                this.openShop(shop);
            }
        });
    }

    openShop(shop) {
        document.getElementById('shopInterface').classList.add('active');
        document.getElementById('shopTitle').textContent = `${shop.type.charAt(0).toUpperCase() + shop.type.slice(1)} Shop`;
    }

    setWeather(weather) {
        this.weather = weather;

        switch (weather) {
            case 'clear':
                this.scene.background = new THREE.Color(0x87CEEB);
                this.scene.fog.color = new THREE.Color(0x87CEEB);
                this.scene.fog.near = 100;
                this.scene.fog.far = 1000;
                break;
            case 'rain':
                this.scene.background = new THREE.Color(0x555555);
                this.scene.fog.color = new THREE.Color(0x666666);
                this.scene.fog.near = 50;
                this.scene.fog.far = 400;
                break;
            case 'fog':
                this.scene.background = new THREE.Color(0xcccccc);
                this.scene.fog.color = new THREE.Color(0xcccccc);
                this.scene.fog.near = 20;
                this.scene.fog.far = 200;
                break;
            case 'night':
                this.scene.background = new THREE.Color(0x000033);
                this.scene.fog.color = new THREE.Color(0x000044);
                this.scene.fog.near = 100;
                this.scene.fog.far = 600;
                break;
        }

        document.getElementById('weatherStatus').textContent = weather.charAt(0).toUpperCase() + weather.slice(1);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateLoadingProgress(percent, text) {
        const progressFill = document.getElementById('progressFill');
        const loadingText = document.getElementById('loadingText');
        const loadingDetails = document.getElementById('loadingDetails');

        if (progressFill) progressFill.style.width = percent + '%';
        if (loadingText) loadingText.textContent = text;
        if (loadingDetails) loadingDetails.textContent = `Loading: ${percent}%`;
    }

    hideLoadingScreen() {
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('gameContainer').style.display = 'block';
            document.getElementById('gameHUD').style.display = 'block';
        }, 500);
    }

    update() {
        if (!this.isLoaded) return;

        const deltaTime = this.clock.getDelta();

        this.updateVehicle(deltaTime);
        this.updateCamera();
        this.updateTraffic();
        this.updateUI();
    }

    updateVehicle(deltaTime) {
        if (!this.vehicle) return;

        const physics = this.vehiclePhysics;

        // Handle input
        if (this.controls.forward) {
            physics.speed = Math.min(physics.speed + physics.acceleration, physics.maxSpeed);
        } else if (this.controls.backward) {
            physics.speed = Math.max(physics.speed - physics.acceleration, -physics.maxSpeed / 2);
        } else {
            physics.speed *= physics.friction;
        }

        // Boost
        if (this.controls.boost) {
            physics.speed *= 1.5;
        }

        // Steering
        if (this.controls.left && Math.abs(physics.speed) > 0.5) {
            physics.steering = Math.min(physics.steering + 0.03, 1);
        } else if (this.controls.right && Math.abs(physics.speed) > 0.5) {
            physics.steering = Math.max(physics.steering - 0.03, -1);
        } else {
            physics.steering *= 0.9;
        }

        // Braking
        if (this.controls.brake) {
            physics.speed *= 0.9;
        }

        // Apply movement
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.vehicle.quaternion);

        this.vehicle.position.add(forward.multiplyScalar(physics.speed));
        this.vehicle.rotation.y += physics.steering * physics.turnSpeed * (physics.speed / physics.maxSpeed);

        // Update game state
        this.gameState.speed = Math.abs(physics.speed) * 15; // Convert to km/h
        this.gameState.rpm = 800 + (Math.abs(physics.speed) / physics.maxSpeed) * (5000 / this.gameState.gear);

        // Consume fuel
        const fuelConsumption = (Math.abs(physics.speed) * 0.001 + 0.0005) * (this.controls.boost ? 2 : 1);
        this.gameState.fuel = Math.max(this.gameState.fuel - fuelConsumption, 0);

        // Wheel rotation
        if (this.wheels) {
            this.wheels.forEach(wheel => {
                wheel.rotation.x += physics.speed * 0.2;
            });
        }
    }

    updateCamera() {
        if (!this.vehicle) return;

        const vehiclePos = this.vehicle.position;
        const vehicleRotation = this.vehicle.rotation;

        if (this.gameState.cameraMode === 'fpp') {
            // First person view
            const offset = new THREE.Vector3(-0.8, 2.2, 1.5);
            offset.applyEuler(vehicleRotation);

            this.camera.position.copy(vehiclePos).add(offset);
            this.camera.rotation.copy(vehicleRotation);
        } else {
            // Third person view
            const offset = new THREE.Vector3(0, 5, 15);
            offset.applyEuler(vehicleRotation);

            this.camera.position.copy(vehiclePos).add(offset);
            this.camera.lookAt(vehiclePos);
        }
    }

    updateTraffic() {
        this.vehicles.forEach(vehicle => {
            vehicle.mesh.position.x += Math.cos(vehicle.direction) * vehicle.speed;
            vehicle.mesh.position.z += Math.sin(vehicle.direction) * vehicle.speed;

            // Random direction changes
            if (Math.random() < 0.01) {
                vehicle.direction += (Math.random() - 0.5) * 0.3;
            }

            // Keep within bounds
            if (Math.abs(vehicle.mesh.position.x) > 900) {
                vehicle.direction = Math.PI - vehicle.direction;
            }
            if (Math.abs(vehicle.mesh.position.z) > 900) {
                vehicle.direction = -vehicle.direction;
            }

            vehicle.mesh.rotation.y = vehicle.direction;
        });
    }

    updateUI() {
        // Update HUD elements
        document.getElementById('speedValue').textContent = Math.round(this.gameState.speed);
        document.getElementById('rpmValue').textContent = Math.round(this.gameState.rpm);
        document.getElementById('gearValue').textContent = this.gameState.gear;
        document.getElementById('playerMoney').textContent = this.gameState.money;

        // Update fuel gauge
        const fuelLevel = document.getElementById('fuelLevel');
        if (fuelLevel) {
            fuelLevel.style.height = this.gameState.fuel + '%';
        }

        // Update minimap
        this.updateMinimap();
    }

    updateMinimap() {
        const canvas = document.getElementById('minimapCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Clear minimap
        ctx.fillStyle = '#2c5234';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw roads
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();

        // Draw player
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw shops
        ctx.fillStyle = '#00ff00';
        this.shops.forEach(shop => {
            const x = (shop.position.x / 2000) * canvas.width + canvas.width / 2;
            const y = (shop.position.z / 2000) * canvas.height + canvas.height / 2;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    render() {
        if (!this.isLoaded) return;
        this.renderer.render(this.scene, this.camera);
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
window.refuelCar = () => {
    if (game.gameState.money >= 50) {
        game.gameState.money -= 50;
        game.gameState.fuel = 100;
        showNotification('Refueled!');
    } else {
        showNotification('Not enough money!');
    }
};

window.repairCar = () => {
    if (game.gameState.money >= 100) {
        game.gameState.money -= 100;
        game.gameState.damage = 0;
        showNotification('Car repaired!');
    } else {
        showNotification('Not enough money!');
    }
};

window.paintCar = () => {
    if (game.gameState.money >= 200) {
        game.gameState.money -= 200;
        showNotification('New paint job applied!');
    } else {
        showNotification('Not enough money!');
    }
};

window.upgradeEngine = () => {
    if (game.gameState.money >= 500) {
        game.gameState.money -= 500;
        showNotification('Engine upgraded!');
    } else {
        showNotification('Not enough money!');
    }
};

window.upgradeTires = () => {
    if (game.gameState.money >= 300) {
        game.gameState.money -= 300;
        showNotification('Tires upgraded!');
    } else {
        showNotification('Not enough money!');
    }
};

window.exitShop = () => {
    document.getElementById('shopInterface').classList.remove('active');
};

window.resetMirrors = () => {
    document.getElementById('leftMirrorH').value = 0;
    document.getElementById('leftMirrorV').value = 0;
    document.getElementById('rearMirrorH').value = 0;
    document.getElementById('rearMirrorV').value = 0;
    document.getElementById('rightMirrorH').value = 0;
    document.getElementById('rightMirrorV').value = 0;
};

window.resetSeat = () => {
    document.getElementById('seatHeight').value = 0;
    document.getElementById('seatDistance').value = 0;
};

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(46, 204, 113, 0.9);
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        font-size: 14px;
        z-index: 1000;
        transition: opacity 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// Initialize game when page loads
let game;
window.addEventListener('load', () => {
    game = new CarSimulator();
    game.init();
});