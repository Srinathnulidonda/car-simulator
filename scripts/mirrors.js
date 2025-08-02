export class MirrorSystem {
    constructor(scene, renderer, vehicle) {
        this.scene = scene;
        this.renderer = renderer;
        this.vehicle = vehicle;

        this.mirrors = {
            left: null,
            right: null,
            rear: null
        };

        this.mirrorCameras = {
            left: null,
            right: null,
            rear: null
        };

        this.renderTargets = {
            left: null,
            right: null,
            rear: null
        };

        this.mirrorMeshes = {
            left: null,
            right: null,
            rear: null
        };

        // Mirror adjustment values
        this.adjustments = {
            leftMirrorH: 0,
            leftMirrorV: 0,
            rearMirrorH: 0,
            rearMirrorV: 0,
            rightMirrorH: 0,
            rightMirrorV: 0
        };

        // Fog and glare effects
        this.weatherEffects = {
            fog: 0,
            rain: 0,
            glare: 0
        };

        this.init();
    }

    init() {
        this.createRenderTargets();
        this.createMirrorCameras();
        this.createMirrorMeshes();
        this.setupMirrorShaders();
    }

    createRenderTargets() {
        const renderTargetOptions = {
            width: 256,
            height: 256,
            format: THREE.RGBFormat,
            generateMipmaps: false,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter
        };

        this.renderTargets.left = new THREE.WebGLRenderTarget(256, 256, renderTargetOptions);
        this.renderTargets.right = new THREE.WebGLRenderTarget(256, 256, renderTargetOptions);
        this.renderTargets.rear = new THREE.WebGLRenderTarget(512, 256, renderTargetOptions);
    }

    createMirrorCameras() {
        // Left mirror camera
        this.mirrorCameras.left = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

        // Right mirror camera  
        this.mirrorCameras.right = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

        // Rear mirror camera
        this.mirrorCameras.rear = new THREE.PerspectiveCamera(60, 2, 0.1, 1000);
    }

    createMirrorMeshes() {
        // Create mirror surfaces in the vehicle interior
        this.createLeftMirror();
        this.createRightMirror();
        this.createRearMirror();
    }

    createLeftMirror() {
        const geometry = new THREE.PlaneGeometry(0.3, 0.2);
        const material = new THREE.MeshBasicMaterial({
            map: this.renderTargets.left.texture,
            transparent: true,
            opacity: 0.9
        });

        this.mirrorMeshes.left = new THREE.Mesh(geometry, material);
        this.mirrorMeshes.left.position.set(-2.3, 2.4, 1.8);
        this.mirrorMeshes.left.rotation.y = 0.3;

        // Add mirror frame
        const frameGeometry = new THREE.PlaneGeometry(0.35, 0.25);
        const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.z = -0.01;
        this.mirrorMeshes.left.add(frame);

        this.vehicle.mesh.add(this.mirrorMeshes.left);
    }

    createRightMirror() {
        const geometry = new THREE.PlaneGeometry(0.3, 0.2);
        const material = new THREE.MeshBasicMaterial({
            map: this.renderTargets.right.texture,
            transparent: true,
            opacity: 0.9
        });

        this.mirrorMeshes.right = new THREE.Mesh(geometry, material);
        this.mirrorMeshes.right.position.set(2.3, 2.4, 1.8);
        this.mirrorMeshes.right.rotation.y = -0.3;

        // Add mirror frame
        const frameGeometry = new THREE.PlaneGeometry(0.35, 0.25);
        const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.z = -0.01;
        this.mirrorMeshes.right.add(frame);

        this.vehicle.mesh.add(this.mirrorMeshes.right);
    }

    createRearMirror() {
        const geometry = new THREE.PlaneGeometry(0.4, 0.15);
        const material = new THREE.MeshBasicMaterial({
            map: this.renderTargets.rear.texture,
            transparent: true,
            opacity: 0.9
        });

        this.mirrorMeshes.rear = new THREE.Mesh(geometry, material);
        this.mirrorMeshes.rear.position.set(0, 2.7, 2);

        // Add mirror frame
        const frameGeometry = new THREE.PlaneGeometry(0.45, 0.2);
        const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.z = -0.01;
        this.mirrorMeshes.rear.add(frame);

        this.vehicle.mesh.add(this.mirrorMeshes.rear);
    }

    setupMirrorShaders() {
        // Add fog and glare effects to mirrors
        this.createFogOverlay();
        this.createGlareEffect();
    }

    createFogOverlay() {
        // Fog overlay shader for mirrors
        const fogVertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fogFragmentShader = `
            uniform sampler2D tDiffuse;
            uniform float fogAmount;
            uniform float time;
            varying vec2 vUv;
            
            void main() {
                vec4 color = texture2D(tDiffuse, vUv);
                
                // Add fog effect
                float fog = fogAmount * (0.5 + 0.5 * sin(time * 0.1 + vUv.x * 10.0));
                color.rgb = mix(color.rgb, vec3(0.8, 0.8, 0.9), fog);
                
                gl_FragColor = color;
            }
        `;

        this.fogMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                fogAmount: { value: 0.0 },
                time: { value: 0.0 }
            },
            vertexShader: fogVertexShader,
            fragmentShader: fogFragmentShader,
            transparent: true
        });
    }

    createGlareEffect() {
        // Glare effect for mirrors in bright sunlight
        const glareVertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const glareFragmentShader = `
            uniform sampler2D tDiffuse;
            uniform float glareIntensity;
            uniform vec2 glarePosition;
            varying vec2 vUv;
            
            void main() {
                vec4 color = texture2D(tDiffuse, vUv);
                
                // Calculate distance from glare position
                float dist = distance(vUv, glarePosition);
                float glare = glareIntensity * (1.0 - smoothstep(0.0, 0.5, dist));
                
                // Add glare effect
                color.rgb += vec3(glare * 0.8, glare * 0.9, glare);
                
                gl_FragColor = color;
            }
        `;

        this.glareMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                glareIntensity: { value: 0.0 },
                glarePosition: { value: new THREE.Vector2(0.5, 0.3) }
            },
            vertexShader: glareVertexShader,
            fragmentShader: glareFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
    }

    update() {
        if (!this.vehicle.mesh) return;

        this.updateMirrorPositions();
        this.updateWeatherEffects();
    }

    updateMirrorPositions() {
        const vehicleMatrix = this.vehicle.mesh.matrixWorld;

        // Update left mirror camera
        if (this.mirrorCameras.left) {
            const leftMirrorPos = this.vehicle.mirrorPositions.left.clone();
            leftMirrorPos.applyMatrix4(vehicleMatrix);

            this.mirrorCameras.left.position.copy(leftMirrorPos);

            // Calculate look direction for left mirror
            const leftLookDirection = new THREE.Vector3(-1, -0.2, -1);
            leftLookDirection.normalize();

            // Apply adjustments
            const leftAdjustMatrix = new THREE.Matrix4();
            leftAdjustMatrix.makeRotationFromEuler(new THREE.Euler(
                this.adjustments.leftMirrorV * Math.PI / 180,
                this.adjustments.leftMirrorH * Math.PI / 180,
                0
            ));
            leftLookDirection.applyMatrix4(leftAdjustMatrix);

            // Apply vehicle rotation
            const vehicleRotationMatrix = new THREE.Matrix4();
            vehicleRotationMatrix.extractRotation(vehicleMatrix);
            leftLookDirection.applyMatrix4(vehicleRotationMatrix);

            this.mirrorCameras.left.lookAt(leftMirrorPos.clone().add(leftLookDirection));
        }

        // Update right mirror camera
        if (this.mirrorCameras.right) {
            const rightMirrorPos = this.vehicle.mirrorPositions.right.clone();
            rightMirrorPos.applyMatrix4(vehicleMatrix);

            this.mirrorCameras.right.position.copy(rightMirrorPos);

            // Calculate look direction for right mirror
            const rightLookDirection = new THREE.Vector3(1, -0.2, -1);
            rightLookDirection.normalize();

            // Apply adjustments
            const rightAdjustMatrix = new THREE.Matrix4();
            rightAdjustMatrix.makeRotationFromEuler(new THREE.Euler(
                this.adjustments.rightMirrorV * Math.PI / 180,
                this.adjustments.rightMirrorH * Math.PI / 180,
                0
            ));
            rightLookDirection.applyMatrix4(rightAdjustMatrix);

            // Apply vehicle rotation
            const vehicleRotationMatrix = new THREE.Matrix4();
            vehicleRotationMatrix.extractRotation(vehicleMatrix);
            rightLookDirection.applyMatrix4(vehicleRotationMatrix);

            this.mirrorCameras.right.lookAt(rightMirrorPos.clone().add(rightLookDirection));
        }

        // Update rear mirror camera
        if (this.mirrorCameras.rear) {
            const rearMirrorPos = this.vehicle.mirrorPositions.rear.clone();
            rearMirrorPos.applyMatrix4(vehicleMatrix);

            this.mirrorCameras.rear.position.copy(rearMirrorPos);

            // Calculate look direction for rear mirror
            const rearLookDirection = new THREE.Vector3(0, 0, -1);

            // Apply adjustments
            const rearAdjustMatrix = new THREE.Matrix4();
            rearAdjustMatrix.makeRotationFromEuler(new THREE.Euler(
                this.adjustments.rearMirrorV * Math.PI / 180,
                this.adjustments.rearMirrorH * Math.PI / 180,
                0
            ));
            rearLookDirection.applyMatrix4(rearAdjustMatrix);

            // Apply vehicle rotation
            const vehicleRotationMatrix = new THREE.Matrix4();
            vehicleRotationMatrix.extractRotation(vehicleMatrix);
            rearLookDirection.applyMatrix4(vehicleRotationMatrix);

            this.mirrorCameras.rear.lookAt(rearMirrorPos.clone().add(rearLookDirection));
        }
    }

    updateWeatherEffects() {
        // Update fog and glare based on weather conditions
        if (this.fogMaterial) {
            this.fogMaterial.uniforms.fogAmount.value = this.weatherEffects.fog;
            this.fogMaterial.uniforms.time.value += 0.016;
        }

        if (this.glareMaterial) {
            this.glareMaterial.uniforms.glareIntensity.value = this.weatherEffects.glare;
        }
    }

    render() {
        // Store original render target
        const originalRenderTarget = this.renderer.getRenderTarget();

        // Render each mirror
        this.renderMirror('left');
        this.renderMirror('right');
        this.renderMirror('rear');

        // Restore original render target
        this.renderer.setRenderTarget(originalRenderTarget);
    }

    renderMirror(mirrorType) {
        const camera = this.mirrorCameras[mirrorType];
        const renderTarget = this.renderTargets[mirrorType];

        if (!camera || !renderTarget) return;

        // Hide the vehicle from mirror reflection to avoid infinite recursion
        const originalVisible = this.vehicle.mesh.visible;
        this.vehicle.mesh.visible = false;

        // Hide the specific mirror being rendered
        if (this.mirrorMeshes[mirrorType]) {
            this.mirrorMeshes[mirrorType].visible = false;
        }

        // Render to mirror texture
        this.renderer.setRenderTarget(renderTarget);
        this.renderer.clear();
        this.renderer.render(this.scene, camera);

        // Restore visibility
        this.vehicle.mesh.visible = originalVisible;
        if (this.mirrorMeshes[mirrorType]) {
            this.mirrorMeshes[mirrorType].visible = true;
        }
    }

    adjustMirror(controlId, value) {
        if (this.adjustments.hasOwnProperty(controlId)) {
            this.adjustments[controlId] = value;
        }
    }

    resetAll() {
        // Reset all mirror adjustments
        Object.keys(this.adjustments).forEach(key => {
            this.adjustments[key] = 0;
        });

        // Update UI sliders
        document.getElementById('leftMirrorH').value = 0;
        document.getElementById('leftMirrorV').value = 0;
        document.getElementById('rearMirrorH').value = 0;
        document.getElementById('rearMirrorV').value = 0;
        document.getElementById('rightMirrorH').value = 0;
        document.getElementById('rightMirrorV').value = 0;
    }

    setWeatherEffect(type, intensity) {
        switch (type) {
            case 'fog':
                this.weatherEffects.fog = intensity;
                break;
            case 'rain':
                this.weatherEffects.rain = intensity;
                this.addRainDrops(intensity);
                break;
            case 'glare':
                this.weatherEffects.glare = intensity;
                break;
        }
    }

    addRainDrops(intensity) {
        // Add rain drop effects to mirrors
        Object.values(this.mirrorMeshes).forEach(mirror => {
            if (!mirror) return;

            // Remove existing rain drops
            const rainDrops = mirror.children.filter(child => child.userData.isRainDrop);
            rainDrops.forEach(drop => mirror.remove(drop));

            // Add new rain drops based on intensity
            const dropCount = Math.floor(intensity * 20);
            for (let i = 0; i < dropCount; i++) {
                const dropGeometry = new THREE.SphereGeometry(0.002, 4, 4);
                const dropMaterial = new THREE.MeshBasicMaterial({
                    color: 0x87CEEB,
                    transparent: true,
                    opacity: 0.7
                });
                const rainDrop = new THREE.Mesh(dropGeometry, dropMaterial);

                rainDrop.position.set(
                    (Math.random() - 0.5) * 0.3,
                    (Math.random() - 0.5) * 0.2,
                    0.001
                );
                rainDrop.userData.isRainDrop = true;

                mirror.add(rainDrop);

                // Animate rain drop
                const animateRainDrop = () => {
                    rainDrop.position.y -= 0.001;
                    if (rainDrop.position.y < -0.1) {
                        mirror.remove(rainDrop);
                    } else {
                        requestAnimationFrame(animateRainDrop);
                    }
                };
                setTimeout(animateRainDrop, Math.random() * 2000);
            }
        });
    }

    // Auto-adjust mirrors based on driver height
    autoAdjustForDriverHeight(height) {
        const heightOffset = (height - 1.75) * 10; // Assume 1.75m as baseline

        this.adjustments.leftMirrorV = heightOffset;
        this.adjustments.rightMirrorV = heightOffset;
        this.adjustments.rearMirrorV = heightOffset * 0.5;

        // Update UI
        document.getElementById('leftMirrorV').value = heightOffset;
        document.getElementById('rightMirrorV').value = heightOffset;
        document.getElementById('rearMirrorV').value = heightOffset * 0.5;
    }

    // Mirror cleaning animation
    cleanMirror(mirrorType) {
        const mirror = this.mirrorMeshes[mirrorType];
        if (!mirror) return;

        // Remove all rain drops and fog
        const effects = mirror.children.filter(child =>
            child.userData.isRainDrop || child.userData.isFog
        );
        effects.forEach(effect => mirror.remove(effect));

        // Add cleaning animation
        const cleanGeometry = new THREE.RingGeometry(0.05, 0.15, 16);
        const cleanMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3
        });
        const cleanEffect = new THREE.Mesh(cleanGeometry, cleanMaterial);
        cleanEffect.position.z = 0.002;
        mirror.add(cleanEffect);

        // Animate cleaning effect
        let scale = 0;
        const animateClean = () => {
            scale += 0.1;
            cleanEffect.scale.setScalar(scale);
            cleanEffect.material.opacity = 0.3 - (scale * 0.3);

            if (scale < 1) {
                requestAnimationFrame(animateClean);
            } else {
                mirror.remove(cleanEffect);
            }
        };
        animateClean();
    }
}