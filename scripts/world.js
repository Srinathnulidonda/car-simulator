export class WorldBuilder {
    constructor(scene, physicsWorld) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.shops = [];
        this.roads = [];
        this.buildings = [];
        this.props = [];
    }

    async build() {
        this.createTerrain();
        this.createRoads();
        this.createBuildings();
        this.createShops();
        this.createProps();
        this.createTraffic();
    }

    createTerrain() {
        // Large terrain with height variations
        const terrainSize = 2000;
        const terrainSegments = 200;

        const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);

        // Create height map
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];

            // Generate natural terrain height
            const distance = Math.sqrt(x * x + z * z);
            const height =
                Math.sin(x * 0.01) * 8 +
                Math.cos(z * 0.01) * 6 +
                Math.sin(distance * 0.005) * 12 +
                (Math.random() - 0.5) * 3;

            vertices[i + 1] = Math.max(height, -2);
        }

        geometry.computeVertexNormals();

        // Terrain texture
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Grass base
        const gradient = ctx.createRadialGradient(512, 512, 0, 512, 512, 512);
        gradient.addColorStop(0, '#2d5016');
        gradient.addColorStop(0.5, '#4a7c23');
        gradient.addColorStop(1, '#1a3009');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 1024);

        // Add texture details
        for (let i = 0; i < 5000; i++) {
            const alpha = Math.random() * 0.3;
            ctx.fillStyle = `rgba(${Math.random() * 100}, ${100 + Math.random() * 50}, ${Math.random() * 50}, ${alpha})`;
            ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
        }

        const terrainTexture = new THREE.CanvasTexture(canvas);
        terrainTexture.wrapS = terrainTexture.wrapT = THREE.RepeatWrapping;
        terrainTexture.repeat.set(20, 20);

        const material = new THREE.MeshLambertMaterial({
            map: terrainTexture
        });

        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        this.scene.add(terrain);

        // Add physics body for terrain
        if (this.physicsWorld) {
            const terrainShape = new CANNON.Plane();
            const terrainBody = new CANNON.Body({ mass: 0 });
            terrainBody.addShape(terrainShape);
            terrainBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
            this.physicsWorld.add(terrainBody);
        }
    }

    createRoads() {
        const roadMaterial = new THREE.MeshLambertMaterial({
            color: 0x2a2a2a,
            roughness: 0.8
        });

        // Main highway network
        const mainRoads = [
            { start: [-800, -800], end: [800, 800], width: 25 },
            { start: [-800, 800], end: [800, -800], width: 25 },
            { start: [-800, 0], end: [800, 0], width: 20 },
            { start: [0, -800], end: [0, 800], width: 20 }
        ];

        mainRoads.forEach(road => {
            this.createRoadSegment(road.start, road.end, road.width, roadMaterial);
        });

        // Secondary roads
        for (let i = 0; i < 15; i++) {
            const start = [
                (Math.random() - 0.5) * 1500,
                (Math.random() - 0.5) * 1500
            ];
            const end = [
                (Math.random() - 0.5) * 1500,
                (Math.random() - 0.5) * 1500
            ];
            this.createRoadSegment(start, end, 12, roadMaterial);
        }

        this.addRoadMarkings();
    }

    createRoadSegment(start, end, width, material) {
        const length = Math.sqrt(
            Math.pow(end[0] - start[0], 2) +
            Math.pow(end[1] - start[1], 2)
        );

        const geometry = new THREE.PlaneGeometry(length, width);
        const road = new THREE.Mesh(geometry, material);

        // Position and rotate
        road.position.set(
            (start[0] + end[0]) / 2,
            0.1,
            (start[1] + end[1]) / 2
        );
        road.rotation.x = -Math.PI / 2;
        road.rotation.z = Math.atan2(end[1] - start[1], end[0] - start[0]);
        road.receiveShadow = true;

        this.scene.add(road);
        this.roads.push({
            mesh: road,
            start: start,
            end: end,
            width: width
        });
    }

    addRoadMarkings() {
        const markingMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });

        this.roads.forEach(road => {
            // Center line
            const lineLength = road.mesh.geometry.parameters.width * 0.8;
            const segments = Math.floor(lineLength / 10);

            for (let i = 0; i < segments; i++) {
                if (i % 2 === 0) continue; // Dashed line

                const lineGeometry = new THREE.PlaneGeometry(5, 0.3);
                const centerLine = new THREE.Mesh(lineGeometry, markingMaterial);

                const offset = (i - segments / 2) * 10;
                centerLine.position.copy(road.mesh.position);
                centerLine.position.y += 0.02;
                centerLine.rotation.copy(road.mesh.rotation);

                // Offset along road
                centerLine.position.x += Math.cos(road.mesh.rotation.z) * offset;
                centerLine.position.z += Math.sin(road.mesh.rotation.z) * offset;

                this.scene.add(centerLine);
            }
        });
    }

    createBuildings() {
        const buildingTypes = [
            { width: [20, 40], height: [30, 80], depth: [20, 40], color: 0x8B4513 },
            { width: [30, 60], height: [40, 120], depth: [30, 50], color: 0x696969 },
            { width: [25, 45], height: [35, 90], depth: [25, 35], color: 0xF5F5DC },
            { width: [40, 80], height: [60, 150], depth: [40, 60], color: 0x2F4F4F }
        ];

        for (let i = 0; i < 40; i++) {
            const type = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];

            const width = type.width[0] + Math.random() * (type.width[1] - type.width[0]);
            const height = type.height[0] + Math.random() * (type.height[1] - type.height[0]);
            const depth = type.depth[0] + Math.random() * (type.depth[1] - type.depth[0]);

            const building = this.createBuilding(width, height, depth, type.color);

            // Position away from roads
            let validPosition = false;
            let attempts = 0;

            while (!validPosition && attempts < 50) {
                building.position.set(
                    (Math.random() - 0.5) * 1400,
                    height / 2,
                    (Math.random() - 0.5) * 1400
                );

                // Check distance from main roads
                const distanceFromCenter = Math.sqrt(
                    Math.pow(Math.abs(building.position.x), 2) +
                    Math.pow(Math.abs(building.position.z), 2)
                );

                if (distanceFromCenter > 60 &&
                    Math.abs(building.position.x) > 30 &&
                    Math.abs(building.position.z) > 30) {
                    validPosition = true;
                }
                attempts++;
            }

            this.scene.add(building);
            this.buildings.push(building);
        }
    }

    createBuilding(width, height, depth, color) {
        const building = new THREE.Group();

        // Main structure
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshLambertMaterial({ color: color });
        const main = new THREE.Mesh(geometry, material);
        main.castShadow = true;
        main.receiveShadow = true;
        building.add(main);

        // Add windows
        this.addBuildingWindows(building, width, height, depth);

        // Add entrance
        const entranceGeometry = new THREE.BoxGeometry(width * 0.3, height * 0.15, 2);
        const entranceMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const entrance = new THREE.Mesh(entranceGeometry, entranceMaterial);
        entrance.position.set(0, -height / 2 + height * 0.075, depth / 2 + 1);
        building.add(entrance);

        return building;
    }

    addBuildingWindows(building, width, height, depth) {
        const windowMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.7
        });

        const windowSize = 3;
        const windowSpacing = 6;
        const floors = Math.floor(height / 8);

        for (let floor = 1; floor <= floors; floor++) {
            const y = -height / 2 + (floor * 8);

            // Front and back faces
            for (let x = -width / 2 + windowSpacing; x < width / 2; x += windowSpacing) {
                // Front windows
                const frontWindow = new THREE.Mesh(
                    new THREE.PlaneGeometry(windowSize, windowSize),
                    windowMaterial
                );
                frontWindow.position.set(x, y, depth / 2 + 0.1);
                building.add(frontWindow);

                // Back windows
                const backWindow = new THREE.Mesh(
                    new THREE.PlaneGeometry(windowSize, windowSize),
                    windowMaterial
                );
                backWindow.position.set(x, y, -depth / 2 - 0.1);
                backWindow.rotation.y = Math.PI;
                building.add(backWindow);
            }

            // Side windows
            for (let z = -depth / 2 + windowSpacing; z < depth / 2; z += windowSpacing) {
                // Left windows
                const leftWindow = new THREE.Mesh(
                    new THREE.PlaneGeometry(windowSize, windowSize),
                    windowMaterial
                );
                leftWindow.position.set(-width / 2 - 0.1, y, z);
                leftWindow.rotation.y = Math.PI / 2;
                building.add(leftWindow);

                // Right windows
                const rightWindow = new THREE.Mesh(
                    new THREE.PlaneGeometry(windowSize, windowSize),
                    windowMaterial
                );
                rightWindow.position.set(width / 2 + 0.1, y, z);
                rightWindow.rotation.y = -Math.PI / 2;
                building.add(rightWindow);
            }
        }
    }

    createShops() {
        const shopTypes = [
            { type: 'gas', color: 0x00ff00, icon: '⛽' },
            { type: 'repair', color: 0xff8800, icon: '🔧' },
            { type: 'paint', color: 0xff00ff, icon: '🎨' },
            { type: 'tuning', color: 0x00ffff, icon: '⚡' }
        ];

        shopTypes.forEach((shopType, index) => {
            const shop = this.createShop(shopType);

            // Position shops around the world
            const angle = (index / shopTypes.length) * Math.PI * 2;
            const distance = 300 + Math.random() * 200;

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

    createShop(shopType) {
        const shop = new THREE.Group();

        // Main building
        const buildingGeometry = new THREE.BoxGeometry(40, 15, 30);
        const buildingMaterial = new THREE.MeshLambertMaterial({ color: shopType.color });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.y = 7.5;
        building.castShadow = true;
        building.receiveShadow = true;
        shop.add(building);

        // Roof
        const roofGeometry = new THREE.ConeGeometry(25, 8, 4);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 19;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        shop.add(roof);

        // Sign
        const signGeometry = new THREE.PlaneGeometry(20, 5);
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 100);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${shopType.icon} ${shopType.type.toUpperCase()}`, 200, 60);

        const signTexture = new THREE.CanvasTexture(canvas);
        const signMaterial = new THREE.MeshBasicMaterial({ map: signTexture });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(0, 20, 16);
        shop.add(sign);

        return shop;
    }

    createProps() {
        // Street lights
        for (let i = 0; i < 30; i++) {
            const streetLight = this.createStreetLight();
            streetLight.position.set(
                (Math.random() - 0.5) * 1800,
                0,
                (Math.random() - 0.5) * 1800
            );
            this.scene.add(streetLight);
        }

        // Trees
        for (let i = 0; i < 200; i++) {
            const tree = this.createTree();

            let validPosition = false;
            let attempts = 0;

            while (!validPosition && attempts < 30) {
                tree.position.set(
                    (Math.random() - 0.5) * 1900,
                    0,
                    (Math.random() - 0.5) * 1900
                );

                // Check distance from roads
                const distanceFromCenter = Math.sqrt(
                    Math.pow(Math.abs(tree.position.x), 2) +
                    Math.pow(Math.abs(tree.position.z), 2)
                );

                if (distanceFromCenter > 40) {
                    validPosition = true;
                }
                attempts++;
            }

            this.scene.add(tree);
        }
    }

    createStreetLight() {
        const light = new THREE.Group();

        // Pole
        const poleGeometry = new THREE.CylinderGeometry(0.3, 0.3, 12, 8);
        const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 6;
        pole.castShadow = true;
        light.add(pole);

        // Light fixture
        const fixtureGeometry = new THREE.SphereGeometry(1, 8, 8);
        const fixtureMaterial = new THREE.MeshBasicMaterial({ color: 0xffff88 });
        const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
        fixture.position.y = 11;
        light.add(fixture);

        // Spot light
        const spotLight = new THREE.SpotLight(0xffaa88, 0.5, 50, Math.PI * 0.3, 0.5, 2);
        spotLight.position.set(0, 11, 0);
        spotLight.target.position.set(0, 0, 0);
        spotLight.castShadow = true;
        light.add(spotLight);
        light.add(spotLight.target);

        return light;
    }

    createTree() {
        const tree = new THREE.Group();

        // Trunk
        const trunkHeight = 6 + Math.random() * 4;
        const trunkGeometry = new THREE.CylinderGeometry(
            0.3 + Math.random() * 0.3,
            0.6 + Math.random() * 0.4,
            trunkHeight,
            8
        );
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x4a2c17 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        tree.add(trunk);

        // Leaves
        const leavesRadius = 3 + Math.random() * 2;
        const leavesGeometry = new THREE.SphereGeometry(leavesRadius, 12, 8);
        const leavesMaterial = new THREE.MeshLambertMaterial({
            color: new THREE.Color().setHSL(0.25 + Math.random() * 0.1, 0.7, 0.4)
        });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = trunkHeight + leavesRadius * 0.7;
        leaves.castShadow = true;
        tree.add(leaves);

        return tree;
    }

    createTraffic() {
        // AI vehicles will be handled by the Vehicle system
        // This is a placeholder for traffic spawn points
        this.trafficSpawns = [
            { x: -400, z: 0 },
            { x: 400, z: 0 },
            { x: 0, z: -400 },
            { x: 0, z: 400 },
            { x: -200, z: -200 },
            { x: 200, z: 200 },
            { x: -200, z: 200 },
            { x: 200, z: -200 }
        ];
    }
}