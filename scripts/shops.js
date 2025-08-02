export class ShopSystem {
    constructor(shopLocations, gameState) {
        this.shops = shopLocations;
        this.gameState = gameState;
        this.currentShop = null;
        this.proximityDistance = 15;
        this.shopInterface = document.getElementById('shopInterface');

        this.shopTypes = {
            gas: {
                name: '⛽ Gas Station',
                services: ['refuel', 'snacks', 'carWash'],
                icon: '⛽'
            },
            repair: {
                name: '🔧 Auto Repair',
                services: ['repair', 'maintenance', 'diagnostics'],
                icon: '🔧'
            },
            paint: {
                name: '🎨 Paint Shop',
                services: ['paint', 'decals', 'wraps'],
                icon: '🎨'
            },
            tuning: {
                name: '⚡ Tuning Shop',
                services: ['engine', 'suspension', 'tires', 'exhaust'],
                icon: '⚡'
            }
        };

        this.services = {
            refuel: { price: 50, description: 'Fill up tank' },
            repair: { price: 100, description: 'Fix all damage' },
            paint: { price: 200, description: 'New paint job' },
            carWash: { price: 20, description: 'Clean your car' },
            engineUpgrade: { price: 500, description: 'Increase engine power' },
            tireUpgrade: { price: 300, description: 'Better tire grip' },
            suspensionUpgrade: { price: 400, description: 'Improved handling' },
            exhaustUpgrade: { price: 250, description: 'Sport exhaust system' },
            turboUpgrade: { price: 800, description: 'Turbo boost system' },
            brakesUpgrade: { price: 350, description: 'Performance brakes' }
        };

        this.paintColors = [
            { name: 'Racing Red', color: 0xff0000, price: 200 },
            { name: 'Ocean Blue', color: 0x0066cc, price: 200 },
            { name: 'Forest Green', color: 0x228B22, price: 200 },
            { name: 'Sunset Orange', color: 0xff6600, price: 250 },
            { name: 'Royal Purple', color: 0x6600cc, price: 250 },
            { name: 'Metallic Silver', color: 0xc0c0c0, price: 300 },
            { name: 'Pearl White', color: 0xffffff, price: 300 },
            { name: 'Midnight Black', color: 0x000000, price: 300 },
            { name: 'Chrome', color: 0xe6e6e6, price: 500 },
            { name: 'Gold', color: 0xffd700, price: 600 }
        ];

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Shop interface buttons
        document.addEventListener('click', (event) => {
            const target = event.target;

            if (target.classList.contains('shop-service-btn')) {
                const service = target.dataset.service;
                this.purchaseService(service);
            }

            if (target.classList.contains('paint-color-btn')) {
                const colorIndex = parseInt(target.dataset.colorIndex);
                this.purchasePaint(colorIndex);
            }
        });

        // Close shop with Escape key
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Escape' && this.currentShop) {
                this.closeShop();
            }
        });
    }

    update(vehiclePosition) {
        this.checkProximityIndicators(vehiclePosition);
        this.updateShopAnimations();
    }

    checkProximityIndicators(vehiclePosition) {
        this.shops.forEach(shop => {
            const distance = vehiclePosition.distanceTo(shop.position);

            if (distance < this.proximityDistance * 2) {
                this.showProximityIndicator(shop, distance);
            } else {
                this.hideProximityIndicator(shop);
            }
        });
    }

    showProximityIndicator(shop, distance) {
        if (!shop.indicator) {
            shop.indicator = this.createProximityIndicator(shop);
        }

        // Update indicator opacity based on distance
        const opacity = Math.max(0, 1 - (distance / (this.proximityDistance * 2)));
        shop.indicator.material.opacity = opacity;

        // Add pulsing animation when very close
        if (distance < this.proximityDistance) {
            const pulseScale = 1 + Math.sin(Date.now() * 0.01) * 0.2;
            shop.indicator.scale.setScalar(pulseScale);
        }
    }

    hideProximityIndicator(shop) {
        if (shop.indicator) {
            shop.indicator.visible = false;
        }
    }

    createProximityIndicator(shop) {
        const shopType = this.shopTypes[shop.type];

        // Create floating indicator above shop
        const indicatorGeometry = new THREE.PlaneGeometry(8, 2);
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');

        // Draw indicator background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, 400, 100);

        // Draw border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, 396, 96);

        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${shopType.icon} ${shopType.name}`, 200, 35);

        ctx.font = '16px Arial';
        ctx.fillText('Press F to Enter', 200, 65);

        const indicatorTexture = new THREE.CanvasTexture(canvas);
        const indicatorMaterial = new THREE.MeshBasicMaterial({
            map: indicatorTexture,
            transparent: true,
            opacity: 0
        });

        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.copy(shop.position);
        indicator.position.y += 25;

        // Make indicator always face camera
        indicator.lookAt(0, indicator.position.y, 0);

        shop.mesh.add(indicator);
        return indicator;
    }

    checkProximity(vehiclePosition) {
        for (let shop of this.shops) {
            const distance = vehiclePosition.distanceTo(shop.position);
            if (distance < this.proximityDistance) {
                return shop;
            }
        }
        return null;
    }

    openShop(shop) {
        this.currentShop = shop;
        this.populateShopInterface(shop);
        this.shopInterface.classList.add('active');

        // Play shop enter sound
        this.playShopEnterSound();

        // Update shop title
        const shopType = this.shopTypes[shop.type];
        document.getElementById('shopTitle').textContent = shopType.name;
    }

    populateShopInterface(shop) {
        const shopOptions = document.querySelector('.shop-options');
        shopOptions.innerHTML = '';

        const shopType = this.shopTypes[shop.type];

        switch (shop.type) {
            case 'gas':
                this.populateGasStation(shopOptions);
                break;
            case 'repair':
                this.populateRepairShop(shopOptions);
                break;
            case 'paint':
                this.populatePaintShop(shopOptions);
                break;
            case 'tuning':
                this.populateTuningShop(shopOptions);
                break;
        }

        this.updateMoneyDisplay();
    }

    populateGasStation(container) {
        // Fuel service
        const fuelItem = this.createShopItem(
            'Fill Tank',
            this.services.refuel.price,
            'refuel',
            this.gameState.fuel < 100
        );
        container.appendChild(fuelItem);

        // Car wash service
        const washItem = this.createShopItem(
            'Car Wash',
            this.services.carWash.price,
            'carWash',
            true // Always available
        );
        container.appendChild(washItem);

        // Snacks (restore energy/health)
        const snacksItem = this.createShopItem(
            'Energy Drinks',
            15,
            'snacks',
            true
        );
        container.appendChild(snacksItem);

        // Show current fuel level
        const fuelInfo = document.createElement('div');
        fuelInfo.className = 'shop-info';
        fuelInfo.innerHTML = `<span>Current Fuel: ${this.gameState.fuel.toFixed(1)}%</span>`;
        container.appendChild(fuelInfo);
    }

    populateRepairShop(container) {
        // Main repair service
        const repairItem = this.createShopItem(
            'Complete Repair',
            this.services.repair.price,
            'repair',
            this.gameState.damage > 0
        );
        container.appendChild(repairItem);

        // Individual repair services
        if (this.gameState.damage > 20) {
            const bodyRepairItem = this.createShopItem(
                'Body Repair',
                60,
                'bodyRepair',
                true
            );
            container.appendChild(bodyRepairItem);
        }

        if (this.gameState.damage > 40) {
            const engineRepairItem = this.createShopItem(
                'Engine Repair',
                80,
                'engineRepair',
                true
            );
            container.appendChild(engineRepairItem);
        }

        // Maintenance services
        const maintenanceItem = this.createShopItem(
            'Oil Change',
            40,
            'maintenance',
            true
        );
        container.appendChild(maintenanceItem);

        // Show current damage
        const damageInfo = document.createElement('div');
        damageInfo.className = 'shop-info';
        damageInfo.innerHTML = `<span>Current Damage: ${this.gameState.damage.toFixed(1)}%</span>`;
        container.appendChild(damageInfo);
    }

    populatePaintShop(container) {
        // Paint color selection
        const colorGrid = document.createElement('div');
        colorGrid.className = 'paint-color-grid';
        colorGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 10px;
            margin: 20px 0;
        `;

        this.paintColors.forEach((colorOption, index) => {
            const colorButton = document.createElement('button');
            colorButton.className = 'paint-color-btn';
            colorButton.dataset.colorIndex = index;
            colorButton.style.cssText = `
                width: 60px;
                height: 40px;
                background-color: #${colorOption.color.toString(16).padStart(6, '0')};
                border: 2px solid #fff;
                border-radius: 5px;
                cursor: pointer;
                position: relative;
            `;

            // Add price label
            const priceLabel = document.createElement('span');
            priceLabel.textContent = `$${colorOption.price}`;
            priceLabel.style.cssText = `
                position: absolute;
                bottom: -20px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 10px;
                color: white;
            `;
            colorButton.appendChild(priceLabel);

            // Add name tooltip
            colorButton.title = colorOption.name;

            colorGrid.appendChild(colorButton);
        });

        container.appendChild(colorGrid);

        // Custom decals service
        const decalItem = this.createShopItem(
            'Racing Stripes',
            150,
            'decals',
            true
        );
        container.appendChild(decalItem);

        // Chrome package
        const chromeItem = this.createShopItem(
            'Chrome Package',
            400,
            'chrome',
            true
        );
        container.appendChild(chromeItem);
    }

    populateTuningShop(container) {
        // Engine upgrades
        const engineItem = this.createShopItem(
            'Engine Upgrade',
            this.services.engineUpgrade.price,
            'engineUpgrade',
            true
        );
        container.appendChild(engineItem);

        // Turbo upgrade
        const turboItem = this.createShopItem(
            'Turbo Kit',
            this.services.turboUpgrade.price,
            'turboUpgrade',
            !this.gameState.upgrades?.turbo
        );
        container.appendChild(turboItem);

        // Tire upgrade
        const tireItem = this.createShopItem(
            'Performance Tires',
            this.services.tireUpgrade.price,
            'tireUpgrade',
            true
        );
        container.appendChild(tireItem);

        // Suspension upgrade
        const suspensionItem = this.createShopItem(
            'Sport Suspension',
            this.services.suspensionUpgrade.price,
            'suspensionUpgrade',
            !this.gameState.upgrades?.suspension
        );
        container.appendChild(suspensionItem);

        // Brake upgrade
        const brakeItem = this.createShopItem(
            'Performance Brakes',
            this.services.brakesUpgrade.price,
            'brakesUpgrade',
            !this.gameState.upgrades?.brakes
        );
        container.appendChild(brakeItem);

        // Exhaust upgrade
        const exhaustItem = this.createShopItem(
            'Sport Exhaust',
            this.services.exhaustUpgrade.price,
            'exhaustUpgrade',
            !this.gameState.upgrades?.exhaust
        );
        container.appendChild(exhaustItem);
    }

    createShopItem(name, price, service, available) {
        const item = document.createElement('div');
        item.className = 'shop-item';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        nameSpan.style.color = available ? '#bdc3c7' : '#666';

        const button = document.createElement('button');
        button.textContent = `$${price}`;
        button.className = 'shop-service-btn';
        button.dataset.service = service;
        button.disabled = !available || this.gameState.money < price;

        if (!available) {
            button.textContent = 'N/A';
        } else if (this.gameState.money < price) {
            button.style.backgroundColor = '#666';
            button.style.cursor = 'not-allowed';
        }

        item.appendChild(nameSpan);
        item.appendChild(button);

        return item;
    }

    purchaseService(service) {
        const serviceData = this.services[service];
        if (!serviceData) return;

        if (this.gameState.money < serviceData.price) {
            this.showNotification('Not enough money!', 'error');
            return;
        }

        // Deduct money
        this.gameState.money -= serviceData.price;

        // Apply service effect
        this.applyServiceEffect(service);

        // Show success notification
        this.showNotification(`${serviceData.description} completed!`, 'success');

        // Update interface
        this.populateShopInterface(this.currentShop);

        // Play purchase sound
        this.playPurchaseSound();
    }

    purchasePaint(colorIndex) {
        const colorOption = this.paintColors[colorIndex];
        if (!colorOption) return;

        if (this.gameState.money < colorOption.price) {
            this.showNotification('Not enough money!', 'error');
            return;
        }

        // Deduct money
        this.gameState.money -= colorOption.price;

        // Apply paint color (this would be handled by the vehicle system)
        this.gameState.vehicleColor = colorOption.color;
        window.dispatchEvent(new CustomEvent('vehicleColorChange', {
            detail: { color: colorOption.color }
        }));

        this.showNotification(`Applied ${colorOption.name} paint!`, 'success');
        this.populateShopInterface(this.currentShop);
        this.playPurchaseSound();
    }

    applyServiceEffect(service) {
        switch (service) {
            case 'refuel':
                this.gameState.fuel = 100;
                break;

            case 'repair':
                this.gameState.damage = 0;
                window.dispatchEvent(new CustomEvent('vehicleRepair'));
                break;

            case 'bodyRepair':
                this.gameState.damage = Math.max(0, this.gameState.damage - 30);
                break;

            case 'engineRepair':
                this.gameState.damage = Math.max(0, this.gameState.damage - 50);
                break;

            case 'carWash':
                window.dispatchEvent(new CustomEvent('vehicleWash'));
                break;

            case 'engineUpgrade':
                this.gameState.enginePower = (this.gameState.enginePower || 1) * 1.2;
                window.dispatchEvent(new CustomEvent('vehicleUpgrade', {
                    detail: { type: 'engine', value: 1.2 }
                }));
                break;

            case 'turboUpgrade':
                this.gameState.upgrades = this.gameState.upgrades || {};
                this.gameState.upgrades.turbo = true;
                window.dispatchEvent(new CustomEvent('vehicleUpgrade', {
                    detail: { type: 'turbo', value: true }
                }));
                break;

            case 'tireUpgrade':
                this.gameState.tireGrip = (this.gameState.tireGrip || 1) * 1.3;
                window.dispatchEvent(new CustomEvent('vehicleUpgrade', {
                    detail: { type: 'tires', value: 1.3 }
                }));
                break;

            case 'suspensionUpgrade':
                this.gameState.upgrades = this.gameState.upgrades || {};
                this.gameState.upgrades.suspension = true;
                window.dispatchEvent(new CustomEvent('vehicleUpgrade', {
                    detail: { type: 'suspension', value: true }
                }));
                break;

            case 'brakesUpgrade':
                this.gameState.upgrades = this.gameState.upgrades || {};
                this.gameState.upgrades.brakes = true;
                window.dispatchEvent(new CustomEvent('vehicleUpgrade', {
                    detail: { type: 'brakes', value: true }
                }));
                break;

            case 'exhaustUpgrade':
                this.gameState.upgrades = this.gameState.upgrades || {};
                this.gameState.upgrades.exhaust = true;
                window.dispatchEvent(new CustomEvent('vehicleUpgrade', {
                    detail: { type: 'exhaust', value: true }
                }));
                break;

            case 'snacks':
                // Restore player energy/health
                this.gameState.energy = Math.min((this.gameState.energy || 100) + 20, 100);
                break;

            case 'maintenance':
                // Improve vehicle condition
                this.gameState.condition = Math.min((this.gameState.condition || 100) + 10, 100);
                break;

            case 'decals':
                window.dispatchEvent(new CustomEvent('vehicleDecals', {
                    detail: { type: 'racing_stripes' }
                }));
                break;

            case 'chrome':
                window.dispatchEvent(new CustomEvent('vehicleChrome'));
                break;
        }
    }

    updateShopAnimations() {
        // Animate shop signs and lighting
        this.shops.forEach(shop => {
            if (shop.mesh && shop.mesh.children) {
                shop.mesh.children.forEach(child => {
                    if (child.userData && child.userData.isShopSign) {
                        // Animate shop signs
                        child.rotation.y += 0.01;
                    }

                    if (child.userData && child.userData.isShopLight) {
                        // Pulsing shop lights
                        const intensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;
                        child.intensity = intensity;
                    }
                });
            }
        });
    }

    showNotification(message, type = 'info') {
        // Create or update notification element
        let notification = document.getElementById('shopNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'shopNotification';
            notification.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 20px;
                border-radius: 10px;
                font-size: 18px;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(notification);
        }

        // Set message and style based on type
        notification.textContent = message;
        switch (type) {
            case 'success':
                notification.style.backgroundColor = 'rgba(46, 204, 113, 0.9)';
                break;
            case 'error':
                notification.style.backgroundColor = 'rgba(231, 76, 60, 0.9)';
                break;
            default:
                notification.style.backgroundColor = 'rgba(52, 152, 219, 0.9)';
        }

        // Show notification
        notification.style.opacity = '1';

        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 3000);
    }

    updateMoneyDisplay() {
        document.getElementById('playerMoney').textContent = this.gameState.money;
    }

    closeShop() {
        this.currentShop = null;
        this.shopInterface.classList.remove('active');
        this.playShopExitSound();
    }

    // Audio feedback
    playShopEnterSound() {
        // Play door chime sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    playShopExitSound() {
        // Play exit sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.3);

        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    }

    playPurchaseSound() {
        // Play cash register sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator1.type = 'square';
        oscillator1.frequency.value = 440;
        oscillator2.type = 'sine';
        oscillator2.frequency.value = 880;

        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.2);
        oscillator2.stop(audioContext.currentTime + 0.2);
    }

    // Global functions for shop interface
    refuel() {
        this.purchaseService('refuel');
    }

    repair() {
        this.purchaseService('repair');
    }

    paint() {
        // Open paint selection
        if (this.currentShop && this.currentShop.type === 'paint') {
            this.populateShopInterface(this.currentShop);
        }
    }

    upgradeEngine() {
        this.purchaseService('engineUpgrade');
    }

    upgradeTires() {
        this.purchaseService('tireUpgrade');
    }
}
