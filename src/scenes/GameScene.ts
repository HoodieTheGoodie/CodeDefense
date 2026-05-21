import Phaser from 'phaser';
import { Virus } from '../entities/Virus';
import { BaseTower } from '../towers/BaseTower';
import { Zapper } from '../towers/Zapper';
import { PowerFactory } from '../towers/PowerFactory';
import { Projectile } from '../entities/Projectile';
import { TOWER, WAVE } from '../config/GameBalance';

export class GameScene extends Phaser.Scene {
    private currentArea: number = 0; // 0 = Core, 1 = Node 1
    private leftBtn!: Phaser.GameObjects.Text;
    private rightBtn!: Phaser.GameObjects.Text;

    private energy: number = 50; // Starting energy usually lower
    private energyText!: Phaser.GameObjects.Text;
    
    private coreHp: number = 5;
    private coreHpText!: Phaser.GameObjects.Text;

    private viruses: Virus[] = [];
    private towers: BaseTower[] = [];
    private projectiles: Projectile[] = [];
    
    private waveActive: boolean = false;
    private startBtn!: Phaser.GameObjects.Text;
    private spawnTimer: number = 0;
    
    private waveTotal: number = WAVE.firstTotalViruses;
    private waveSpawned: number = 0;
    private waveKilled: number = 0;
    private waveText!: Phaser.GameObjects.Text;
    private waveProgressBar!: Phaser.GameObjects.Rectangle;
    private statusText!: Phaser.GameObjects.Text;
    private uploadBack!: Phaser.GameObjects.Rectangle;
    private uploadFill!: Phaser.GameObjects.Rectangle;
    private uploadText!: Phaser.GameObjects.Text;

    private selectedTowerType: string | null = null;
    
    // Tower Cooldowns tracking (0 means ready)
    private zapperCooldownTime: number = 0;
    private powerCooldownTime: number = 0;
    private zapperCooldownText!: Phaser.GameObjects.Text;
    private powerCooldownText!: Phaser.GameObjects.Text;

    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.scale;
        
        // Define world bounds for 2 areas (1024 width per area)
        this.cameras.main.setBounds(0, 0, width * 2, height);

        // ==========================================
        // AREA 0: THE CORE (Left Area)
        // ==========================================
        const coreCenterX = width / 2; // 512
        const coreCenterY = (height / 2) + 40; // 424 (Offset for top UI)

        // Background Server Decoration to make the area feel less empty on the sides
        this.add.rectangle(coreCenterX - 430, coreCenterY, 150, 648, 0x0a0a0a).setStrokeStyle(2, 0x333333);
        this.add.rectangle(coreCenterX + 430, coreCenterY, 150, 648, 0x0a0a0a).setStrokeStyle(2, 0x333333);
        
        // Draw server blade details
        for (let i = 0; i < 12; i++) {
            let rackY = coreCenterY - 270 + (i * 48);
            // Left rack blades
            this.add.rectangle(coreCenterX - 430, rackY, 120, 30, 0x111111).setStrokeStyle(1, 0x222222);
            this.add.circle(coreCenterX - 390, rackY, 3, 0x00ff00);
            this.add.circle(coreCenterX - 380, rackY, 3, Math.random() > 0.3 ? 0x00ff00 : 0xff0000);
            
            // Right rack blades
            this.add.rectangle(coreCenterX + 430, rackY, 120, 30, 0x111111).setStrokeStyle(1, 0x222222);
            this.add.circle(coreCenterX + 390, rackY, 3, 0x00ff00);
            this.add.circle(coreCenterX + 380, rackY, 3, Math.random() > 0.3 ? 0x00ff00 : 0xff0000);
        }

        // Core Defense Grid (12x12 grid, scaled up to 54x54 per cell -> 648x648 total)
        this.add.grid(coreCenterX, coreCenterY, 648, 648, 54, 54, 0x05051a, 1, 0x3333ff, 0.15);

        // The Small Blue Orb Core
        this.add.circle(coreCenterX, coreCenterY, 20, 0x0000ff).setStrokeStyle(3, 0x00ffff);
        this.add.text(coreCenterX, coreCenterY - 35, 'CORE', {
            fontSize: '16px', fontFamily: 'monospace', color: '#00ffff', fontStyle: 'bold', backgroundColor: '#000000'
        }).setOrigin(0.5);

        this.coreHpText = this.add.text(coreCenterX, coreCenterY + 35, `HP: ${this.coreHp}`, {
            fontSize: '16px', fontFamily: 'monospace', color: '#00ff00', fontStyle: 'bold', backgroundColor: '#000000'
        }).setOrigin(0.5);

        // ==========================================
        // AREA 1: NODE 1 (Right Area)
        // ==========================================
        const node1CenterX = width + (width / 2); // 1536
        const node1CenterY = coreCenterY + 15; // Shifted down a bit from top UI
        
        // Node 1 Grid (10 columns, 6 rows. Cells are 96x96 -> 960x576 to stretch across screen mostly perfectly)
        this.add.grid(node1CenterX, node1CenterY, 960, 576, 96, 96, 0x1a0505, 1, 0xff3333, 0.2);

        // Path to core (Rotated text so it fits snugly on the edge)
        this.add.rectangle(node1CenterX - 485, node1CenterY, 10, 576, 0x00ffff);
        this.add.text(node1CenterX - 498, node1CenterY, '<=== TO CORE', {
            fontSize: '18px', fontFamily: 'monospace', color: '#00ffff'
        }).setOrigin(0.5).setAngle(-90);
        
        // Virus Spawner
        this.add.rectangle(node1CenterX + 485, node1CenterY, 10, 576, 0xff0000).setAlpha(0.6);
        this.add.text(node1CenterX + 498, node1CenterY, 'MALWARE ENTRY <===', {
            fontSize: '18px', fontFamily: 'monospace', color: '#ff3333'
        }).setOrigin(0.5).setAngle(-90);

        // Preview Zombies / Start Button for Node 1
        this.startBtn = this.add.text(node1CenterX, node1CenterY - 320, '>> START SYSTEM <<', {
            fontSize: '24px', fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#aa0000', padding: { x: 15, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // Decorative purely visual preview zombies standing past the boundary
        // These show the player what kinds of malware are coming in this node
        const previewText = this.add.text(node1CenterX + 620, node1CenterY - 100, 'INCOMING\nTHREATS:', { fontSize: '18px', fontFamily: 'monospace', color: '#ffffff', align: 'center' }).setOrigin(0.5);
        const previewVisual1 = this.add.rectangle(node1CenterX + 620, node1CenterY - 30, 60, 60, 0xff0000);
        const previewVisual2 = this.add.rectangle(node1CenterX + 580, node1CenterY + 40, 60, 60, 0xff0000);
        const previewVisual3 = this.add.rectangle(node1CenterX + 660, node1CenterY + 50, 60, 60, 0xff0000);

        this.startBtn.on('pointerup', () => {
            this.waveActive = true;
            this.spawnTimer = -WAVE.initialSpawnDelayMs;
            this.startBtn.setVisible(false);
            this.statusText.setText("Incoming viruses. Defenses activated.");
            this.time.delayedCall(2600, () => {
                if (this.waveActive) this.statusText.setText('Neutralize every threat before it uploads to the core.');
            });
            
            // Remove the previews, the battle has begun
            previewText.destroy();
            previewVisual1.destroy();
            previewVisual2.destroy();
            previewVisual3.destroy();
        });

        // Listen for keyboard input (Arrow keys for panning)
        this.input.keyboard?.on('keydown-LEFT', () => {
            if (this.currentArea === 1) this.switchArea(0);
        });
        this.input.keyboard?.on('keydown-RIGHT', () => {
            if (this.currentArea === 0) this.switchArea(1);
        });

        // ==========================================
        // GLOBAL TOP UI BAR (Towers, Energy)
        // ==========================================
        const uiBar = this.add.rectangle(width / 2, 40, width, 80, 0x111111).setScrollFactor(0).setStrokeStyle(2, 0x00ffff);
        
        // Energy Counter
        this.energyText = this.add.text(30, 40, `ENERGY: ${this.energy}`, {
            fontSize: '24px', fontFamily: 'monospace', color: '#ffff00', fontStyle: 'bold'
        }).setOrigin(0, 0.5).setScrollFactor(0);
        
        // Wave Progress
        this.waveText = this.add.text(width - 30, 30, `WAVE PROGRESS`, {
            fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(1, 0.5).setScrollFactor(0);
        
        this.add.rectangle(width - 130, 55, 200, 15, 0x333333).setOrigin(0.5).setScrollFactor(0);
        this.waveProgressBar = this.add.rectangle(width - 230, 55, 0, 15, 0x00ff00).setOrigin(0, 0.5).setScrollFactor(0);

        this.statusText = this.add.text(width / 2, 96, 'Place defenses, then enter Node 1 to start the first wave.', {
            fontSize: '18px', fontFamily: 'monospace', color: '#00ffff', backgroundColor: '#000000', padding: { x: 10, y: 6 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(20);

        this.uploadBack = this.add.rectangle(width / 2, 126, 340, 12, 0x331111).setOrigin(0.5).setScrollFactor(0).setVisible(false);
        this.uploadFill = this.add.rectangle(width / 2 - 170, 126, 0, 12, 0xff2222).setOrigin(0, 0.5).setScrollFactor(0).setVisible(false);
        this.uploadText = this.add.text(width / 2, 148, '', {
            fontSize: '14px', fontFamily: 'monospace', color: '#ff7777', backgroundColor: '#000000'
        }).setOrigin(0.5).setScrollFactor(0).setVisible(false);
        
        // Listen for killed viruses
        this.events.on('virusKilled', (virus?: Virus) => {
            // Reusing this event for factories generating money as well (if virus is undefined)
            this.energy += 25;
            this.energyText.setText(`ENERGY: ${this.energy}`);
            
            if (virus) {
                this.viruses = this.viruses.filter(v => v !== virus); // Remove from tracking list
                this.waveKilled++;
                
                const progressWidth = (this.waveKilled / this.waveTotal) * 200;
                this.waveProgressBar.width = progressWidth;

                if (this.waveKilled >= this.waveTotal) {
                    this.add.text(width/2, height/2, 'WAVE CLEARED', { fontSize: '48px', color: '#00ff00', backgroundColor: '#000000' }).setOrigin(0.5).setScrollFactor(0);
                }
            }
        });
        
        // Listen for projectiles
        this.events.on('spawnProjectile', (x: number, y: number, area: number, lane: number) => {
            this.projectiles.push(new Projectile(this, x, y, area, lane));
        });

        // Setup Tower UI selection
        const zapperUI = this.add.rectangle(350, 40, 80, 60, 0x222222).setStrokeStyle(2, 0x0000ff).setScrollFactor(0).setInteractive({ useHandCursor: true });
        this.add.text(350, 40, 'ZAPPER\n(100)', { fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', align: 'center' }).setOrigin(0.5).setScrollFactor(0);
        this.zapperCooldownText = this.add.text(350, 40, '', { fontSize: '24px', fontFamily: 'monospace', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(10);
        
        const powerUI = this.add.rectangle(450, 40, 80, 60, 0x222222).setStrokeStyle(2, 0xffff00).setScrollFactor(0).setInteractive({ useHandCursor: true });
        this.add.text(450, 40, 'POWER\n(50)', { fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', align: 'center' }).setOrigin(0.5).setScrollFactor(0);
        this.powerCooldownText = this.add.text(450, 40, '', { fontSize: '24px', fontFamily: 'monospace', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

        // Highlight selection
        let selectedHighlight = this.add.rectangle(350, 40, 80, 60).setStrokeStyle(4, 0xffffff).setScrollFactor(0).setVisible(false);

        zapperUI.on('pointerdown', () => { this.selectedTowerType = 'zapper'; selectedHighlight.setPosition(350, 40).setVisible(true); });
        powerUI.on('pointerdown', () => { this.selectedTowerType = 'power'; selectedHighlight.setPosition(450, 40).setVisible(true); });

        // Grid Click handler (Placing towers)
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (!this.selectedTowerType) return;
            if (pointer.y < 80) return; // Ignore clicking the UI
            
            this.handleGridClick(pointer.worldX, pointer.worldY);
        });

        // ==========================================
        // UI NAVIGATION (Scroll factor 0 means they stay rooted to the camera)
        // ==========================================
        
        // Left Button (To Core) - positioned in the bottom left
        this.leftBtn = this.add.text(20, height - 30, '< CORE', {
            fontSize: '20px', fontFamily: 'monospace', color: '#00ff00', backgroundColor: '#002200', padding: { x: 8, y: 8 }
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0);

        this.leftBtn.on('pointerup', () => this.switchArea(0));

        // Right Button (To Node 1) - positioned in the bottom right
        this.rightBtn = this.add.text(width - 20, height - 30, 'NODE 1 >', {
            fontSize: '20px', fontFamily: 'monospace', color: '#ff3333', backgroundColor: '#220000', padding: { x: 8, y: 8 }
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0);

        this.rightBtn.on('pointerup', () => this.switchArea(1));

        // Initialize display
        this.updateButtons();
    }

    private handleGridClick(worldX: number, worldY: number) {
        if (!this.selectedTowerType) return;
        
        let area = this.currentArea;
        let cost = this.selectedTowerType === 'zapper' ? TOWER.zapperCost : TOWER.powerCost;

        // Check cooldown
        if (this.selectedTowerType === 'zapper' && this.zapperCooldownTime > 0) return;
        if (this.selectedTowerType === 'power' && this.powerCooldownTime > 0) return;

        if (this.energy < cost) {
            // Flash energy red
            this.energyText.setColor('#ff0000');
            this.time.delayedCall(200, () => this.energyText.setColor('#ffff00'));
            return;
        }

        // Extremely basic grid snapping for prototype (in production this would use grid data structures)
        let snappedX = 0; let snappedY = 0; let gridY = 0;
        
        if (area === 1) { // Node 1 (96x96, centered at 1536, 439)
            let originX = 1536 - 480; let originY = 439 - 288;
            if (worldX < originX || worldX > originX + 960 || worldY < originY || worldY > originY + 576) return; // Out of bounds
            let rx = worldX - originX; let ry = worldY - originY;
            let col = Math.floor(rx / 96); gridY = Math.floor(ry / 96);
            snappedX = originX + (col * 96) + 48; snappedY = originY + (gridY * 96) + 48;
        } else { // Core (54x54, centered at 512, 424)
            let originX = 512 - 324; let originY = 424 - 324;
            if (worldX < originX || worldX > originX + 648 || worldY < originY || worldY > originY + 648) return; // Out of bounds
            let rx = worldX - originX; let ry = worldY - originY;
            let col = Math.floor(rx / 54); gridY = Math.floor(ry / 54);
            snappedX = originX + (col * 54) + 27; snappedY = originY + (gridY * 54) + 27;
        }

        // Check if tower already exists there
        if (this.towers.find(t => Math.abs(t.x - snappedX) < 10 && Math.abs(t.y - snappedY) < 10)) return;

        // Place Tower
        this.energy -= cost;
        this.energyText.setText(`ENERGY: ${this.energy}`);

        let newTower;
        if (this.selectedTowerType === 'zapper') {
            newTower = new Zapper(this, snappedX, snappedY, area, snappedX, gridY); // Passing gridY for lane shooting
            this.zapperCooldownTime = TOWER.zapperCooldownMs;
        } else {
            newTower = new PowerFactory(this, snappedX, snappedY, area, snappedX, gridY);
            // PVZ actually has a fairly short cooldown for sun producers, let's say 4 seconds
            this.powerCooldownTime = TOWER.powerCooldownMs;
        }
        
        this.towers.push(newTower);
        
        // Deselect out of convenience
        this.selectedTowerType = null;
    }

    private switchArea(areaIndex: number) {
        this.currentArea = areaIndex;
        const targetX = 512 + (areaIndex * 1024); // Center of the target area
        
        // Smooth pan transition
        this.cameras.main.pan(targetX, 384, 800, 'Power2');
        this.updateButtons();
    }

    private updateButtons() {
        // Toggle visibility of navigation buttons based on current camera location
        if (this.currentArea === 0) {
            this.leftBtn.setVisible(false);
            this.rightBtn.setVisible(true);
        } else {
            this.leftBtn.setVisible(true);
            this.rightBtn.setVisible(false);
        }
    }

    // Main Game Loop - Runs constantly even if camera is on another node
    update(time: number, delta: number) {
        // Cooldown processing
        if (this.zapperCooldownTime > 0) {
            this.zapperCooldownTime -= delta;
            this.zapperCooldownText.setText(Math.ceil(this.zapperCooldownTime / 1000).toString());
            if (this.zapperCooldownTime <= 0) this.zapperCooldownText.setText('');
        }
        if (this.powerCooldownTime > 0) {
            this.powerCooldownTime -= delta;
            this.powerCooldownText.setText(Math.ceil(this.powerCooldownTime / 1000).toString());
            if (this.powerCooldownTime <= 0) this.powerCooldownText.setText('');
        }

        // Towers keep ticking before the wave starts, which lets economy defenses feel alive.
        this.towers = this.towers.filter(t => {
            if (!t.isAlive) return false;
            t.tick(time, delta, this.viruses);
            return true;
        });

        if (!this.waveActive || this.coreHp <= 0) return;

        // Wave spawner logic
        if (this.waveSpawned < this.waveTotal) {
            this.spawnTimer += delta;
            
            // Spawn rate starts slow and gets faster
            const progress = this.waveSpawned / this.waveTotal;
            const spawnRate = WAVE.spawnRateStartMs - (progress * (WAVE.spawnRateStartMs - WAVE.spawnRateEndMs));

            if (this.spawnTimer > spawnRate) {
                this.spawnTimer = 0;
                this.waveSpawned++;
                
                // Random lane (0-5 for Node 1)
                const lane = Phaser.Math.Between(0, 5);
                // Starting position Node 1 right edge
                const node1CenterX = this.scale.width + (this.scale.width / 2); // 1536
                const node1CenterY = (this.scale.height / 2) + 40 + 15;
                
                // Y calculation: Top of grid is roughly center - (3 * 96) + (96/2)
                const node1TopY = node1CenterY - 288 + 48;
                const spawnY = node1TopY + (lane * 96);

                const newVirus = new Virus(this, node1CenterX + 480, spawnY, lane);
                this.viruses.push(newVirus);
            }
        }

        // Tick projectiles
        this.projectiles = this.projectiles.filter(p => {
            if (!p.active) return false;
            p.tick(delta);
            return true;
        });

        // Update all viruses
        this.viruses.forEach(virus => {
            // Find if there is a tower directly in front of this virus to attack
            let targetTower = null;
            if (virus.currentArea === 1) { // Only checking basic Node 1 collisions for now (lane matching)
                targetTower = this.towers.find(t => t.currentArea === 1 && t.gridY === virus.lane && Math.abs(t.x - virus.x) < 50);
            } else if (virus.currentArea === 0) {
                targetTower = this.towers.find(t => t.currentArea === 0 && Math.abs(t.x - virus.x) < 30 && Math.abs(t.y - virus.y) < 30);
            }
            
            const coreCenterX = this.scale.width / 2; // 512
            const coreCenterY = (this.scale.height / 2) + 40;
            const reachedCore = virus.currentArea === 0 && Phaser.Math.Distance.Between(virus.baseX, virus.baseY, coreCenterX, coreCenterY) < 32;

            virus.tick(delta, targetTower, reachedCore);

            // Projectile Collisions
            this.projectiles.forEach(p => {
                if (p.active && p.currentArea === virus.currentArea && p.lane === virus.lane) {
                    if (Math.abs(p.x - virus.x) < 30) { // Simple overlap check
                        virus.takeDamage(p.damage);
                        const pulse = this.add.circle(virus.x, virus.y, 12, 0x99ffff, 0.55).setDepth(7);
                        this.tweens.add({
                            targets: pulse,
                            scale: 2.2,
                            alpha: 0,
                            duration: 220,
                            onComplete: () => pulse.destroy()
                        });
                        p.destroy();
                    }
                }
            });

            // Handle cross-node transitions or reaching the core
            // If dragging across Node 1 and touches left bound
            if (virus.currentArea === 1 && virus.baseX < (1536 - 480)) {
                // Teleport to right edge of Core Grid (Map lane 0-5 to core lane 3-8)
                virus.currentArea = 0;
                virus.baseX = coreCenterX + 324; // Core right edge
                
                const coreCenterY = (this.scale.height / 2) + 40;
                const coreTopY = coreCenterY - 324 + 27; // Cell size is 54
                virus.baseY = coreTopY + ((virus.lane + 3) * 54);
                
                // Shrink to fit Core tile size
                virus.setDisplaySize(30, 30);
            }
            
            if (reachedCore) {
                this.uploadBack.setVisible(true);
                this.uploadFill.setVisible(true);
                this.uploadText.setVisible(true);
                this.uploadFill.width = 340 * virus.uploadProgress;
                this.uploadText.setText(`VIRUS UPLOADING: ${Math.floor(virus.uploadProgress * 100)}%`);
                this.statusText.setText('A virus is uploading into the core. Stop it now.');
            }
            
            // If the upload completes, the core is infected.
            if (virus.uploadProgress >= 1) {
                this.coreHp = 0;
                this.coreHpText.setText(`HP: ${this.coreHp}`);
                
                this.viruses = this.viruses.filter(v => v !== virus);
                virus.destroy();
                
                this.cameras.main.shake(500, 0.05);
                this.add.text(this.cameras.main.scrollX + (this.scale.width / 2), this.scale.height / 2, 'SYSTEM FAILURE', {
                    fontSize: '64px', fontFamily: 'monospace', color: '#ff0000', backgroundColor: '#000000', fontStyle: 'bold'
                }).setOrigin(0.5);
            }
        });

        if (!this.viruses.some(virus => virus.isUploading()) && this.uploadBack.visible) {
            this.uploadBack.setVisible(false);
            this.uploadFill.setVisible(false);
            this.uploadText.setVisible(false);
        }
    }
}
