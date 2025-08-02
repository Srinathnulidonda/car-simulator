export class UISystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.elements = {};
        this.animations = {};
        this.notifications = [];

        this.initializeElements();
        this.setupEventListeners();
        this.startAnimationLoop();
    }

    initializeElements() {
        // Speed and RPM displays
        this.elements.speed = document.getElementById('speedValue');
        this.elements.speedDisplay = document.getElementById('speedDisplay');
        this.elements.rpm = document.getElementById('rpmValue');
        this.elements.gear = document.getElementById('gearValue');

        // Fuel system
        this.elements.fuelLevel = document.getElementById('fuelLevel');
        this.elements.fuelPercent = document.getElementById('fuelPercent');

        // Game state
        this.elements.money = document.getElementById('playerMoney');
        this.elements.damage = document.getElementById('damage');

        // Weather and environment
        this.elements.weatherStatus = document.getElementById('weatherStatus');
        this.elements.timeStatus = document.getElementById('timeStatus');

        // Minimap
        this.elements.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.elements.minimapCanvas?.getContext('2d');

        // Control panels
        this.elements.mirrorControls = document.getElementById('mirrorControls');
        this.elements.seatControls = document.getElementById('seatControls');

        // Initialize speedometer animation
        this.initSpeedometerAnimation();
    }

    initSpeedometerAnimation() {
        // Create animated speedometer needle
        if (this.elements.speedDisplay) {
            const speedometer = this.elements.speedDisplay.parentElement;
            speedometer.style.position = 'relative';

            // Create needle element
            const needle = document.createElement('div');
            needle.style.cssText = `
                position: absolute;
                width: 2px;
                height: 60px;
                background: #ff0000;
                top: 50%;
                left: 50%;
                transform-origin: bottom center;
                transform: translate(-50%, -100%) rotate(-90deg);
                transition: transform 0.2s ease;
                z-index: 101;
            `;
            speedometer.appendChild(needle);
            this.elements.speedNeedle = needle;

            // Create RPM needle
            const rpmNeedle = document.createElement('div');
            rpmNeedle.style.cssText = `
                position: absolute;
                width: 1px;
                height: 40px;
                background: #00ff00;
                top: 65%;
                left: 50%;
                transform-origin: bottom center;
                transform: translate(-50%, -100%) rotate(-90deg);
                transition: transform 0.2s ease;
                z-index: 101;
            `;
            speedometer.appendChild(rpmNeedle);
            this.elements.rpmNeedle = rpmNeedle;
        }
    }

    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());

        // Keyboard shortcuts for UI
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });

        // Custom game events
        window.addEventListener('vehicleColorChange', (event) => {
            this.showNotification(`Vehicle painted ${this.getColorName(event.detail.color)}!`, 'success');
        });

        window.addEventListener('vehicleRepair', () => {
            this.showNotification('Vehicle fully repaired!', 'success');
            this.playRepairAnimation();
        });

        window.addEventListener('vehicleUpgrade', (event) => {
            const { type } = event.detail;
            this.showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} upgraded!`, 'success');
            this.playUpgradeAnimation(type);
        });

        // Speed-based UI effects
        this.setupSpeedBasedEffects();
    }

    setupSpeedBasedEffects() {
        this.speedEffects = {
            lastSpeed: 0,
            shakeIntensity: 0,
            blurAmount: 0
        };
    }

    handleKeyboardShortcuts(event) {
        switch (event.code) {
            case 'F1':
                this.toggleHUD();
                event.preventDefault();
                break;
            case 'F2':
                this.toggleMinimap();
                event.preventDefault();
                break;
            case 'F3':
                this.toggleDebugInfo();
                event.preventDefault();
                break;
            case 'Tab':
                this.toggleControlsGuide();
                event.preventDefault();
                break;
        }
    }

    update(gameState) {
        this.gameState = gameState;
        this.updateSpeedometer();
        this.updateFuelGauge();
        this.updateGameInfo();
        this.updateMinimap();
        this.updateSpeedEffects();
        this.updateAnimations();
        this.updateNotifications();
    }

    updateSpeedometer() {
        const speed = Math.round(this.gameState.speed || 0);
        const rpm = Math.round(this.gameState.rpm || 800);

        // Update speed display
        if (this.elements.speed) {
            this.elements.speed.textContent = speed;
            this.animateValueChange(this.elements.speed, speed);
        }

        if (this.elements.speedDisplay) {
            this.elements.speedDisplay.textContent = speed;
        }

        // Update RPM display
        if (this.elements.rpm) {
            this.elements.rpm.textContent = rpm;
            this.animateValueChange(this.elements.rpm, rpm);
        }

        // Update gear display
        if (this.elements.gear) {
            this.elements.gear.textContent = this.gameState.gear || 1;
        }

        // Update speedometer needle
        if (this.elements.speedNeedle) {
            const maxSpeed = 200; // km/h
            const angle = -90 + (speed / maxSpeed) * 180;
            this.elements.speedNeedle.style.transform =
                `translate(-50%, -100%) rotate(${Math.min(angle, 90)}deg)`;
        }

        // Update RPM needle
        if (this.elements.rpmNeedle) {
            const maxRPM = 8000;
            const angle = -90 + (rpm / maxRPM) * 180;
            this.elements.rpmNeedle.style.transform =
                `translate(-50%, -100%) rotate(${Math.min(angle, 90)}deg)`;

            // Change color based on RPM
            if (rpm > 6000) {
                this.elements.rpmNeedle.style.background = '#ff0000'; // Red zone
            } else if (rpm > 4000) {
                this.elements.rpmNeedle.style.background = '#ffff00'; // Yellow zone
            } else {
                this.elements.rpmNeedle.style.background = '#00ff00'; // Green zone
            }
        }
    }

    updateFuelGauge() {
        const fuel = this.gameState.fuel || 100;

        if (this.elements.fuelLevel) {
            this.elements.fuelLevel.style.height = `${fuel}%`;

            // Change color based on fuel level
            if (fuel < 20) {
                this.elements.fuelLevel.style.background = '#ff0000'; // Red
                this.addFuelWarning();
            } else if (fuel < 40) {
                this.elements.fuelLevel.style.background = '#ffaa00'; // Orange
            } else {
                this.elements.fuelLevel.style.background = 'linear-gradient(to top, #ff0000 0%, #ffff00 50%, #00ff00 100%)';
            }
        }

        if (this.elements.fuelPercent) {
            this.elements.fuelPercent.textContent = fuel.toFixed(1);
        }
    }

    addFuelWarning() {
        if (!this.fuelWarning) {
            this.fuelWarning = setInterval(() => {
                if (this.elements.fuelLevel) {
                    this.elements.fuelLevel.style.animation = 'blink 1s infinite';
                }
                this.showNotification('Low Fuel Warning!', 'warning');
            }, 5000);
        }
    }

    removeFuelWarning() {
        if (this.fuelWarning) {
            clearInterval(this.fuelWarning);
            this.fuelWarning = null;
            if (this.elements.fuelLevel) {
                this.elements.fuelLevel.style.animation = '';
            }
        }
    }

    updateGameInfo() {
        // Update money display
        if (this.elements.money) {
            this.elements.money.textContent = this.gameState.money || 0;
        }

        // Update damage display
        if (this.elements.damage) {
            const damage = this.gameState.damage || 0;
            this.elements.damage.textContent = damage.toFixed(1);

            // Change color based on damage
            if (damage > 70) {
                this.elements.damage.style.color = '#ff0000';
            } else if (damage > 40) {
                this.elements.damage.style.color = '#ffaa00';
            } else {
                this.elements.damage.style.color = '#00ff00';
            }
        }

        // Update time display
        if (this.elements.timeStatus) {
            const hour = Math.floor(this.gameState.timeOfDay || 12);
            const minute = Math.floor(((this.gameState.timeOfDay || 12) % 1) * 60);
            this.elements.timeStatus.textContent =
                `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }
    }

    updateMinimap() {
        if (!this.minimapCtx) return;

        const canvas = this.elements.minimapCanvas;
        const ctx = this.minimapCtx;

        // Clear minimap
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background
        ctx.fillStyle = '#2c5234';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

        // Draw roads (simplified)
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();

        // Draw player position
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw shops
        if (this.gameState.nearbyShops) {
            ctx.fillStyle = '#00ff00';
            this.gameState.nearbyShops.forEach(shop => {
                ctx.beginPath();
                ctx.arc(shop.minimapX, shop.minimapY, 2, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Draw compass
        this.drawCompass(ctx, canvas.width - 20, 20);
    }

    drawCompass(ctx, x, y) {
        const radius = 15;

        // Compass background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Compass border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // North indicator
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(x, y - radius + 3);
        ctx.lineTo(x - 3, y - radius + 8);
        ctx.lineTo(x + 3, y - radius + 8);
        ctx.closePath();
        ctx.fill();

        // N label
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('N', x, y + 3);
    }

    updateSpeedEffects() {
        const speed = this.gameState.speed || 0;
        const speedDiff = Math.abs(speed - this.speedEffects.lastSpeed);

        // Screen shake based on speed and acceleration
        if (speed > 80) {
            this.speedEffects.shakeIntensity = (speed - 80) / 100;
            this.applyScreenShake(this.speedEffects.shakeIntensity);
        } else {
            this.speedEffects.shakeIntensity = 0;
        }

        // Speed blur effect
        if (speed > 120) {
            this.speedEffects.blurAmount = (speed - 120) / 80;
            this.applySpeedBlur(this.speedEffects.blurAmount);
        } else {
            this.speedEffects.blurAmount = 0;
            this.removeSpeedBlur();
        }

        // Color shift for high speeds
        if (speed > 150) {
            this.applyHighSpeedTint();
        } else {
            this.removeHighSpeedTint();
        }

        this.speedEffects.lastSpeed = speed;
    }

    applyScreenShake(intensity) {
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            const shakeX = (Math.random() - 0.5) * intensity * 4;
            const shakeY = (Math.random() - 0.5) * intensity * 4;
            gameContainer.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
        }
    }

    applySpeedBlur(amount) {
        const gameCanvas = document.getElementById('gameCanvas');
        if (gameCanvas) {
            gameCanvas.style.filter = `blur(${amount * 2}px)`;
        }
    }

    removeSpeedBlur() {
        const gameCanvas = document.getElementById('gameCanvas');
        if (gameCanvas) {
            gameCanvas.style.filter = '';
        }
    }

    applyHighSpeedTint() {
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer && !gameContainer.classList.contains('high-speed')) {
            gameContainer.classList.add('high-speed');

            // Add high speed tint styles if not exists
            if (!document.getElementById('high-speed-styles')) {
                const style = document.createElement('style');
                style.id = 'high-speed-styles';
                style.textContent = `
                    .high-speed::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: radial-gradient(ellipse at center, transparent 20%, rgba(255,100,100,0.1) 80%);
                        pointer-events: none;
                        z-index: 50;
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    removeHighSpeedTint() {
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.classList.remove('high-speed');
        }
    }

    updateAnimations() {
        // Update ongoing animations
        Object.keys(this.animations).forEach(key => {
            const animation = this.animations[key];
            if (animation && animation.update) {
                animation.update();
            }
        });
    }

    updateNotifications() {
        this.notifications = this.notifications.filter(notification => {
            notification.timeLeft -= 16; // Assume 60fps

            if (notification.timeLeft <= 0) {
                if (notification.element && notification.element.parentNode) {
                    notification.element.parentNode.removeChild(notification.element);
                }
                return false;
            }

            // Fade out in last 500ms
            if (notification.timeLeft < 500) {
                const opacity = notification.timeLeft / 500;
                notification.element.style.opacity = opacity;
            }

            return true;
        });
    }

    animateValueChange(element, newValue) {
        if (!element || element.textContent === newValue.toString()) return;

        element.style.transform = 'scale(1.2)';
        element.style.color = '#ffff00';

        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 200);
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            font-size: 14px;
            font-weight: bold;
            z-index: 1000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Store notification data
        const notificationData = {
            element: notification,
            timeLeft: duration,
            type: type
        };

        this.notifications.push(notificationData);

        // Position multiple notifications
        this.repositionNotifications();
    }

    getNotificationColor(type) {
        const colors = {
            success: 'rgba(46, 204, 113, 0.9)',
            error: 'rgba(231, 76, 60, 0.9)',
            warning: 'rgba(241, 196, 15, 0.9)',
            info: 'rgba(52, 152, 219, 0.9)'
        };
        return colors[type] || colors.info;
    }

    repositionNotifications() {
        this.notifications.forEach((notification, index) => {
            if (notification.element) {
                notification.element.style.top = `${20 + (index * 70)}px`;
            }
        });
    }

    playRepairAnimation() {
        const damage = this.elements.damage?.parentElement;
        if (damage) {
            damage.style.animation = 'repairGlow 1s ease-out';
            setTimeout(() => {
                damage.style.animation = '';
            }, 1000);
        }

        // Add repair animation styles if not exists
        if (!document.getElementById('repair-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'repair-animation-styles';
            style.textContent = `
                @keyframes repairGlow {
                    0% { box-shadow: 0 0 0 rgba(46, 204, 113, 0); }
                    50% { box-shadow: 0 0 20px rgba(46, 204, 113, 0.8); }
                    100% { box-shadow: 0 0 0 rgba(46, 204, 113, 0); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    playUpgradeAnimation(upgradeType) {
        const speedometer = document.querySelector('.speedometer');
        if (speedometer) {
            speedometer.style.animation = 'upgradeBoost 1.5s ease-out';
            setTimeout(() => {
                speedometer.style.animation = '';
            }, 1500);
        }

        // Add upgrade animation styles if not exists
        if (!document.getElementById('upgrade-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'upgrade-animation-styles';
            style.textContent = `
                @keyframes upgradeBoost {
                    0% { transform: scale(1); }
                    25% { transform: scale(1.1); box-shadow: 0 0 30px rgba(255, 215, 0, 0.8); }
                    75% { transform: scale(1.05); box-shadow: 0 0 20px rgba(255, 215, 0, 0.6); }
                    100% { transform: scale(1); box-shadow: 0 0 0 rgba(255, 215, 0, 0); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    getColorName(colorHex) {
        const colorNames = {
            0xff0000: 'Red',
            0x00ff00: 'Green',
            0x0000ff: 'Blue',
            0xffff00: 'Yellow',
            0xff00ff: 'Magenta',
            0x00ffff: 'Cyan',
            0xffffff: 'White',
            0x000000: 'Black'
        };
        return colorNames[colorHex] || 'Custom Color';
    }

    // UI Toggle methods
    toggleHUD() {
        const hud = document.getElementById('gameHUD');
        if (hud) {
            hud.style.display = hud.style.display === 'none' ? 'block' : 'none';
        }
    }

    toggleMinimap() {
        const minimap = document.querySelector('.minimap');
        if (minimap) {
            minimap.style.display = minimap.style.display === 'none' ? 'block' : 'none';
        }
    }

    toggleDebugInfo() {
        let debugPanel = document.getElementById('debugPanel');

        if (!debugPanel) {
            debugPanel = this.createDebugPanel();
            document.body.appendChild(debugPanel);
        } else {
            debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
        }
    }

    createDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'debugPanel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            padding: 15px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            z-index: 999;
            min-width: 200px;
        `;

        // Update debug info periodically
        setInterval(() => {
            if (panel.style.display !== 'none') {
                panel.innerHTML = `
                    <h4>Debug Info</h4>
                    <div>Speed: ${(this.gameState.speed || 0).toFixed(1)} km/h</div>
                    <div>RPM: ${Math.round(this.gameState.rpm || 800)}</div>
                    <div>Gear: ${this.gameState.gear || 1}</div>
                    <div>Fuel: ${(this.gameState.fuel || 100).toFixed(1)}%</div>
                    <div>Damage: ${(this.gameState.damage || 0).toFixed(1)}%</div>
                    <div>Money: $${this.gameState.money || 0}</div>
                    <div>FPS: ${this.getFPS()}</div>
                    <div>Memory: ${this.getMemoryUsage()}</div>
                `;
            }
        }, 100);

        return panel;
    }

    toggleControlsGuide() {
        const guide = document.querySelector('.controls-guide');
        if (guide) {
            guide.style.display = guide.style.display === 'none' ? 'block' : 'none';
        }
    }

    getFPS() {
        // Simple FPS counter
        if (!this.fpsCounter) {
            this.fpsCounter = { frames: 0, lastTime: Date.now() };
        }

        this.fpsCounter.frames++;
        const now = Date.now();

        if (now - this.fpsCounter.lastTime >= 1000) {
            const fps = this.fpsCounter.frames;
            this.fpsCounter.frames = 0;
            this.fpsCounter.lastTime = now;
            this.fpsCounter.currentFPS = fps;
        }

        return this.fpsCounter.currentFPS || 60;
    }

    getMemoryUsage() {
        if (performance.memory) {
            const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
            return `${used} MB`;
        }
        return 'N/A';
    }

    handleResize() {
        // Adjust UI elements for different screen sizes
        const width = window.innerWidth;
        const height = window.innerHeight;

        if (width < 768) {
            // Mobile adjustments
            this.applyMobileLayout();
        } else {
            // Desktop layout
            this.applyDesktopLayout();
        }
    }

    applyMobileLayout() {
        const speedometer = document.querySelector('.speedometer');
        if (speedometer) {
            speedometer.style.width = '100px';
            speedometer.style.height = '100px';
            speedometer.style.fontSize = '14px';
        }

        const hud = document.querySelector('.hud-container');
        if (hud) {
            hud.style.fontSize = '12px';
        }
    }

    applyDesktopLayout() {
        const speedometer = document.querySelector('.speedometer');
        if (speedometer) {
            speedometer.style.width = '150px';
            speedometer.style.height = '150px';
            speedometer.style.fontSize = '16px';
        }

        const hud = document.querySelector('.hud-container');
        if (hud) {
            hud.style.fontSize = '14px';
        }
    }

    startAnimationLoop() {
        const animate = () => {
            this.updateAnimations();
            requestAnimationFrame(animate);
        };
        animate();
    }
}