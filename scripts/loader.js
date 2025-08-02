export class AssetLoader {
    constructor() {
        this.loadingManager = new THREE.LoadingManager();
        this.textureLoader = new THREE.TextureLoader(this.loadingManager);
        this.gltfLoader = new THREE.GLTFLoader(this.loadingManager);
        this.audioLoader = new THREE.AudioLoader(this.loadingManager);
        this.cubeTextureLoader = new THREE.CubeTextureLoader(this.loadingManager);

        this.assets = {
            textures: {},
            models: {},
            audio: {},
            materials: {}
        };

        this.loadingProgress = 0;
        this.totalAssets = 0;
        this.loadedAssets = 0;

        this.setupLoadingManager();
    }

    setupLoadingManager() {
        this.loadingManager.onLoad = () => {
            console.log('All assets loaded successfully');
            this.onLoadComplete?.();
        };

        this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            this.loadedAssets = itemsLoaded;
            this.totalAssets = itemsTotal;
            this.loadingProgress = (itemsLoaded / itemsTotal) * 100;

            console.log(`Loading progress: ${this.loadingProgress.toFixed(1)}% (${itemsLoaded}/${itemsTotal})`);
            this.onProgress?.(this.loadingProgress, url);
        };

        this.loadingManager.onError = (url) => {
            console.error(`Failed to load: ${url}`);
            this.onError?.(url);
        };
    }

    async loadAssets() {
        try {
            // Load all asset categories
            await Promise.all([
                this.loadTextures(),
                this.loadModels(),
                this.loadAudio(),
                this.createMaterials()
            ]);

            console.log('Asset loading completed');
            return this.assets;
        } catch (error) {
            console.error('Asset loading failed:', error);
            throw error;
        }
    }

    async loadTextures() {
        const textureAssets = {
            // Terrain textures
            grass: 'assets/textures/terrain/grass.jpg',
            dirt: 'assets/textures/terrain/dirt.jpg',
            sand: 'assets/textures/terrain/sand.jpg',

            // Road textures
            asphalt: 'assets/textures/asphalt/road_asphalt.jpg',
            asphaltNormal: 'assets/textures/asphalt/road_asphalt_normal.jpg',
            roadMarkings: 'assets/textures/asphalt/road_markings.png',

            // Building textures
            brick: 'assets/textures/building/brick_wall.jpg',
            concrete: 'assets/textures/building/concrete.jpg',
            glass: 'assets/textures/building/glass.jpg',
            metal: 'assets/textures/building/metal.jpg',

            // Car textures
            carPaint: 'assets/textures/car/car_paint.jpg',
            carInterior: 'assets/textures/car/interior.jpg',
            tire: 'assets/textures/car/tire.jpg',
            chrome: 'assets/textures/car/chrome.jpg',

            // Environmental textures
            skybox: [
                'assets/textures/skybox/px.jpg',
                'assets/textures/skybox/nx.jpg',
                'assets/textures/skybox/py.jpg',
                'assets/textures/skybox/ny.jpg',
                'assets/textures/skybox/pz.jpg',
                'assets/textures/skybox/nz.jpg'
            ],

            // UI textures
            speedometerBg: 'assets/textures/ui/speedometer.png',
            minimapBorder: 'assets/textures/ui/minimap_border.png',

            // Mirror effects
            mirrorFog: 'assets/textures/mirror/fog_overlay.png',
            rainDrops: 'assets/textures/mirror/rain_drops.png'
        };

        const loadPromises = Object.entries(textureAssets).map(([key, path]) => {
            return new Promise((resolve, reject) => {
                if (Array.isArray(path)) {
                    // Cube texture
                    this.cubeTextureLoader.load(path, (texture) => {
                        this.assets.textures[key] = texture;
                        resolve(texture);
                    }, undefined, reject);
                } else {
                    // Regular texture
                    this.textureLoader.load(path, (texture) => {
                        // Configure texture properties
                        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                        texture.minFilter = THREE.LinearMipmapLinearFilter;
                        texture.magFilter = THREE.LinearFilter;
                        texture.generateMipmaps = true;

                        this.assets.textures[key] = texture;
                        resolve(texture);
                    }, undefined, (error) => {
                        // Create fallback procedural texture if loading fails
                        console.warn(`Texture ${path} not found, creating procedural texture`);
                        const fallbackTexture = this.createFallbackTexture(key);
                        this.assets.textures[key] = fallbackTexture;
                        resolve(fallbackTexture);
                    });
                }
            });
        });

        await Promise.all(loadPromises);
        console.log('Textures loaded:', Object.keys(this.assets.textures));
    }

    createFallbackTexture(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        switch (type) {
            case 'grass':
                this.drawGrassTexture(ctx, canvas.width, canvas.height);
                break;
            case 'asphalt':
                this.drawAsphaltTexture(ctx, canvas.width, canvas.height);
                break;
            case 'brick':
                this.drawBrickTexture(ctx, canvas.width, canvas.height);
                break;
            case 'concrete':
                this.drawConcreteTexture(ctx, canvas.width, canvas.height);
                break;
            default:
                this.drawDefaultTexture(ctx, canvas.width, canvas.height);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    drawGrassTexture(ctx, width, height) {
        // Base grass color
        ctx.fillStyle = '#2d5016';
        ctx.fillRect(0, 0, width, height);

        // Add grass blade details
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const shade = Math.random() * 0.3;
            ctx.fillStyle = `rgba(${45 + shade * 100}, ${80 + shade * 50}, ${22 + shade * 30}, 0.8)`;
            ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 3);
        }
    }

    drawAsphaltTexture(ctx, width, height) {
        // Base asphalt color
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, width, height);

        // Add asphalt grain
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const brightness = Math.random() * 40;
            ctx.fillStyle = `rgb(${42 + brightness}, ${42 + brightness}, ${42 + brightness})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    drawBrickTexture(ctx, width, height) {
        const brickWidth = 64;
        const brickHeight = 32;

        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 0, width, height);

        // Draw brick pattern
        for (let y = 0; y < height; y += brickHeight) {
            for (let x = 0; x < width; x += brickWidth) {
                const offset = (Math.floor(y / brickHeight) % 2) * (brickWidth / 2);
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + offset, y, brickWidth, brickHeight);
            }
        }
    }

    drawConcreteTexture(ctx, width, height) {
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, width, height);

        // Add concrete texture
        for (let i = 0; i < 1500; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 3;
            const brightness = Math.random() * 60;
            ctx.fillStyle = `rgb(${128 + brightness}, ${128 + brightness}, ${128 + brightness})`;
            ctx.fillRect(x, y, size, size);
        }
    }

    drawDefaultTexture(ctx, width, height) {
        // Checkerboard pattern
        const squareSize = 32;
        for (let x = 0; x < width; x += squareSize) {
            for (let y = 0; y < height; y += squareSize) {
                const isEven = (Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2;
                ctx.fillStyle = isEven ? '#ffffff' : '#cccccc';
                ctx.fillRect(x, y, squareSize, squareSize);
            }
        }
    }

    async loadModels() {
        const modelAssets = {
            // Vehicle models
            sedan: 'assets/models/car/sedan.glb',
            suv: 'assets/models/car/suv.glb',
            sports: 'assets/models/car/sports.glb',
            truck: 'assets/models/car/truck.glb',

            // Environment models
            gasStation: 'assets/models/world/gas_station.glb',
            repairShop: 'assets/models/world/repair_shop.glb',
            paintShop: 'assets/models/world/paint_shop.glb',
            tuningShop: 'assets/models/world/tuning_shop.glb',

            // Props
            streetLight: 'assets/models/props/street_light.glb',
            trafficSign: 'assets/models/props/traffic_sign.glb',
            tree: 'assets/models/props/tree.glb',
            building: 'assets/models/props/building.glb'
        };

        const loadPromises = Object.entries(modelAssets).map(([key, path]) => {
            return new Promise((resolve, reject) => {
                this.gltfLoader.load(path, (gltf) => {
                    this.assets.models[key] = gltf;
                    resolve(gltf);
                }, undefined, (error) => {
                    console.warn(`Model ${path} not found, creating fallback`);
                    const fallbackModel = this.createFallbackModel(key);
                    this.assets.models[key] = fallbackModel;
                    resolve(fallbackModel);
                });
            });
        });

        await Promise.all(loadPromises);
        console.log('Models loaded:', Object.keys(this.assets.models));
    }

    createFallbackModel(type) {
        const group = new THREE.Group();

        switch (type) {
            case 'sedan':
                group.add(this.createFallbackCar());
                break;
            case 'gasStation':
                group.add(this.createFallbackBuilding('#00ff00'));
                break;
            case 'streetLight':
                group.add(this.createFallbackStreetLight());
                break;
            case 'tree':
                group.add(this.createFallbackTree());
                break;
            default:
                group.add(this.createFallbackBox());
        }

        return { scene: group };
    }

    createFallbackCar() {
        const car = new THREE.Group();

        // Car body
        const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        car.add(body);

        // Car roof
        const roofGeometry = new THREE.BoxGeometry(3.5, 1, 4);
        const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
        roof.position.y = 2;
        car.add(roof);

        return car;
    }

    createFallbackBuilding(color = '#888888') {
        const buildingGeometry = new THREE.BoxGeometry(20, 15, 20);
        const buildingMaterial = new THREE.MeshLambertMaterial({ color: color });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.y = 7.5;
        return building;
    }

    createFallbackStreetLight() {
        const light = new THREE.Group();

        const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 8, 8);
        const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 4;
        light.add(pole);

        const lightGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffaa });
        const lightBulb = new THREE.Mesh(lightGeometry, lightMaterial);
        lightBulb.position.y = 8;
        light.add(lightBulb);

        return light;
    }

    createFallbackTree() {
        const tree = new THREE.Group();

        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 4, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2;
        tree.add(trunk);

        const leavesGeometry = new THREE.SphereGeometry(2.5, 8, 8);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 5;
        tree.add(leaves);

        return tree;
    }

    createFallbackBox() {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshLambertMaterial({ color: 0xff00ff });
        return new THREE.Mesh(geometry, material);
    }

    async loadAudio() {
        const audioAssets = {
            // Engine sounds
            engineIdle: 'assets/audio/engine/idle.mp3',
            engineRev: 'assets/audio/engine/rev.mp3',
            engineHigh: 'assets/audio/engine/high_speed.mp3',

            // Ambient sounds
            rain: 'assets/audio/ambient/rain.mp3',
            wind: 'assets/audio/ambient/wind.mp3',
            traffic: 'assets/audio/ambient/traffic.mp3',

            // Sound effects
            gearShift: 'assets/audio/sfx/gear_shift.mp3',
            brake: 'assets/audio/sfx/brake.mp3',
            horn: 'assets/audio/sfx/horn.mp3',
            door: 'assets/audio/sfx/door.mp3',
            cashRegister: 'assets/audio/sfx/cash_register.mp3',

            // UI sounds
            click: 'assets/audio/ui/click.mp3',
            notification: 'assets/audio/ui/notification.mp3',
            error: 'assets/audio/ui/error.mp3'
        };

        const loadPromises = Object.entries(audioAssets).map(([key, path]) => {
            return new Promise((resolve) => {
                this.audioLoader.load(path, (buffer) => {
                    this.assets.audio[key] = buffer;
                    resolve(buffer);
                }, undefined, (error) => {
                    console.warn(`Audio ${path} not found, will use procedural audio`);
                    this.assets.audio[key] = null;
                    resolve(null);
                });
            });
        });

        await Promise.all(loadPromises);
        console.log('Audio loaded:', Object.keys(this.assets.audio));
    }

    async createMaterials() {
        // Create reusable materials using loaded textures
        this.assets.materials = {
            grass: new THREE.MeshLambertMaterial({
                map: this.assets.textures.grass,
                name: 'grassMaterial'
            }),

            asphalt: new THREE.MeshLambertMaterial({
                map: this.assets.textures.asphalt,
                normalMap: this.assets.textures.asphaltNormal,
                name: 'asphaltMaterial'
            }),

            brick: new THREE.MeshLambertMaterial({
                map: this.assets.textures.brick,
                name: 'brickMaterial'
            }),

            concrete: new THREE.MeshLambertMaterial({
                map: this.assets.textures.concrete,
                name: 'concreteMaterial'
            }),

            carPaint: new THREE.MeshPhongMaterial({
                map: this.assets.textures.carPaint,
                shininess: 100,
                name: 'carPaintMaterial'
            }),

            chrome: new THREE.MeshPhongMaterial({
                map: this.assets.textures.chrome,
                shininess: 200,
                reflectivity: 0.8,
                name: 'chromeMaterial'
            }),

            glass: new THREE.MeshPhongMaterial({
                map: this.assets.textures.glass,
                transparent: true,
                opacity: 0.7,
                name: 'glassMaterial'
            }),

            tire: new THREE.MeshLambertMaterial({
                map: this.assets.textures.tire,
                name: 'tireMaterial'
            })
        };

        console.log('Materials created:', Object.keys(this.assets.materials));
    }

    getAsset(category, name) {
        return this.assets[category]?.[name] || null;
    }

    getTexture(name) {
        return this.getAsset('textures', name);
    }

    getModel(name) {
        return this.getAsset('models', name);
    }

    getMaterial(name) {
        return this.getAsset('materials', name);
    }

    getAudio(name) {
        return this.getAsset('audio', name);
    }

    // Event handlers (can be overridden)
    onProgress = null;
    onLoadComplete = null;
    onError = null;

    // Utility methods
    preloadTexture(url) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(url, resolve, undefined, reject);
        });
    }

    preloadModel(url) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(url, resolve, undefined, reject);
        });
    }

    preloadAudio(url) {
        return new Promise((resolve, reject) => {
            this.audioLoader.load(url, resolve, undefined, reject);
        });
    }

    // Memory management
    disposeAsset(category, name) {
        const asset = this.getAsset(category, name);
        if (!asset) return;

        if (category === 'textures' && asset.dispose) {
            asset.dispose();
        } else if (category === 'materials' && asset.dispose) {
            asset.dispose();
        } else if (category === 'models' && asset.scene) {
            asset.scene.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }

        delete this.assets[category][name];
    }

    disposeAll() {
        Object.keys(this.assets).forEach(category => {
            Object.keys(this.assets[category]).forEach(name => {
                this.disposeAsset(category, name);
            });
        });

        this.assets = {
            textures: {},
            models: {},
            audio: {},
            materials: {}
        };
    }
}