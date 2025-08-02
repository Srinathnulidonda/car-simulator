export class CameraSystem {
    constructor(camera, vehicle) {
        this.camera = camera;
        this.vehicle = vehicle;
        this.mode = 'tpp'; // 'fpp' or 'tpp'

        // Camera settings
        this.tppDistance = 15;
        this.tppHeight = 5;
        this.fppPosition = new THREE.Vector3(-0.8, 2.2, 1.5); // Driver seat
        this.seatAdjustment = { height: 0, distance: 0 };

        // Head bobbing
        this.headBob = {
            enabled: true,
            intensity: 0.05,
            frequency: 0.1,
            time: 0
        };

        // Look around (FPP)
        this.lookAround = {
            enabled: false,
            sensitivity: 0.002,
            maxPitch: Math.PI / 3,
            maxYaw: Math.PI / 2,
            currentPitch: 0,
            currentYaw: 0
        };

        // Smooth camera transitions
        this.targetPosition = new THREE.Vector3();
        this.targetLookAt = new THREE.Vector3();
        this.smoothing = 0.1;

        this.setupControls();
    }

    setupControls() {
        // Mouse look controls for FPP
        document.addEventListener('pointerlockchange', () => {
            this.lookAround.enabled = document.pointerLockElement !== null;
        });

        document.addEventListener('mousemove', (event) => {
            if (this.mode === 'fpp' && this.lookAround.enabled) {
                this.handleMouseLook(event);
            }
        });

        // Request pointer lock when clicking in FPP mode
        document.addEventListener('click', () => {
            if (this.mode === 'fpp' && !this.lookAround.enabled) {
                document.body.requestPointerLock();
            }
        });
    }

    handleMouseLook(event) {
        if (!this.lookAround.enabled) return;

        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        this.lookAround.currentYaw -= movementX * this.lookAround.sensitivity;
        this.lookAround.currentPitch -= movementY * this.lookAround.sensitivity;

        // Clamp pitch and yaw
        this.lookAround.currentPitch = Math.max(
            -this.lookAround.maxPitch,
            Math.min(this.lookAround.maxPitch, this.lookAround.currentPitch)
        );

        this.lookAround.currentYaw = Math.max(
            -this.lookAround.maxYaw,
            Math.min(this.lookAround.maxYaw, this.lookAround.currentYaw)
        );
    }

    toggleMode() {
        this.mode = this.mode === 'fpp' ? 'tpp' : 'fpp';

        if (this.mode === 'fpp') {
            // Enable pointer lock for mouse look
            document.body.requestPointerLock();
        } else {
            // Exit pointer lock
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            // Reset look around
            this.lookAround.currentPitch = 0;
            this.lookAround.currentYaw = 0;
        }
    }

    update(deltaTime) {
        if (!this.vehicle.mesh) return;

        this.headBob.time += deltaTime;

        if (this.mode === 'fpp') {
            this.updateFPP(deltaTime);
        } else {
            this.updateTPP(deltaTime);
        }

        // Smooth camera movement
        this.camera.position.lerp(this.targetPosition, this.smoothing);

        // Update camera look-at
        if (this.mode === 'fpp') {
            this.updateFPPLookAt();
        } else {
            this.camera.lookAt(this.vehicle.mesh.position);
        }
    }

    updateFPP(deltaTime) {
        const vehiclePos = this.vehicle.mesh.position;
        const vehicleRotation = this.vehicle.mesh.rotation;

        // Base position (driver seat)
        let fppPos = this.fppPosition.clone();

        // Apply seat adjustments
        fppPos.y += this.seatAdjustment.height;
        fppPos.z += this.seatAdjustment.distance;

        // Apply head bobbing
        if (this.headBob.enabled && this.vehicle.getSpeed() > 1) {
            const bobAmount = this.vehicle.getSpeed() * this.headBob.intensity;
            fppPos.y += Math.sin(this.headBob.time * this.headBob.frequency * this.vehicle.getSpeed()) * bobAmount;
            fppPos.x += Math.cos(this.headBob.time * this.headBob.frequency * this.vehicle.getSpeed() * 0.7) * bobAmount * 0.5;
        }

        // Transform position relative to vehicle
        const matrix = new THREE.Matrix4();
        matrix.makeRotationFromEuler(new THREE.Euler(0, vehicleRotation.y, 0));
        fppPos.applyMatrix4(matrix);
        fppPos.add(vehiclePos);

        this.targetPosition.copy(fppPos);
    }

    updateFPPLookAt() {
        const vehicleRotation = this.vehicle.mesh.rotation;

        // Calculate look direction based on vehicle rotation and mouse look
        const lookDirection = new THREE.Vector3(0, 0, -1);

        // Apply mouse look rotation
        const pitchMatrix = new THREE.Matrix4().makeRotationX(this.lookAround.currentPitch);
        const yawMatrix = new THREE.Matrix4().makeRotationY(this.lookAround.currentYaw);
        const vehicleMatrix = new THREE.Matrix4().makeRotationY(vehicleRotation.y);

        // Combine rotations: vehicle rotation + mouse look
        const combinedMatrix = new THREE.Matrix4();
        combinedMatrix.multiplyMatrices(vehicleMatrix, yawMatrix);
        combinedMatrix.multiply(pitchMatrix);

        lookDirection.applyMatrix4(combinedMatrix);

        // Set camera look-at
        const lookTarget = this.camera.position.clone().add(lookDirection.multiplyScalar(100));
        this.camera.lookAt(lookTarget);
    }

    updateTPP(deltaTime) {
        const vehiclePos = this.vehicle.mesh.position;
        const vehicleRotation = this.vehicle.mesh.rotation;

        // Calculate camera position behind and above vehicle
        const offset = new THREE.Vector3(0, this.tppHeight, -this.tppDistance);

        // Adjust based on speed (camera pulls back at high speed)
        const speedFactor = Math.min(this.vehicle.getSpeed() / 100, 1);
        offset.z -= speedFactor * 5;
        offset.y += speedFactor * 2;

        // Apply vehicle rotation
        const matrix = new THREE.Matrix4();
        matrix.makeRotationFromEuler(new THREE.Euler(0, vehicleRotation.y, 0));
        offset.applyMatrix4(matrix);

        this.targetPosition.copy(vehiclePos).add(offset);

        // Add some camera shake based on speed and terrain
        if (this.vehicle.getSpeed() > 50) {
            const shakeAmount = (this.vehicle.getSpeed() - 50) * 0.01;
            this.targetPosition.x += (Math.random() - 0.5) * shakeAmount;
            this.targetPosition.y += (Math.random() - 0.5) * shakeAmount;
        }
    }

    adjustSeat(type, value) {
        if (this.mode !== 'fpp') return;

        switch (type) {
            case 'height':
                this.seatAdjustment.height = value;
                break;
            case 'distance':
                this.seatAdjustment.distance = value;
                break;
        }
    }

    resetSeat() {
        this.seatAdjustment = { height: 0, distance: 0 };

        // Update UI sliders
        document.getElementById('seatHeight').value = 0;
        document.getElementById('seatDistance').value = 0;
    }

    // Camera shake for impacts
    addShake(intensity, duration) {
        this.shake = {
            intensity: intensity,
            duration: duration,
            remaining: duration
        };
    }

    updateShake(deltaTime) {
        if (!this.shake || this.shake.remaining <= 0) return;

        this.shake.remaining -= deltaTime;
        const shakeAmount = this.shake.intensity * (this.shake.remaining / this.shake.duration);

        this.targetPosition.x += (Math.random() - 0.5) * shakeAmount;
        this.targetPosition.y += (Math.random() - 0.5) * shakeAmount;
        this.targetPosition.z += (Math.random() - 0.5) * shakeAmount;
    }

    // Cinematic camera modes
    setCinematicMode(enabled) {
        this.cinematic = enabled;

        if (enabled) {
            this.smoothing = 0.02; // Slower, more cinematic movement
        } else {
            this.smoothing = 0.1;  // Normal responsiveness
        }
    }

    // Get camera matrices for mirror rendering
    getCameraMatrices() {
        return {
            viewMatrix: this.camera.matrixWorldInverse,
            projectionMatrix: this.camera.projectionMatrix
        };
    }

    // Specific positions for different camera angles
    setSpecialView(viewType) {
        switch (viewType) {
            case 'hood':
                if (this.mode === 'fpp') {
                    this.fppPosition.set(0, 1.8, 3.5); // Hood view
                }
                break;
            case 'driver':
                if (this.mode === 'fpp') {
                    this.fppPosition.set(-0.8, 2.2, 1.5); // Normal driver view
                }
                break;
            case 'passenger':
                if (this.mode === 'fpp') {
                    this.fppPosition.set(0.8, 2.2, 1.5); // Passenger view
                }
                break;
            case 'rear':
                if (this.mode === 'fpp') {
                    this.fppPosition.set(0, 2.2, -1.5); // Rear seat view
                }
                break;
        }
    }
}