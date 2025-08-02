export class Vehicle {
    constructor(scene, physicsWorld) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.mesh = null;
        this.body = null;
        this.wheels = [];
        this.wheelBodies = [];
        this.constraints = [];

        this.enginePower = 1500;
        this.maxSteerVal = 0.5;
        this.maxSpeed = 20;
        this.brakeForce = 1000;

        this.speed = 0;
        this.rpm = 800;
        this.steering = 0;
        this.acceleration = 0;
        this.braking = 0;

        // Vehicle state
        this.damage = 0;
        this.fuelConsumption = 1;
        this.grip = 1;

        // Audio and effects
        this.exhaustParticles = null;
        this.skidMarks = [];
        this.headlights = [];
    }

    async load() {
        await this.createVehicle();
        this.setupPhysics();
        this.createEffects();
        this.createAudio();
    }

    async createVehicle() {
        const vehicle = new THREE.Group();

        // Car body
        const bodyGeometry = new THREE.BoxGeometry(4.5, 1.8, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        body.castShadow = true;
        vehicle.add(body);

        // Car roof
        const roofGeometry = new THREE.BoxGeometry(4, 1.2, 4.5);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(0, 2.2, -0.5);
        roof.castShadow = true;
        vehicle.add(roof);

        // Windshield
        const windshieldGeometry = new THREE.PlaneGeometry(3.8, 1);
        const windshieldMaterial = new THREE.MeshLambertMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.3
        });
        const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
        windshield.position.set(0, 2.2, 1.5);
        windshield.rotation.x = -0.3;
        vehicle.add(windshield);

        // Rear window
        const rearWindowGeometry = new THREE.PlaneGeometry(3.8, 1);
        const rearWindow = new THREE.Mesh(rearWindowGeometry, windshieldMaterial);
        rearWindow.position.set(0, 2.2, -2.5);
        rearWindow.rotation.x = 0.3;
        rearWindow.rotation.y = Math.PI;
        vehicle.add(rearWindow);

        // Create wheels
        this.createWheels(vehicle);

        // Create interior
        this.createInterior(vehicle);

        // Create lights
        this.createLights(vehicle);

        // Create mirrors
        this.createMirrors(vehicle);

        vehicle.position.set(0, 2, 0);
        this.scene.add(vehicle);
        this.mesh = vehicle;
    }

    createWheels(vehicle) {
        const wheelGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.5, 16);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

        const wheelPositions = [
            [-2, 0.5, 2.8],   // Front left
            [2, 0.5, 2.8],    // Front right
            [-2, 0.5, -2.8],  // Rear left
            [2, 0.5, -2.8]    // Rear right
        ];

        wheelPositions.forEach((pos, index) => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos[0], pos[1], pos[2]);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            vehicle.add(wheel);
            this.wheels.push(wheel);

            // Tire tread
            const treadGeometry = new THREE.TorusGeometry(1.2, 0.1, 8, 16);
            const treadMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });
            const tread = new THREE.Mesh(treadGeometry, treadMaterial);
            tread.position.copy(wheel.position);
            tread.rotation.copy(wheel.rotation);
            vehicle.add(tread);

            // Rim
            const rimGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 16);
            const rimMaterial = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
            const rim = new THREE.Mesh(rimGeometry, rimMaterial);
            rim.position.copy(wheel.position);
            rim.rotation.copy(wheel.rotation);
            vehicle.add(rim);
        });
    }

    createInterior(vehicle) {
        // Dashboard
        const dashGeometry = new THREE.BoxGeometry(4, 0.3, 1);
        const dashMaterial = new THREE.MeshLambertMaterial({ color: 0x2c2c2c });
        const dashboard = new THREE.Mesh(dashGeometry, dashMaterial);
        dashboard.position.set(0, 1.5, 2.5);
        vehicle.add(dashboard);

        // Steering wheel
        const steeringGeometry = new THREE.TorusGeometry(0.6, 0.08, 8, 16);
        const steeringMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const steeringWheel = new THREE.Mesh(steeringGeometry, steeringMaterial);
        steeringWheel.position.set(-0.8, 1.8, 2.2);
        steeringWheel.rotation.x = -0.3;
        vehicle.add(steeringWheel);

        // Seats
        const seatGeometry = new THREE.BoxGeometry(1.5, 0.8, 1.2);
        const seatMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });

        // Driver seat
        const driverSeat = new THREE.Mesh(seatGeometry, seatMaterial);
        driverSeat.position.set(-0.8, 1.2, 0.5);
        vehicle.add(driverSeat);

        // Passenger seat
        const passengerSeat = new THREE.Mesh(seatGeometry, seatMaterial);
        passengerSeat.position.set(0.8, 1.2, 0.5);
        vehicle.add(passengerSeat);

        // Rear seats
        const rearSeatGeometry = new THREE.BoxGeometry(3.5, 0.8, 1.2);
        const rearSeat = new THREE.Mesh(rearSeatGeometry, seatMaterial);
        rearSeat.position.set(0, 1.2, -1.5);
        vehicle.add(rearSeat);

        // Side mirrors (interior view)
        this.createSideMirrors(vehicle);
    }

    createSideMirrors(vehicle) {
        // Left mirror
        const leftMirrorGeometry = new THREE.PlaneGeometry(0.3, 0.2);
        const mirrorMaterial = new THREE.MeshBasicMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.8
        });
        const leftMirror = new THREE.Mesh(leftMirrorGeometry, mirrorMaterial);
        leftMirror.position.set(-2.5, 2.5, 1.5);
        leftMirror.rotation.y = 0.3;
        vehicle.add(leftMirror);

        // Right mirror
        const rightMirror = new THREE.Mesh(leftMirrorGeometry, mirrorMaterial);
        rightMirror.position.set(2.5, 2.5, 1.5);
        rightMirror.rotation.y = -0.3;
        vehicle.add(rightMirror);

        // Rear view mirror
        const rearMirrorGeometry = new THREE.PlaneGeometry(0.4, 0.15);
        const rearMirror = new THREE.Mesh(rearMirrorGeometry, mirrorMaterial);
        rearMirror.position.set(0, 2.8, 1.8);
        vehicle.add(rearMirror);
    }

    createLights(vehicle) {
        // Headlights
        const headlightGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffaa });

        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(-1.5, 1.2, 4);
        vehicle.add(leftHeadlight);

        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(1.5, 1.2, 4);
        vehicle.add(rightHeadlight);

        // Headlight spots
        const leftSpot = new THREE.SpotLight(0xffffaa, 1, 100, Math.PI * 0.2, 0.5, 2);
        leftSpot.position.set(-1.5, 1.2, 4);
        leftSpot.target.position.set(-1.5, 0, 20);
        leftSpot.castShadow = true;
        vehicle.add(leftSpot);
        vehicle.add(leftSpot.target);
        this.headlights.push(leftSpot);

        const rightSpot = new THREE.SpotLight(0xffffaa, 1, 100, Math.PI * 0.2, 0.5, 2);
        rightSpot.position.set(1.5, 1.2, 4);
        rightSpot.target.position.set(1.5, 0, 20);
        rightSpot.castShadow = true;
        vehicle.add(rightSpot);
        vehicle.add(rightSpot.target);
        this.headlights.push(rightSpot);

        // Tail lights
        const taillightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const taillightMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        const leftTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
        leftTaillight.position.set(-1.8, 1, -4);
        vehicle.add(leftTaillight);

        const rightTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
        rightTaillight.position.set(1.8, 1, -4);
        vehicle.add(rightTaillight);
    }

    createMirrors(vehicle) {
        // These will be used by the mirror system
        this.mirrorPositions = {
            left: new THREE.Vector3(-2.5, 2.5, 1.5),
            right: new THREE.Vector3(2.5, 2.5, 1.5),
            rear: new THREE.Vector3(0, 2.8, 1.8)
        };
    }

    setupPhysics() {
        if (!this.physicsWorld) return;

        // Create vehicle body
        const vehicleShape = new CANNON.Box(new CANNON.Vec3(2.25, 0.9, 4));
        this.body = new CANNON.Body({ mass: 1500 });
        this.body.addShape(vehicleShape);
        this.body.position.set(0, 2, 0);
        this.body.material = new CANNON.Material({ friction: 0.4, restitution: 0.3 });
        this.physicsWorld.add(this.body);

        // Create wheel physics
        this.setupWheelPhysics();
    }

    setupWheelPhysics() {
        const wheelMaterial = new CANNON.Material({ friction: this.grip, restitution: 0.1 });
        const wheelShape = new CANNON.Cylinder(1.2, 1.2, 0.5, 8);

        const wheelPositions = [
            [-2, 0.5, 2.8],   // Front left
            [2, 0.5, 2.8],    // Front right
            [-2, 0.5, -2.8],  // Rear left
            [2, 0.5, -2.8]    // Rear right
        ];

        wheelPositions.forEach((pos, index) => {
            const wheelBody = new CANNON.Body({ mass: 30 });
            wheelBody.addShape(wheelShape);
            wheelBody.material = wheelMaterial;
            wheelBody.position.set(pos[0], pos[1] + 2, pos[2]);
            this.physicsWorld.add(wheelBody);
            this.wheelBodies.push(wheelBody);

            // Connect wheel to vehicle with constraints
            const constraint = new CANNON.PointToPointConstraint(
                this.body,
                new CANNON.Vec3(pos[0], pos[1], pos[2]),
                wheelBody,
                new CANNON.Vec3(0, 0, 0)
            );
            this.physicsWorld.addConstraint(constraint);
            this.constraints.push(constraint);
        });
    }

    createEffects() {
        // Exhaust particles
        this.createExhaustSystem();

        // Dust particles for wheels
        this.createDustSystem();
    }

    createExhaustSystem() {
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const ages = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            velocities[i * 3] = 0;
            velocities[i * 3 + 1] = 0;
            velocities[i * 3 + 2] = 0;
            ages[i] = Math.random();
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));

        const material = new THREE.PointsMaterial({
            color: 0x666666,
            size: 2,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        this.exhaustParticles = new THREE.Points(geometry, material);
        this.scene.add(this.exhaustParticles);
    }

    createDustSystem() {
        // Similar to exhaust but for wheel dust
        this.dustParticles = [];

        for (let i = 0; i < 4; i++) {
            const particleCount = 50;
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const material = new THREE.PointsMaterial({
                color: 0x8B4513,
                size: 1,
                transparent: true,
                opacity: 0.4
            });

            const dust = new THREE.Points(geometry, material);
            this.scene.add(dust);
            this.dustParticles.push(dust);
        }
    }

    createAudio() {
        // Audio will be handled by the AudioSystem
        this.audioNodes = {
            engine: null,
            wind: null,
            tires: null,
            brakes: null
        };
    }

    update(controls, deltaTime) {
        this.handleInput(controls);
        this.updatePhysics(deltaTime);
        this.updateVisuals();
        this.updateEffects(deltaTime);
        this.updateAudio();
    }

    handleInput(controls) {
        // Calculate acceleration
        if (controls.forward) {
            this.acceleration = Math.min(this.acceleration + 0.02, 1);
        } else if (controls.backward) {
            this.acceleration = Math.max(this.acceleration - 0.02, -0.5);
        } else {
            this.acceleration *= 0.95; // Natural deceleration
        }

        // Boost modifier
        if (controls.boost) {
            this.acceleration *= 1.5;
        }

        // Steering
        if (controls.left) {
            this.steering = Math.min(this.steering + 0.03, 1);
        } else if (controls.right) {
            this.steering = Math.max(this.steering - 0.03, -1);
        } else {
            this.steering *= 0.9; // Return to center
        }

        // Braking
        this.braking = controls.brake ? 1 : 0;
    }

    updatePhysics(deltaTime) {
        if (!this.body) return;

        // Apply engine force
        const force = this.acceleration * this.enginePower;
        const forwardVector = new CANNON.Vec3(0, 0, 1);
        this.body.quaternion.vmult(forwardVector, forwardVector);

        this.body.force.x += forwardVector.x * force;
        this.body.force.z += forwardVector.z * force;

        // Apply steering torque
        const torque = this.steering * this.maxSteerVal * this.speed * 50;
        this.body.angularForce.y += torque;

        // Apply braking
        if (this.braking > 0) {
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;
        }

        // Calculate speed
        this.speed = Math.sqrt(
            this.body.velocity.x * this.body.velocity.x +
            this.body.velocity.z * this.body.velocity.z
        );

        // Apply drag
        const drag = 0.98 - (this.speed * 0.001);
        this.body.velocity.x *= drag;
        this.body.velocity.z *= drag;

        // Update wheel physics
        this.updateWheelPhysics();
    }

    updateWheelPhysics() {
        // Apply forces to wheels and handle steering
        this.wheelBodies.forEach((wheelBody, index) => {
            // Front wheels steering
            if (index < 2) {
                const steerAngle = this.steering * this.maxSteerVal;
                // Apply steering rotation to front wheels
                const steerQuaternion = new CANNON.Quaternion();
                steerQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), steerAngle);
                wheelBody.quaternion = this.body.quaternion.mult(steerQuaternion);
            }

            // Apply rolling resistance
            wheelBody.angularVelocity.x *= 0.99;
            wheelBody.angularVelocity.z *= 0.99;
        });
    }

    updateVisuals() {
        if (!this.body || !this.mesh) return;

        // Update vehicle position and rotation
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);

        // Update wheel visuals
        this.wheels.forEach((wheel, index) => {
            if (this.wheelBodies[index]) {
                wheel.position.copy(this.wheelBodies[index].position);
                wheel.quaternion.copy(this.wheelBodies[index].quaternion);

                // Front wheel steering
                if (index < 2) {
                    wheel.rotation.y = this.steering * this.maxSteerVal;
                }

                // Wheel rotation based on speed
                wheel.rotation.x += this.speed * 0.1;
            }
        });

        // Update steering wheel
        const steeringWheel = this.mesh.children.find(child =>
            child.geometry && child.geometry.type === 'TorusGeometry'
        );
        if (steeringWheel) {
            steeringWheel.rotation.z = this.steering * 0.5;
        }
    }

    updateEffects(deltaTime) {
        this.updateExhaustEffect();
        this.updateDustEffect();
        this.updateSkidMarks();
    }

    updateExhaustEffect() {
        if (!this.exhaustParticles) return;

        const positions = this.exhaustParticles.geometry.attributes.position.array;
        const velocities = this.exhaustParticles.geometry.attributes.velocity.array;
        const ages = this.exhaustParticles.geometry.attributes.age.array;

        for (let i = 0; i < positions.length; i += 3) {
            // Update particle positions
            positions[i] += velocities[i];
            positions[i + 1] += velocities[i + 1];
            positions[i + 2] += velocities[i + 2];

            // Age particles
            ages[i / 3] += 0.016;

            // Reset old particles
            if (ages[i / 3] > 1) {
                // Reset to exhaust position
                const exhaustPos = this.mesh.position.clone();
                exhaustPos.y += 0.5;
                exhaustPos.z -= 4;

                positions[i] = exhaustPos.x + (Math.random() - 0.5) * 0.5;
                positions[i + 1] = exhaustPos.y + (Math.random() - 0.5) * 0.5;
                positions[i + 2] = exhaustPos.z + (Math.random() - 0.5) * 0.5;

                velocities[i] = (Math.random() - 0.5) * 0.1;
                velocities[i + 1] = Math.random() * 0.2 + 0.1;
                velocities[i + 2] = -Math.random() * 0.3 - 0.2;

                ages[i / 3] = 0;
            }
        }

        this.exhaustParticles.geometry.attributes.position.needsUpdate = true;
        this.exhaustParticles.geometry.attributes.age.needsUpdate = true;
    }

    updateDustEffect() {
        // Update dust particles based on wheel contact and speed
        if (this.speed > 2) {
            this.dustParticles.forEach((dust, index) => {
                if (this.wheels[index]) {
                    const wheelPos = this.wheels[index].getWorldPosition(new THREE.Vector3());
                    const positions = dust.geometry.attributes.position.array;

                    // Emit dust particles from wheel position
                    for (let i = 0; i < positions.length; i += 3) {
                        if (Math.random() < 0.1) {
                            positions[i] = wheelPos.x + (Math.random() - 0.5) * 2;
                            positions[i + 1] = wheelPos.y - 0.5;
                            positions[i + 2] = wheelPos.z + (Math.random() - 0.5) * 2;
                        }
                    }

                    dust.geometry.attributes.position.needsUpdate = true;
                }
            });
        }
    }

    updateSkidMarks() {
        // Create skid marks when braking hard or drifting
        if (this.braking > 0.8 || Math.abs(this.steering) > 0.8) {
            this.wheels.forEach((wheel, index) => {
                const wheelPos = wheel.getWorldPosition(new THREE.Vector3());
                wheelPos.y = 0.1; // Just above ground

                // Create skid mark geometry
                const markGeometry = new THREE.PlaneGeometry(0.5, 2);
                const markMaterial = new THREE.MeshBasicMaterial({
                    color: 0x222222,
                    transparent: true,
                    opacity: 0.6
                });
                const skidMark = new THREE.Mesh(markGeometry, markMaterial);
                skidMark.position.copy(wheelPos);
                skidMark.rotation.x = -Math.PI / 2;
                skidMark.rotation.z = this.mesh.rotation.y;

                this.scene.add(skidMark);
                this.skidMarks.push(skidMark);

                // Remove old skid marks
                if (this.skidMarks.length > 100) {
                    const oldMark = this.skidMarks.shift();
                    this.scene.remove(oldMark);
                }
            });
        }
    }

    updateAudio() {
        // This will be handled by the AudioSystem
        // Just update the audio parameters here
        this.audioParams = {
            engineRPM: this.rpm,
            speed: this.speed,
            acceleration: this.acceleration,
            braking: this.braking,
            skidding: Math.abs(this.steering) > 0.7 && this.speed > 5
        };
    }

    // Getters
    getSpeed() {
        return this.speed * 3.6; // Convert to km/h
    }

    getRPM(gear) {
        const baseRPM = 800;
        const maxRPM = 6000;
        const speedRatio = Math.abs(this.speed) / this.maxSpeed;
        return baseRPM + (speedRatio * (maxRPM - baseRPM)) / gear;
    }

    getPosition() {
        return this.mesh.position.clone();
    }

    // Setters
    setMaxSpeed(speed) {
        this.maxSpeed = speed;
    }

    setGrip(grip) {
        this.grip = grip;
        // Update wheel materials
        this.wheelBodies.forEach(wheelBody => {
            wheelBody.material.friction = grip;
        });
    }

    setColor(color) {
        this.mesh.children.forEach(child => {
            if (child.material && child.geometry.type === 'BoxGeometry') {
                child.material.color.setHex(color);
            }
        });
    }

    // Damage system
    addDamage(amount) {
        this.damage = Math.min(this.damage + amount, 100);

        // Reduce performance based on damage
        const damageMultiplier = 1 - (this.damage / 200);
        this.enginePower = 1500 * damageMultiplier;
        this.maxSpeed = 20 * damageMultiplier;

        // Add visual damage effects
        if (this.damage > 50) {
            this.addVisualDamage();
        }
    }

    addVisualDamage() {
        // Add dents, scratches, broken parts
        const damageGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const damageMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });

        for (let i = 0; i < 3; i++) {
            const dent = new THREE.Mesh(damageGeometry, damageMaterial);
            dent.position.set(
                (Math.random() - 0.5) * 4,
                1 + Math.random(),
                (Math.random() - 0.5) * 6
            );
            this.mesh.add(dent);
        }
    }

    repair() {
        this.damage = 0;
        this.enginePower = 1500;
        this.maxSpeed = 20;

        // Remove visual damage
        const damageObjects = this.mesh.children.filter(child =>
            child.geometry && child.geometry.type === 'SphereGeometry' &&
            child.material.color.getHex() === 0x444444
        );
        damageObjects.forEach(obj => this.mesh.remove(obj));
    }
}