export class PhysicsSystem {
    constructor() {
        this.world = null;
        this.bodies = [];
        this.constraints = [];
        this.materials = {};
        this.contactMaterials = {};

        // Physics settings
        this.gravity = -9.82;
        this.timeStep = 1 / 60;
        this.maxSubSteps = 3;

        // Vehicle physics parameters
        this.vehicleSettings = {
            mass: 1500,
            chassisConnectionPointLocal: new CANNON.Vec3(),
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 30,
            suspensionDamping: 1.4,
            frictionSlip: 5,
            rollInfluence: 0.01,
            maxSuspensionForce: 100000
        };
    }

    async init() {
        // Initialize Cannon.js world
        this.world = new CANNON.World();
        this.world.gravity.set(0, this.gravity, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();

        // Enable collision detection
        this.world.solver.iterations = 10;
        this.world.allowSleep = true;

        this.setupMaterials();
        this.setupContactMaterials();
        this.createGroundPlane();

        console.log('Physics system initialized');
    }

    setupMaterials() {
        // Define physics materials
        this.materials.ground = new CANNON.Material('ground');
        this.materials.wheel = new CANNON.Material('wheel');
        this.materials.chassis = new CANNON.Material('chassis');
        this.materials.building = new CANNON.Material('building');
        this.materials.road = new CANNON.Material('road');

        // Set material properties
        this.materials.ground.friction = 0.4;
        this.materials.ground.restitution = 0.3;

        this.materials.wheel.friction = 0.7;
        this.materials.wheel.restitution = 0.1;

        this.materials.chassis.friction = 0.3;
        this.materials.chassis.restitution = 0.2;

        this.materials.road.friction = 0.8;
        this.materials.road.restitution = 0.1;
    }

    setupContactMaterials() {
        // Define contact materials (how materials interact)
        this.contactMaterials.wheelGround = new CANNON.ContactMaterial(
            this.materials.wheel,
            this.materials.ground,
            {
                friction: 0.6,
                restitution: 0.1,
                contactEquationStiffness: 1000
            }
        );

        this.contactMaterials.wheelRoad = new CANNON.ContactMaterial(
            this.materials.wheel,
            this.materials.road,
            {
                friction: 0.9,
                restitution: 0.1,
                contactEquationStiffness: 1000
            }
        );

        this.contactMaterials.chassisBuilding = new CANNON.ContactMaterial(
            this.materials.chassis,
            this.materials.building,
            {
                friction: 0.8,
                restitution: 0.3,
                contactEquationStiffness: 1000
            }
        );

        // Add contact materials to world
        Object.values(this.contactMaterials).forEach(contactMaterial => {
            this.world.addContactMaterial(contactMaterial);
        });
    }

    createGroundPlane() {
        // Create infinite ground plane
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0, material: this.materials.ground });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);

        this.world.add(groundBody);
        this.bodies.push(groundBody);
    }

    createVehiclePhysics(position = { x: 0, y: 2, z: 0 }) {
        const vehicle = new VehiclePhysics(this.world, this.materials, position);
        return vehicle;
    }

    createStaticBox(position, size, material = this.materials.building) {
        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const body = new CANNON.Body({ mass: 0, material: material });
        body.addShape(shape);
        body.position.set(position.x, position.y, position.z);

        this.world.add(body);
        this.bodies.push(body);

        return body;
    }

    createDynamicBox(position, size, mass = 1) {
        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const body = new CANNON.Body({ mass: mass, material: this.materials.chassis });
        body.addShape(shape);
        body.position.set(position.x, position.y, position.z);

        this.world.add(body);
        this.bodies.push(body);

        return body;
    }

    createSphere(position, radius, mass = 1) {
        const shape = new CANNON.Sphere(radius);
        const body = new CANNON.Body({ mass: mass });
        body.addShape(shape);
        body.position.set(position.x, position.y, position.z);

        this.world.add(body);
        this.bodies.push(body);

        return body;
    }

    createRoadSegment(start, end, width) {
        const length = Math.sqrt(
            Math.pow(end.x - start.x, 2) +
            Math.pow(end.z - start.z, 2)
        );

        const shape = new CANNON.Box(new CANNON.Vec3(length / 2, 0.1, width / 2));
        const body = new CANNON.Body({ mass: 0, material: this.materials.road });
        body.addShape(shape);

        // Position and rotate
        body.position.set(
            (start.x + end.x) / 2,
            0.1,
            (start.z + end.z) / 2
        );

        const angle = Math.atan2(end.z - start.z, end.x - start.x);
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);

        this.world.add(body);
        this.bodies.push(body);

        return body;
    }

    addTriggerZone(position, size, onEnter, onExit) {
        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const body = new CANNON.Body({ mass: 0, isTrigger: true });
        body.addShape(shape);
        body.position.set(position.x, position.y, position.z);

        // Set as sensor (no collision response)
        body.type = CANNON.Body.KINEMATIC;

        body.addEventListener('collide', (event) => {
            const contact = event.contact;
            const other = contact.bi === body ? contact.bj : contact.bi;

            if (onEnter) onEnter(other);
        });

        this.world.add(body);
        this.bodies.push(body);

        return body;
    }

    setGravity(gravity) {
        this.gravity = gravity;
        this.world.gravity.set(0, gravity, 0);
    }

    setWeatherPhysics(weather) {
        // Adjust physics based on weather
        switch (weather) {
            case 'rain':
                // Reduce tire grip in rain
                this.contactMaterials.wheelGround.friction = 0.4;
                this.contactMaterials.wheelRoad.friction = 0.6;
                break;

            case 'fog':
                // Slightly reduced grip
                this.contactMaterials.wheelGround.friction = 0.5;
                this.contactMaterials.wheelRoad.friction = 0.7;
                break;

            default:
                // Normal conditions
                this.contactMaterials.wheelGround.friction = 0.6;
                this.contactMaterials.wheelRoad.friction = 0.9;
        }
    }

    update(deltaTime) {
        // Step the physics simulation
        this.world.step(this.timeStep, deltaTime, this.maxSubSteps);

        // Update any custom physics behaviors
        this.updateCustomPhysics();
    }

    updateCustomPhysics() {
        // Custom physics updates (wind, drag, etc.)
        this.bodies.forEach(body => {
            if (body.userData && body.userData.customPhysics) {
                body.userData.customPhysics(body);
            }
        });
    }

    removeBody(body) {
        const index = this.bodies.indexOf(body);
        if (index > -1) {
            this.bodies.splice(index, 1);
        }
        this.world.remove(body);
    }

    raycast(from, to) {
        const result = new CANNON.RaycastResult();
        this.world.raycastClosest(from, to, {}, result);
        return result;
    }

    // Cleanup
    destroy() {
        this.bodies.forEach(body => {
            this.world.remove(body);
        });
        this.bodies = [];
        this.constraints = [];
        this.world = null;
    }
}

// Specialized vehicle physics class
class VehiclePhysics {
    constructor(world, materials, position) {
        this.world = world;
        this.materials = materials;
        this.vehicle = null;
        this.chassisBody = null;
        this.wheels = [];

        this.engineForce = 0;
        this.brakeForce = 0;
        this.steeringValue = 0;

        this.maxEngineForce = 2000;
        this.maxBrakeForce = 1000;
        this.maxSteeringValue = 0.3;

        this.createVehicle(position);
    }

    createVehicle(position) {
        // Create chassis
        const chassisShape = new CANNON.Box(new CANNON.Vec3(2, 0.5, 4));
        this.chassisBody = new CANNON.Body({ mass: 1500 });
        this.chassisBody.addShape(chassisShape);
        this.chassisBody.position.set(position.x, position.y, position.z);
        this.chassisBody.material = this.materials.chassis;

        // Add custom physics behavior
        this.chassisBody.userData = {
            customPhysics: (body) => {
                // Apply air resistance
                const drag = body.velocity.clone();
                drag.scale(-0.01 * drag.length());
                body.force.vadd(drag, body.force);

                // Apply downforce at high speeds
                const speed = body.velocity.length();
                if (speed > 10) {
                    const downforce = new CANNON.Vec3(0, -speed * 0.1, 0);
                    body.force.vadd(downforce, body.force);
                }
            }
        };

        this.world.add(this.chassisBody);

        // Create vehicle
        this.vehicle = new CANNON.RaycastVehicle({
            chassisBody: this.chassisBody,
            indexRightAxis: 0,
            indexUpAxis: 1,
            indexForwardAxis: 2
        });

        // Add wheels
        this.addWheels();

        this.vehicle.addToWorld(this.world);
    }

    addWheels() {
        const wheelOptions = {
            radius: 0.8,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 30,
            suspensionDamping: 1.4,
            frictionSlip: 5,
            rollInfluence: 0.01,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(),
            maxSuspensionForce: 100000,
            isFrontWheel: false,
            customSlidingRotationalSpeed: -30,
            useCustomSlidingRotationalSpeed: true
        };

        // Front left wheel
        wheelOptions.chassisConnectionPointLocal.set(-1.5, 0, 2);
        wheelOptions.isFrontWheel = true;
        this.vehicle.addWheel(wheelOptions);

        // Front right wheel
        wheelOptions.chassisConnectionPointLocal.set(1.5, 0, 2);
        wheelOptions.isFrontWheel = true;
        this.vehicle.addWheel(wheelOptions);

        // Rear left wheel
        wheelOptions.chassisConnectionPointLocal.set(-1.5, 0, -2);
        wheelOptions.isFrontWheel = false;
        this.vehicle.addWheel(wheelOptions);

        // Rear right wheel
        wheelOptions.chassisConnectionPointLocal.set(1.5, 0, -2);
        wheelOptions.isFrontWheel = false;
        this.vehicle.addWheel(wheelOptions);
    }

    setEngineForce(force) {
        this.engineForce = Math.max(-this.maxEngineForce, Math.min(force, this.maxEngineForce));

        // Apply to rear wheels
        this.vehicle.applyEngineForce(this.engineForce, 2);
        this.vehicle.applyEngineForce(this.engineForce, 3);
    }

    setBrakeForce(force) {
        this.brakeForce = Math.max(0, Math.min(force, this.maxBrakeForce));

        // Apply to all wheels
        for (let i = 0; i < 4; i++) {
            this.vehicle.setBrake(this.brakeForce, i);
        }
    }

    setSteering(angle) {
        this.steeringValue = Math.max(-this.maxSteeringValue, Math.min(angle, this.maxSteeringValue));

        // Apply to front wheels
        this.vehicle.setSteeringValue(this.steeringValue, 0);
        this.vehicle.setSteeringValue(this.steeringValue, 1);
    }

    getSpeed() {
        return this.chassisBody.velocity.length() * 3.6; // Convert to km/h
    }

    getPosition() {
        return this.chassisBody.position.clone();
    }

    getRotation() {
        return this.chassisBody.quaternion.clone();
    }

    addDamage(amount) {
        // Reduce vehicle performance based on damage
        this.maxEngineForce *= (1 - amount * 0.01);

        // Add instability to steering
        if (amount > 50) {
            const instability = (amount - 50) * 0.001;
            this.steeringValue += (Math.random() - 0.5) * instability;
        }
    }

    repair() {
        this.maxEngineForce = 2000;
    }

    setGrip(gripMultiplier) {
        // Adjust wheel friction
        for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
            this.vehicle.wheelInfos[i].frictionSlip = 5 * gripMultiplier;
        }
    }

    reset(position) {
        // Reset vehicle to position
        this.chassisBody.position.set(position.x, position.y, position.z);
        this.chassisBody.quaternion.set(0, 0, 0, 1);
        this.chassisBody.velocity.set(0, 0, 0);
        this.chassisBody.angularVelocity.set(0, 0, 0);

        this.engineForce = 0;
        this.brakeForce = 0;
        this.steeringValue = 0;
    }
}