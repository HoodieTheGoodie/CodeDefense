import Phaser from 'phaser';
import { Virus } from '../entities/Virus';
import { BaseTower } from '../towers/BaseTower';
import { Zapper } from '../towers/Zapper';
import { PowerFactory } from '../towers/PowerFactory';
import { PowerPole } from '../towers/PowerPole';
import { Projectile } from '../entities/Projectile';
import { TOWER, CORE, WAVE, getWaveData } from '../config/GameBalance';
import { EVENT_IDS, SPECIAL_EVENT_IDS, TOWER_IDS, VIRUS_IDS } from '../config/GameIds';
import { markNode1LevelCleared, unlockPowerTower, setProgress, getProgress } from '../config/Progression';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }
    // Toggle this to true temporarily to force a minimal visible scene for debugging
    private static DEBUG_MINIMAL: boolean = false;
    private static DEBUG_PANEL_ENABLED: boolean = true;
    private currentArea: number = 0; // 0 = Core, 1 = Node 1
    private leftBtn!: Phaser.GameObjects.Text;
    private rightBtn!: Phaser.GameObjects.Text;

    private energy: number = 150; // Start with enough power to get core defense online
    private energyText!: Phaser.GameObjects.Text;
    
    private coreHp: number = 5;
    private coreHpText!: Phaser.GameObjects.Text;

    private viruses: Virus[] = [];
    private towers: BaseTower[] = [];
    private projectiles: Projectile[] = [];
    
    // Tooltip
    private tooltipBox!: Phaser.GameObjects.Container;
    private tooltipText!: Phaser.GameObjects.Text;
    
    private waveActive: boolean = false;
    private startBtn!: Phaser.GameObjects.Text;
    private spawnTimer: number = 0;
    
    private currentLevel: number = 1;
    private waveStats: any;
    private waveTotal: number = 0;
    private waveSpawned: number = 0;
    private waveKilled: number = 0;
    private campaignWaveLifetime: number = 0;
    private campaignWaveResolved: boolean = false;
    private currentCampaignVirus: Virus | null = null;
    private finalWaveStarted: boolean = false;
    private finalWaveSpawned: number = 0;
    private finalWaveKilled: number = 0;
    private finalWaveSpawnTimer: number = 0;
    private finalWaveTargetTotal: number = 0;
    private finalWaveLeader: Virus | null = null;
    private finalWaveLeaderSummonTimer: number = 0;
    private waveProgressBar!: Phaser.GameObjects.Rectangle;
    private uploadBack!: Phaser.GameObjects.Rectangle;
    private uploadFill!: Phaser.GameObjects.Rectangle;
    private uploadText!: Phaser.GameObjects.Text;

    private selectedTowerType: string | null = null;
    
    // Tower Cooldowns tracking (0 means ready)
    private zapperCooldownTime: number = 0;
    private powerCooldownTime: number = 0;
    
    // Changing from text to overlay rects for cooldowns
    private zapperCooldownOverlay!: Phaser.GameObjects.Rectangle;
    private powerCooldownOverlay!: Phaser.GameObjects.Rectangle;
    
    // Preview graphics for placing
    private previewGraphic!: Phaser.GameObjects.Graphics;

    // Tutorial State
    private tutorialState: number = 0;
    private tutorialPowerPlacedCount: number = 0;
    private tutorialContainer!: Phaser.GameObjects.Container;
    private tutorialText!: Phaser.GameObjects.Text;
    private powerHighlightBox!: Phaser.GameObjects.Rectangle;
    private isShuttingDown: boolean = false;
    private previewMode: boolean = false;
    private previewVirusModels: any[] = [];
    
    // Wiring Tool
    private wireFromNode: PowerPole | null = null;
    private corePole!: PowerPole;

    private debugInfiniteEnergy: boolean = false;
    private debugNoCooldowns: boolean = false;
    private debugGameSpeed: number = 1;
    private debugPanelContainer?: Phaser.GameObjects.Container;
    private debugPanelBody?: Phaser.GameObjects.Container;
    private debugPanelOpen: boolean = false;
    private unlockDrop?: Phaser.GameObjects.Container;

    create(data?: { level?: number }) {
        
        // Reset camera in case a previous scene left it zoomed/panned (prevents black/zoomed view)
        try {
            this.cameras.main.setZoom(1);
            this.cameras.main.setScroll(0, 0);
        } catch (e) {
            // ignore if camera not available yet
        }

        this.currentLevel = data?.level ?? getProgress().node1Level;
        this.waveStats = getWaveData(this.currentLevel);

        // Small persistent debug label so user isn't left with a black screen if create() throws
        const cw = Number(this.game.config.width) || 1024;
        const ch = Number(this.game.config.height) || 768;

        const { width, height } = this.scale;
        // Hoist variables that are needed outside the try/catch
        let selectedHighlight!: Phaser.GameObjects.Rectangle;

        try {

        // If DEBUG_MINIMAL is enabled, render a simple confirmation UI and skip heavy init
        if ((this.constructor as typeof GameScene).DEBUG_MINIMAL) {
            this.add.rectangle(width/2, height/2, width - 200, height - 200, 0x051010).setScrollFactor(0);
            this.add.text(width/2, height/2 - 20, 'DEBUG: Minimal GameScene', { fontSize: '28px', fontFamily: 'monospace', color: '#00ff00' }).setOrigin(0.5).setScrollFactor(0);
            this.add.text(width/2, height/2 + 20, 'If you see this, the scene loaded correctly.', { fontSize: '16px', fontFamily: 'monospace', color: '#aaaaaa' }).setOrigin(0.5).setScrollFactor(0);
            return;
        }
        
        // Define world bounds for 2 areas + preview strip to the right
        this.cameras.main.setBounds(0, 0, (width * 2) + 1024, height);

        // ==========================================
        // AREA 0: THE CORE (Left Area)
        // ==========================================
        const coreCenterX = width / 2; // 512
        const coreCenterY = (height / 2) + 40; // 424 (Offset for top UI)

        // Initialize Core Pole (invisible grid power source)
        this.corePole = new PowerPole(this, coreCenterX, coreCenterY, 0, coreCenterX, coreCenterY);
        this.corePole.setVisible(false);
        this.corePole.isPowered = true;
        this.corePole.visualCore.setVisible(false); // Hide the visual circle
        this.towers.push(this.corePole);

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

        // Start Button for Node 1
        this.startBtn = this.add.text(node1CenterX - 100, node1CenterY - 320, '>> START SYSTEM <<', {
            fontSize: '24px', fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#aa0000', padding: { x: 15, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const previewBtn = this.add.text(node1CenterX + 160, node1CenterY - 320, '>> PREVIEW VIRUSES <<', {
            fontSize: '18px', fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#333333', padding: { x: 10, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // Decorative preview models shown in the preview strip
        const previewAnchorX = node1CenterX + 1024;
        const previewTitle = this.add.text(previewAnchorX, node1CenterY - 230, 'VIRUS PREVIEW', {
            fontSize: '22px', fontFamily: 'monospace', color: '#ffffff'
        }).setOrigin(0.5).setVisible(false);
        const previewHint = this.add.text(previewAnchorX, node1CenterY - 195, 'More models = higher expected count', {
            fontSize: '14px', fontFamily: 'monospace', color: '#aaaaaa'
        }).setOrigin(0.5).setVisible(false);
        this.previewVirusModels = [previewTitle, previewHint];

        const standardPreviewCount = 8;
        for (let i = 0; i < standardPreviewCount; i++) {
            const px = previewAnchorX - 140 + ((i % 4) * 90);
            const py = node1CenterY - 110 + (Math.floor(i / 4) * 90);
            const model = this.add.rectangle(px, py, 42, 42, 0xff2222).setStrokeStyle(2, 0x550000).setVisible(false);
            this.previewVirusModels.push(model);
        }

        const leaderPreview = this.add.rectangle(previewAnchorX + 165, node1CenterY - 75, 48, 48, 0xff66aa).setStrokeStyle(3, 0xff2222).setVisible(false);
        const leaderFlag = this.add.triangle(previewAnchorX + 165, node1CenterY - 106, 0, 0, 16, 8, 0, 14, 0xff2222).setVisible(false);
        const leaderLabel = this.add.text(previewAnchorX + 165, node1CenterY - 35, 'LEADER', {
            fontSize: '12px', fontFamily: 'monospace', color: '#ffaaaa'
        }).setOrigin(0.5).setVisible(false);
        this.previewVirusModels.push(leaderPreview, leaderFlag, leaderLabel);

        const previewBackBtn = this.add.text(previewAnchorX, node1CenterY + 185, '<< BACK TO NODE', {
            fontSize: '18px', fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#222222', padding: { x: 10, y: 8 }
        }).setOrigin(0.5).setVisible(false).setInteractive({ useHandCursor: true });
        this.previewVirusModels.push(previewBackBtn);

        previewBtn.on('pointerup', () => {
            this.previewMode = true;
            this.previewVirusModels.forEach(obj => obj.setVisible(true));
            this.cameras.main.pan(previewAnchorX, 384, 500, 'Power2');
        });

        previewBackBtn.on('pointerup', () => {
            this.previewMode = false;
            this.previewVirusModels.forEach(obj => obj.setVisible(false));
            this.cameras.main.pan(1536, 384, 500, 'Power2');
        });

        this.startBtn.on('pointerup', () => {
            if (this.previewMode) return;
            this.waveActive = true;
            this.waveTotal = this.waveStats.campaignWaves;
            this.waveSpawned = 0;
            this.waveKilled = 0;
            this.campaignWaveLifetime = 0;
            this.campaignWaveResolved = false;
            this.currentCampaignVirus = null;
            this.finalWaveStarted = false;
            this.finalWaveSpawned = 0;
            this.finalWaveKilled = 0;
            this.finalWaveSpawnTimer = 0;
            this.finalWaveTargetTotal = this.waveStats.finalWaveTotalViruses;
            this.finalWaveLeader = null;
            this.finalWaveLeaderSummonTimer = 0;
            this.spawnTimer = 0;
            this.startBtn.setVisible(false);
            previewBtn.setVisible(false);
            if (this.tutorialState === 4 || this.tutorialState === 12) this.advanceTutorial();
            this.previewVirusModels.forEach(obj => obj.destroy());
            this.previewVirusModels = [];
            this.updateProgressBar();
            this.spawnCampaignWave();
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
        this.add.text(30, 40, '⚡', { fontSize: '28px', color: '#ffff00' }).setOrigin(0, 0.5).setScrollFactor(0);
        this.energyText = this.add.text(65, 40, `${this.energy}`, {
            fontSize: '24px', fontFamily: 'monospace', color: '#ffff00', fontStyle: 'bold'
        }).setOrigin(0, 0.5).setScrollFactor(0);
        
        this.add.rectangle(width - 130, 55, 200, 15, 0x333333).setOrigin(0.5).setScrollFactor(0);
        this.waveProgressBar = this.add.rectangle(width - 230, 55, 0, 15, 0x00ff00).setOrigin(0, 0.5).setScrollFactor(0);

        this.uploadBack = this.add.rectangle(width / 2, 126, 340, 12, 0x331111).setOrigin(0.5).setScrollFactor(0).setVisible(false);
        this.uploadFill = this.add.rectangle(width / 2 - 170, 126, 0, 12, 0xff2222).setOrigin(0, 0.5).setScrollFactor(0).setVisible(false);
        this.uploadText = this.add.text(width / 2, 148, '', {
            fontSize: '14px', fontFamily: 'monospace', color: '#ff7777', backgroundColor: '#000000'
        }).setOrigin(0.5).setScrollFactor(0).setVisible(false);
        
        // Listen for new energy events
        this.events.on(EVENT_IDS.addEnergy, (amount: number) => {
            this.energy += amount;
            this.energyText.setText(`${this.energy}`);
        });

        // Listen for killed viruses
        this.events.on(EVENT_IDS.virusKilled, (virus: Virus) => {
            if (virus) {
                this.viruses = this.viruses.filter(v => v !== virus); // Remove from tracking list
                if (!this.finalWaveStarted && this.currentCampaignVirus === virus && !this.campaignWaveResolved) {
                    this.resolveCampaignWave(true);
                } else if (this.finalWaveStarted) {
                    this.finalWaveKilled++;
                    this.updateProgressBar();
                    if (this.finalWaveKilled >= this.finalWaveTargetTotal) {
                        this.waveActive = false;
                        this.handleLevelClear();
                    }
                }
            }
        });
        
        // Listen for projectiles
        this.events.on(EVENT_IDS.spawnProjectile, (x: number, y: number, area: number, lane: number) => {
            this.projectiles.push(new Projectile(this, x, y, area, lane));
        });

        // Setup Tower UI selection
        const zapperUI = this.add.rectangle(350, 40, 80, 60, 0x222222).setStrokeStyle(2, 0x0000ff).setScrollFactor(0).setInteractive({ useHandCursor: true });
        
        // Zapper Icon Mini
        this.add.rectangle(350, 35, 20, 20, 0x0000ff).setScrollFactor(0);
        this.add.rectangle(350 + 10, 35, 10, 5, 0x00ffff).setScrollFactor(0); // Barrel
        this.add.text(350, 60, '100', { fontSize: '14px', fontFamily: 'monospace', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0);
        
        // Zapper Cooldown Overlay
        this.zapperCooldownOverlay = this.add.rectangle(350, 40, 80, 60, 0x000000, 0.7).setScrollFactor(0).setDepth(10).setVisible(false);
        
        const powerUI = this.add.rectangle(450, 40, 80, 60, 0x222222).setStrokeStyle(2, 0xffff00).setScrollFactor(0).setInteractive({ useHandCursor: true });
        
        // Power Factory Icon Mini
        this.add.rectangle(450, 35, 20, 20, 0x444400).setScrollFactor(0);
        this.add.text(450, 35, '⚡', { fontSize: '12px', color: '#ffff00' }).setOrigin(0.5).setScrollFactor(0);
        this.add.text(450, 60, '50', { fontSize: '14px', fontFamily: 'monospace', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0);

        // Power Cooldown Overlay
        this.powerCooldownOverlay = this.add.rectangle(450, 40, 80, 60, 0x000000, 0.7).setScrollFactor(0).setDepth(10).setVisible(false);

        // Power Pole UI
        const poleUI = this.add.rectangle(550, 40, 80, 60, 0x222222).setStrokeStyle(2, 0xaaaaaa).setScrollFactor(0).setInteractive({ useHandCursor: true });
        this.add.circle(550, 35, 10, 0xaaaadd).setScrollFactor(0); // Icon
        this.add.text(550, 60, '25', { fontSize: '14px', fontFamily: 'monospace', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0);

        // Wire Tool UI
        const wireUI = this.add.rectangle(650, 40, 80, 60, 0x222200).setStrokeStyle(2, 0xffff00).setScrollFactor(0).setInteractive({ useHandCursor: true });
        this.add.text(650, 35, '---', { fontSize: '24px', fontFamily: 'monospace', color: '#ffff00' }).setOrigin(0.5).setScrollFactor(0);
        this.add.text(650, 60, 'WIRE', { fontSize: '12px', fontFamily: 'monospace', color: '#ffffaa' }).setOrigin(0.5).setScrollFactor(0);

        // Remove Tool UI
        const removeUI = this.add.rectangle(750, 40, 80, 60, 0x220000).setStrokeStyle(2, 0xff0000).setScrollFactor(0).setInteractive({ useHandCursor: true });
        this.add.text(750, 35, 'X', { fontSize: '24px', fontFamily: 'monospace', color: '#ff0000' }).setOrigin(0.5).setScrollFactor(0);
        this.add.text(750, 60, 'SELL', { fontSize: '12px', fontFamily: 'monospace', color: '#ffaaaa' }).setOrigin(0.5).setScrollFactor(0);

        // Highlight selection
        selectedHighlight = this.add.rectangle(350, 40, 80, 60).setStrokeStyle(4, 0xffffff).setScrollFactor(0).setVisible(false).setDepth(15);

        // Pause Button
        const pauseBtn = this.add.text(width - 30, 40, '||', { fontSize: '24px', fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#333', padding: { x: 5, y: 0 } }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
        pauseBtn.on('pointerdown', () => this.togglePause());

        // Tutorial Setup
        this.tutorialContainer = this.add.container(width / 2, height - 100).setScrollFactor(0).setDepth(200);
        const tutBG = this.add.rectangle(0, 0, 800, 100, 0x001100).setStrokeStyle(4, 0x00ff00);
        
        let initialText = '';
        if (this.currentLevel === 1) {
            this.tutorialState = 0;
            initialText = 'Hey User!\nI need some help! The viruses started to breach my firewall and I need you\nto help me fend them off while I repair the holes.';
        } else {
            this.tutorialState = 10;
            initialText = 'WARNING: REMOTE CONNECTIONS LOST.\nMy grid has been shattered. You must place Power Poles to extend my connection\nto the network. Without power poles within 5 tiles, you cannot place towers!';
        }

        this.tutorialText = this.add.text(0, 0, initialText, { fontSize: '16px', fontFamily: 'monospace', color: '#00ff00', align: 'center', wordWrap: { width: 750 } }).setOrigin(0.5);
        const tutNext = this.add.text(380, 30, 'CLICK >', { fontSize: '14px', fontFamily: 'monospace', color: '#00ff00' }).setOrigin(1, 1);
        this.tutorialContainer.add([tutBG, this.tutorialText, tutNext]);

        this.powerHighlightBox = this.add.rectangle(450, 40, 80, 60).setStrokeStyle(4, 0xff0000).setScrollFactor(0).setVisible(false).setDepth(200);
        
        // Tutorial Click Advance
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            if (this.tutorialContainer.visible && this.tutorialState !== 2 && this.tutorialState !== 4 && this.tutorialState !== 12) {
               this.advanceTutorial();
            }
        });

        // Tower drag preview graphic that follows cursor
        this.previewGraphic = this.add.graphics().setDepth(100).setScrollFactor(0).setVisible(false);

        const setSelection = (type: string, x: number) => {
            this.selectedTowerType = type; 
            selectedHighlight.setPosition(x, 40).setVisible(true);
            this.previewGraphic.clear();
        };

        zapperUI.on('pointerdown', () => { if(this.zapperCooldownTime <= 0) setSelection('zapper', 350); });
        powerUI.on('pointerdown', () => { if(this.powerCooldownTime <= 0) setSelection('power', 450); });
        
        poleUI.on('pointerdown', () => { setSelection('pole', 550); });
        wireUI.on('pointerdown', () => { setSelection('wire', 650); this.wireFromNode = null; });
        removeUI.on('pointerdown', () => { setSelection('remove', 750); });
        if (this.currentLevel < 2) {
            poleUI.setVisible(false);
            wireUI.setVisible(false);
            removeUI.setVisible(false);
        }

        // Tooltip Initialization
        const tipBg = this.add.rectangle(0, 0, 150, 40, 0x000000, 0.8).setStrokeStyle(1, 0xffaa00);
        this.tooltipText = this.add.text(0, 0, 'Tooltip', {fontSize: '12px', fontFamily: 'monospace', color: '#ffcc00'}).setOrigin(0.5);
        this.tooltipBox = this.add.container(0, 0, [tipBg, this.tooltipText]).setDepth(4000).setVisible(false);

        // Pointer move event for drag preview
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            // Hover Tooltip Logic
            let hoveringTower = this.towers.find(t => Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, t.x, t.y) < 30);
            
            // Turn off all pole range circles first
            for (let t of this.towers) {
                if (t instanceof PowerPole && t !== this.corePole) {
                    t.rangeGraphic.setVisible(false);
                }
            }

            if (hoveringTower) {
                let txt = '';
                if (hoveringTower instanceof Zapper) txt = `${TOWER.zapperPowerDraw} PWR DRAW`;
                else if (hoveringTower instanceof PowerPole) {
                    txt = `POWER POLE`;
                    if (hoveringTower !== this.corePole) hoveringTower.rangeGraphic.setVisible(true);
                }
                else txt = `FACTORY`;
                
                this.tooltipText.setText(txt);
                this.tooltipBox.setPosition(pointer.worldX, pointer.worldY - 40).setVisible(true);
            } else if (this.currentArea === 0 && Math.abs(pointer.worldX - 512) < 100 && Math.abs(pointer.worldY - 424) < 100) {
                this.tooltipText.setText(`CORE MAX CAP: ${CORE.maxPowerOutput}`);
                this.tooltipBox.setPosition(pointer.worldX, pointer.worldY - 40).setVisible(true);
            } else {
                this.tooltipBox.setVisible(false);
            }

            if (!this.selectedTowerType) {
                this.previewGraphic.setVisible(false);
                return;
            }
            
            this.previewGraphic.clear();
            this.previewGraphic.setVisible(true);

            // Attempt to snap to grid
            let worldX = pointer.worldX;
            let worldY = pointer.worldY;
            let area = this.currentArea;
            let snappedX = 0; let snappedY = 0; let gridY = 0; let col = 0;
            let size = 40;
            let valid = false;

            if (area === 1) { // Node 1
                let originX = 1536 - 480; let originY = 439 - 288;
                if (worldX >= originX && worldX <= originX + 960 && worldY >= originY && worldY <= originY + 576) {
                    let rx = worldX - originX; let ry = worldY - originY;
                    col = Math.floor(rx / 96); gridY = Math.floor(ry / 96);
                    snappedX = originX + (col * 96) + 48; snappedY = originY + (gridY * 96) + 48;
                    valid = true; size = 40;
                }
            } else { // Core
                let originX = 512 - 324; let originY = 424 - 324;
                if (worldX >= originX && worldX <= originX + 648 && worldY >= originY && worldY <= originY + 648) {
                    let rx = worldX - originX; let ry = worldY - originY;
                    col = Math.floor(rx / 54); gridY = Math.floor(ry / 54);
                    if ((col === 5 || col === 6) && (gridY === 5 || gridY === 6)) { // Core Dead Zone
                        if (this.selectedTowerType === 'wire') {
                            snappedX = 512; snappedY = 424;
                            valid = true; size = 40;
                        }
                    } else {
                        snappedX = originX + (col * 54) + 27; snappedY = originY + (gridY * 54) + 27;
                        valid = true; size = 40;
                    }
                }
            }
            
            if (this.selectedTowerType === 'wire' && this.wireFromNode) {
                this.previewGraphic.lineStyle(3, 0xffff00, 0.5);
                this.previewGraphic.beginPath();
                this.previewGraphic.moveTo(this.wireFromNode.x, this.wireFromNode.y);
                if (valid) {
                    this.previewGraphic.lineTo(snappedX, snappedY);
                } else {
                    this.previewGraphic.lineTo(pointer.worldX, pointer.worldY);
                }
                this.previewGraphic.strokePath();
                return; // don't draw grid snap
            }
            
            let color = 0xffff00;
            if (this.selectedTowerType === 'zapper') color = 0x0000ff;
            if (this.selectedTowerType === 'pole') color = 0xaaaadd;

            this.previewGraphic.fillStyle(color, 0.5);
            
            if (valid) {
                this.previewGraphic.fillRect(snappedX - size/2, snappedY - size/2, size, size);
                if (this.selectedTowerType === 'pole') {
                    this.previewGraphic.fillStyle(0x00ffff, 0.1);
                    this.previewGraphic.fillCircle(snappedX, snappedY, 250);
                }
            } else {
                // If not valid, just follow cursor freely to show it's held
                this.previewGraphic.fillRect(pointer.x - size/2, pointer.y - size/2, size, size);
                if (this.selectedTowerType === 'pole') {
                    this.previewGraphic.fillStyle(0x00ffff, 0.1);
                    this.previewGraphic.fillCircle(pointer.x, pointer.y, 250);
                }
            }
        });

        } catch (err) {
            const error = err as { stack?: string };
            try {
                const el = document.getElementById('error-log');
                if (el) el.innerText += 'GameScene.create error: ' + (error.stack ? error.stack : String(err)) + '\n\n';
            } catch (e) {
                // ignore
            }
            // Also show an in-game red error message so black-screen is obvious
            try {
                const msg = error.stack ? error.stack : String(err);
                const overlay = this.add.rectangle(cw/2, ch/2, cw - 40, ch - 40, 0x000000, 0.9).setDepth(1000).setScrollFactor(0);
                this.add.text(cw/2, ch/2 - 40, 'ERROR LOADING SCENE', { fontSize: '28px', fontFamily: 'monospace', color: '#ff3333' }).setOrigin(0.5).setDepth(1001).setScrollFactor(0);
                this.add.text(cw/2, ch/2 + 10, msg.substring(0, 2000), { fontSize: '12px', fontFamily: 'monospace', color: '#ff7777', wordWrap: { width: cw - 80 } }).setOrigin(0.5).setDepth(1001).setScrollFactor(0);
            } catch (e) {
                // ignore
            }
            throw err;
        }

        // Grid Click handler (Placing towers)
        // Deselect after placing or failing to place, EXCEPT when wiring (wiring clears itself)
        this.events.on('deselect_ui', () => { selectedHighlight.setVisible(false); });
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (!this.selectedTowerType) return;
            if (pointer.y < 80) return; // Ignore clicking the top UI
            // Ignore clicking the bottom UI buttons (camera controls) if we are clicking on them directly.
            // Screen height is 600, buttons are at y=570.
            if (pointer.y > 540) {
                if (pointer.x < 80 || pointer.x > this.scale.width - 80) {
                     return;
                }
            }
            
            this.handleGridClick(pointer.worldX, pointer.worldY);
            
            // Deselect after placing or failing to place, EXCEPT when wiring (wiring clears itself)
            if (this.selectedTowerType !== 'wire') {
                this.selectedTowerType = null;
                selectedHighlight.setVisible(false);
                this.previewGraphic.setVisible(false);
            }
        });

        // ==========================================
        // UI NAVIGATION (Scroll factor 0 means they stay rooted to the camera)
        // ==========================================
        
        // Left Button (To Core) - positioned in the bottom left
        this.leftBtn = this.add.text(20, height - 30, '<', {
            fontSize: '32px', fontFamily: 'monospace', color: '#00ff00', backgroundColor: '#002200', padding: { x: 12, y: 8 }
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0);

        this.leftBtn.on('pointerup', () => this.switchArea(0));

        // Right Button (To Node 1) - positioned in the bottom right
        this.rightBtn = this.add.text(width - 20, height - 30, '>', {
            fontSize: '32px', fontFamily: 'monospace', color: '#ff3333', backgroundColor: '#220000', padding: { x: 12, y: 8 }
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0);

        this.rightBtn.on('pointerup', () => this.switchArea(1));

        // Initialize display
        this.updateButtons();

        if ((this.constructor as typeof GameScene).DEBUG_PANEL_ENABLED) {
            this.createDebugPanel();
        }

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
        this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanupScene, this);
    }

    private updatePowerGrid() {
        if (this.currentLevel < 2) {
            // Everything is always powered on level 1
            for (let t of this.towers) t.isPowered = true;
            return;
        }

        // Reset all power
        for (let t of this.towers) {
            t.isPowered = false;
        }

        // BFS to find all poles connected to the core
        this.corePole.isPowered = true;
        let queue: PowerPole[] = [this.corePole];
        let visited = new Set<PowerPole>();
        visited.add(this.corePole);

        while (queue.length > 0) {
            let current = queue.shift()!;
            current.isPowered = true;
            for (let neighbor of current.connectedTo) {
                if (!visited.has(neighbor) && neighbor.isAlive) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }

        // Power bounds from config: powerPoleRange is 5 cells (roughly 250px)
        const rangeSq = 250 * 250;

        // Now activate towers that are within range of ANY powered pole
        for (let t of this.towers) {
            if (t instanceof PowerPole) continue; // Already processed
            t.isPowered = false;
            for (let pole of visited) {
                let distSq = Phaser.Math.Distance.Squared(t.x, t.y, pole.x, pole.y);
                if (distSq <= rangeSq) {
                    t.isPowered = true;
                    break;
                }
            }
            
            // visually indicate down state
            if (t.isPowered) {
                t.setAlpha(t.hp / t.maxHp);
            } else {
                t.setAlpha(0.2);
            }
        }

        // Redraw lines
        for (let t of this.towers) {
            if (t instanceof PowerPole) {
                t.drawConnections();
            }
        }
    }

    // Tutorial Logic
    private advanceTutorial() {
        this.tutorialState++;
        switch(this.tutorialState) {
            case 1:
                this.tutorialText.setText("I don't know if they will be able to rip more holes in the firewall\nbut for now you just need to defend that right side.");
                break;
            case 2:
                this.tutorialPowerPlacedCount = 0;
                this.tutorialText.setText("I gave you enough starting power to set up the base.\nPlace 3 energy makers in the grid to keep the core running.");
                this.powerHighlightBox.setVisible(true);
                break;
            case 3:
                this.tutorialText.setText("Great. Now switch to Node 1 and place zappers so they can protect the lanes.");
                this.powerHighlightBox.setVisible(false);
                break;
            case 4:
                this.tutorialText.setText("You're going to need to start the attack by pressing the START SYSTEM\nbutton in Node 1 so they come while you generate energy.");
                break;
            case 5:
                this.tutorialText.setText("Once you start the attack the viruses will start to come... wait for the\nenergy machine to produce enough for you to place down the zappers.\nYou can syphon some energy from the viruses too. Good luck!");
                break;
            // LEVEL 2 TUTORIAL
            case 11:
                this.tutorialText.setText("Power Poles cost 25 energy. Chain them together from the main core to Node 1.\nYou'll need them to power your zappers.");
                break;
            case 12:
                this.tutorialText.setText("I've given you some starting energy. Connect the grid now!\nPress START SYSTEM when you're ready.");
                break;
            case 13:
                this.tutorialContainer.setVisible(false);
                break;
            default:
                this.tutorialContainer.setVisible(false);
        }
    }

    private togglePause() {
        if (this.scene.isPaused('GameScene')) {
            // Unpause (handled via UI overlay scene usually, but doing hack for single scene)
        } else {
            // Simple pause screen
            const bg = this.add.rectangle(this.cameras.main.scrollX + this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height, 0x000000, 0.8).setDepth(1000);
            const title = this.add.text(bg.x, bg.y - 100, 'PAUSED', { fontSize: '48px', fontFamily: 'monospace', color: '#ffffff' }).setOrigin(0.5).setDepth(1000);
            
            const resumeBtn = this.add.text(bg.x, bg.y, '> RESUME', { fontSize: '32px', fontFamily: 'monospace', color: '#00ff00' }).setOrigin(0.5).setDepth(1000).setInteractive({ useHandCursor: true });
            const exitBtn = this.add.text(bg.x, bg.y + 60, '> MAIN MENU', { fontSize: '32px', fontFamily: 'monospace', color: '#ff0000' }).setOrigin(0.5).setDepth(1000).setInteractive({ useHandCursor: true });
            
            this.physics.pause();
            const pauseElements = [bg, title, resumeBtn, exitBtn];
            
            // Need to stop object updates. Simple trick: waveActive = false until resumed
            const wasActive = this.waveActive;
            this.waveActive = false;

            resumeBtn.on('pointerdown', () => {
                pauseElements.forEach(e => e.destroy());
                this.physics.resume();
                if (wasActive) this.waveActive = true;
            });
            exitBtn.on('pointerdown', () => {
                this.scene.start('MainMenuScene');
            });
        }
    }

    private spawnCampaignWave() {
        const lane = Phaser.Math.Between(0, 5);
        const node1CenterX = this.scale.width + (this.scale.width / 2); // 1536
        const node1CenterY = (this.scale.height / 2) + 40 + 15;
        const node1TopY = node1CenterY - 288 + 48;
        const spawnY = node1TopY + (lane * 96);

        const newVirus = new Virus(this, node1CenterX + 480, spawnY, lane, VIRUS_IDS.standard);
        this.viruses.push(newVirus);
        this.currentCampaignVirus = newVirus;
        this.campaignWaveLifetime = this.waveStats.campaignWaveLifetimeMs;
        this.campaignWaveResolved = false;
        this.waveSpawned++;
        this.spawnTimer = 0;
    }

    private resolveCampaignWave(fromKill: boolean) {
        if (this.campaignWaveResolved) return;

        this.campaignWaveResolved = true;
        this.currentCampaignVirus = null;
        this.waveKilled++;
        this.updateProgressBar();

        if (this.waveKilled >= this.waveTotal) {
            this.startFinalWave();
            return;
        }

        this.spawnTimer = 0;
    }

    private spawnFinalWaveVirus() {
        const lane = this.finalWaveSpawned % 6;
        const node1CenterX = this.scale.width + (this.scale.width / 2); // 1536
        const node1CenterY = (this.scale.height / 2) + 40 + 15;
        const node1TopY = node1CenterY - 288 + 48;
        const spawnY = node1TopY + (lane * 96);

        const virusId = this.finalWaveSpawned === 0 ? VIRUS_IDS.leader : VIRUS_IDS.standard;
        const newVirus = new Virus(this, node1CenterX + 480, spawnY, lane, virusId);
        this.viruses.push(newVirus);
        if (virusId === VIRUS_IDS.leader) {
            this.finalWaveLeader = newVirus;
        }
        this.finalWaveSpawned++;
        this.updateProgressBar();
    }

    private summonLeaderReinforcements() {
        if (!this.finalWaveLeader || !this.finalWaveLeader.active) return;

        const spawnArea = this.finalWaveLeader.currentArea;
        const laneA = Phaser.Math.Clamp(this.finalWaveLeader.lane + Phaser.Math.Between(-1, 1), 0, 5);
        const laneB = Phaser.Math.Clamp(this.finalWaveLeader.lane + Phaser.Math.Between(-1, 1), 0, 5);
        const offsetX = this.finalWaveLeader.baseX + 30;
        const offsetY = this.finalWaveLeader.baseY;

        const summon = (lane: number, y: number) => {
            const virus = new Virus(this, offsetX, y, lane, VIRUS_IDS.standard);
            virus.currentArea = spawnArea;
            virus.baseX = offsetX;
            virus.baseY = y;
            this.viruses.push(virus);
            this.finalWaveTargetTotal++;
        };

        summon(laneA, offsetY - 22);
        summon(laneB, offsetY + 22);
    }

    private startFinalWave() {
        if (this.isShuttingDown || this.coreHp <= 0) return;

        this.finalWaveStarted = true;
        this.finalWaveSpawned = 0;
        this.finalWaveKilled = 0;
        this.finalWaveTargetTotal = this.waveStats.finalWaveTotalViruses;
        this.finalWaveSpawnTimer = -this.waveStats.finalWaveInitialDelayMs;
        this.finalWaveLeader = null;
        this.finalWaveLeaderSummonTimer = 0;
        this.showFinalFlagBanner();
        this.updateProgressBar();
    }

    private updateProgressBar() {
        if (!this.finalWaveStarted) {
            const progressWidth = (this.waveKilled / this.waveTotal) * 200;
            this.waveProgressBar.width = progressWidth;
            return;
        }

        const target = Math.max(1, this.finalWaveTargetTotal);
        const progressWidth = (this.finalWaveKilled / target) * 200;
        this.waveProgressBar.width = Phaser.Math.Clamp(progressWidth, 0, 200);
    }

    private showFinalFlagBanner() {
        const banner = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, 120, 0x220000, 0.92).setDepth(2000).setScrollFactor(0);
        const title = this.add.text(this.scale.width / 2, this.scale.height / 2 - 18, 'VIRUS ATTACK!', {
            fontSize: '52px',
            fontFamily: 'monospace',
            color: '#ff4444',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(2001).setScrollFactor(0);
        const subtitle = this.add.text(this.scale.width / 2, this.scale.height / 2 + 28, 'FINAL FLAG', {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(2001).setScrollFactor(0);

        this.tweens.add({
            targets: [banner, title, subtitle],
            alpha: 0,
            duration: 1400,
            delay: 500,
            onComplete: () => {
                banner.destroy();
                title.destroy();
                subtitle.destroy();
            }
        });
    }

    private handleLevelClear() {
        markNode1LevelCleared(this.currentLevel + 1);
        unlockPowerTower();

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;
        this.add.text(cx, cy - 110, 'POWER TOWER DROPPED', {
            fontSize: '34px',
            fontFamily: 'monospace',
            color: '#ffff66',
            backgroundColor: '#000000'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2200);

        const orb = this.add.circle(cx, cy, 34, 0xffcc00).setStrokeStyle(4, 0xffffff).setDepth(2201).setScrollFactor(0).setInteractive({ useHandCursor: true });
        const icon = this.add.text(cx, cy, '⚡', { fontSize: '30px', color: '#000000' }).setOrigin(0.5).setDepth(2202).setScrollFactor(0);
        const hint = this.add.text(cx, cy + 62, 'CLICK TO COLLECT', {
            fontSize: '18px', fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#000000'
        }).setOrigin(0.5).setDepth(2202).setScrollFactor(0);

        this.tweens.add({
            targets: [orb, icon],
            scale: 1.12,
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        orb.on('pointerup', () => {
            this.scene.start('UnlockScene', {
                towerId: TOWER_IDS.powerTower,
                title: 'Power Tower',
                summary: 'Power Tower: routes power lines and boosts connected energy systems. Essential for Node 1-2.'
            });
        });

        this.unlockDrop = this.add.container(0, 0, [orb, icon, hint]).setScrollFactor(0).setDepth(2199);
    }

    private createDebugPanel() {
        const panelBg = this.add.rectangle(0, 0, 240, 34, 0x111111, 0.96).setOrigin(0).setStrokeStyle(2, 0x00ffcc);
        const title = this.add.text(10, 8, 'DEBUG', { fontSize: '16px', fontFamily: 'monospace', color: '#00ffcc' });
        const toggle = this.add.text(196, 2, '▼', { fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', padding: { x: 10, y: 8 } }).setInteractive({ useHandCursor: true });

        const bodyBg = this.add.rectangle(0, 34, 240, 250, 0x000000, 0.9).setOrigin(0).setStrokeStyle(1, 0x00ffcc);
        const infiniteBtn = this.createDebugButton(10, 44, 'Infinite Energy: OFF', () => {
            this.debugInfiniteEnergy = !this.debugInfiniteEnergy;
            infiniteBtn.setText(`Infinite Energy: ${this.debugInfiniteEnergy ? 'ON' : 'OFF'}`);
        });
        const cooldownBtn = this.createDebugButton(10, 72, 'No Cooldowns: OFF', () => {
            this.debugNoCooldowns = !this.debugNoCooldowns;
            cooldownBtn.setText(`No Cooldowns: ${this.debugNoCooldowns ? 'ON' : 'OFF'}`);
        });
        const sendAllBtn = this.createDebugButton(10, 100, 'Send All Viruses', () => {
            const node1CenterY = (this.scale.height / 2) + 40 + 15;
            const node1TopY = node1CenterY - 288 + 48;
            this.viruses.forEach(v => {
                if (!v.active) return;
                v.currentArea = 1;
                v.baseX = this.scale.width + 350;
                v.baseY = node1TopY + (v.lane * 96);
            });
        });
        const summonFinalBtn = this.createDebugButton(10, 128, 'Summon Virus Attack', () => {
            if (!this.finalWaveStarted) {
                this.startFinalWave();
            }
        });
        
        const speedBtn = this.createDebugButton(10, 156, 'Game Speed: x1', () => {
            this.debugGameSpeed = this.debugGameSpeed === 1 ? 2 : (this.debugGameSpeed === 2 ? 4 : 1);
            speedBtn.setText(`Game Speed: x${this.debugGameSpeed}`);
            this.time.timeScale = this.debugGameSpeed;
            this.tweens.timeScale = this.debugGameSpeed;
            // No arcade physics, just scaling our own delta in update()
        });

        const lvl1Btn = this.createDebugButton(10, 184, 'Load Level N1-1', () => {
            setProgress({ node1Level: 1, unlockedPowerTower: false });
            this.scene.start('LoadingScene', { levelLabel: 'N1-1', levelId: 1 });
        });
        
        const lvl2Btn = this.createDebugButton(10, 212, 'Load Level N1-2', () => {
            setProgress({ node1Level: 2, unlockedPowerTower: true });
            this.scene.start('LoadingScene', { levelLabel: 'N1-2', levelId: 2 });
        });

        this.debugPanelBody = this.add.container(0, 0, [bodyBg, infiniteBtn, cooldownBtn, sendAllBtn, summonFinalBtn, speedBtn, lvl1Btn, lvl2Btn]);
        this.debugPanelBody.setDepth(3001);
        
        this.debugPanelContainer = this.add.container(14, 154, [panelBg, title, toggle, this.debugPanelBody]);
        this.debugPanelContainer.setScrollFactor(0).setDepth(3000);
        this.debugPanelContainer.setSize(240, 34);
        this.debugPanelContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, 240, 34), Phaser.Geom.Rectangle.Contains);
        this.input.setDraggable(this.debugPanelContainer);
        this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
            if (gameObject === this.debugPanelContainer) {
                (gameObject as Phaser.GameObjects.Container).x = dragX;
                (gameObject as Phaser.GameObjects.Container).y = dragY;
            }
        });

        toggle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            pointer.event.stopPropagation(); // Avoid triggering drag
            this.debugPanelOpen = !this.debugPanelOpen;
            this.debugPanelBody?.setVisible(this.debugPanelOpen);
            toggle.setText(this.debugPanelOpen ? '▲' : '▼');
        });

        this.debugPanelBody.setVisible(false);
    }

    private createDebugButton(x: number, y: number, label: string, cb: () => void) {
        const btn = this.add.text(x, y, label, {
            fontSize: '13px',
            fontFamily: 'monospace',
            color: '#ffffff',
            backgroundColor: '#222222',
            padding: { x: 6, y: 4 }
        }).setInteractive({ useHandCursor: true });
        btn.on('pointerup', cb);
        return btn;
    }

    private cleanupScene() {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;

        this.towers.forEach(tower => tower.destroy());
        this.viruses.forEach(virus => virus.destroy());
        this.projectiles.forEach(projectile => projectile.destroy());

        this.towers = [];
        this.viruses = [];
        this.projectiles = [];

        this.events.off(EVENT_IDS.addEnergy);
        this.events.off(EVENT_IDS.virusKilled);
        this.events.off(EVENT_IDS.spawnProjectile);
    }

    private handleGridClick(worldX: number, worldY: number) {
        if (!this.selectedTowerType || this.previewMode) return;
        
        let area = this.currentArea;
        
        let cost = 0;
        if (this.selectedTowerType === 'zapper') cost = TOWER.zapperCost;
        else if (this.selectedTowerType === 'power') cost = TOWER.powerCost;
        else if (this.selectedTowerType === 'pole') cost = TOWER.powerPoleCost;

        // Check cooldown
        if (this.selectedTowerType === 'zapper' && this.zapperCooldownTime > 0) return;
        if (this.selectedTowerType === 'power' && this.powerCooldownTime > 0) return;

        if (this.selectedTowerType !== 'remove' && this.energy < cost) {
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
            
            // No Build Zone in the direct center 4 tiles where the physical core geometry spans
            if ((col === 5 || col === 6) && (gridY === 5 || gridY === 6)) {
                if (this.selectedTowerType !== 'wire') return;
                snappedX = 512;
                snappedY = 424;
            } else {
                snappedX = originX + (col * 54) + 27; snappedY = originY + (gridY * 54) + 27;
            }
        }

        // Check if tower already exists there
        const existingTowerIndex = this.towers.findIndex(t => Math.abs(t.x - snappedX) < 10 && Math.abs(t.y - snappedY) < 10);
        
        if (this.selectedTowerType === 'remove') {
            if (existingTowerIndex !== -1) {
                const tower = this.towers[existingTowerIndex];
                if (tower === this.corePole) return; // Cannot delete the main core pole!

                // If pole, cleanup connections
                if (tower instanceof PowerPole) {
                    for (const other of this.towers) {
                        if (other instanceof PowerPole) {
                            other.connectedTo = other.connectedTo.filter(p => p !== tower);
                        }
                    }
                }

                // Refund 50% cost depending on tower type
                let refund = 0;
                if (tower instanceof Zapper) refund = Math.floor(TOWER.zapperCost / 2);
                else if (tower instanceof PowerFactory) refund = Math.floor(TOWER.powerCost / 2);
                else if (tower instanceof PowerPole) refund = Math.floor(TOWER.powerPoleCost / 2);

                this.energy += refund;
                this.energyText.setText(`${this.energy}`);
                tower.destroy();
                this.towers.splice(existingTowerIndex, 1);
                
                this.updatePowerGrid();
            }
            return;
        }

        if (this.selectedTowerType === 'wire') {
            if (existingTowerIndex !== -1 && this.towers[existingTowerIndex] instanceof PowerPole) {
                const targetPole = this.towers[existingTowerIndex] as PowerPole;
                if (!this.wireFromNode) {
                    this.wireFromNode = targetPole;
                    // Flash it to show selection
                    this.tweens.add({ targets: targetPole.visualCore, scale: 1.5, duration: 200, yoyo: true });
                } else if (this.wireFromNode !== targetPole) {
                    // Check if already connected
                    if (!this.wireFromNode.connectedTo.includes(targetPole) && !targetPole.connectedTo.includes(this.wireFromNode)) {
                        // Check max connections
                        if (this.wireFromNode.connectedTo.length < TOWER.powerPoleMaxConnections && targetPole.connectedTo.length < TOWER.powerPoleMaxConnections) {
                            this.wireFromNode.connectedTo.push(targetPole);
                            targetPole.connectedTo.push(this.wireFromNode);
                            this.updatePowerGrid();
                        }
                    }
                    this.wireFromNode = null; // reset node selection
                    this.selectedTowerType = null; // exit wire tool
                    this.events.emit('deselect_ui');
                    this.previewGraphic.setVisible(false);
                }
            } else {
                this.wireFromNode = null; // click empty space to cancel
                this.selectedTowerType = null;
                this.events.emit('deselect_ui');
                this.previewGraphic.setVisible(false);
            }
            return;
        }

        if (existingTowerIndex !== -1) return; // Can't build on top of another tower

        // Place Tower
        this.energy -= cost;
        this.energyText.setText(`${this.energy}`);

        let newTower: BaseTower;
        if (this.selectedTowerType === 'zapper') {
            newTower = new Zapper(this, snappedX, snappedY, area, snappedX, gridY); // Passing gridY for lane shooting
            this.zapperCooldownTime = TOWER.zapperCooldownMs;
        } else if (this.selectedTowerType === 'pole') {
            newTower = new PowerPole(this, snappedX, snappedY, area, snappedX, gridY);
        } else {
            newTower = new PowerFactory(this, snappedX, snappedY, area, snappedX, gridY);
            // PVZ actually has a fairly short cooldown for sun producers, let's say 4 seconds
            this.powerCooldownTime = TOWER.powerCooldownMs;
        }
        
        this.towers.push(newTower);
        this.updatePowerGrid();

        // Advance tutorial step 2 if placing Power Tower
        if (this.tutorialState === 2 && this.selectedTowerType === 'power') {
            this.tutorialPowerPlacedCount++;
            if (this.tutorialPowerPlacedCount < 3) {
                const remaining = 3 - this.tutorialPowerPlacedCount;
                this.tutorialText.setText(`Good. Place ${remaining} more energy maker${remaining === 1 ? '' : 's'} to finish the setup.`);
            } else {
                this.advanceTutorial();
            }
        }
    }

    private switchArea(areaIndex: number) {
        if (this.previewMode) return;
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
        delta *= this.debugGameSpeed;

        if (this.debugInfiniteEnergy) {
            this.energy = 99999;
            this.energyText.setText(`${this.energy}`);
        }

        if (this.debugNoCooldowns) {
            this.zapperCooldownTime = 0;
            this.powerCooldownTime = 0;
            this.zapperCooldownOverlay.setVisible(false);
            this.powerCooldownOverlay.setVisible(false);
        }

        // Cooldown processing
        if (this.zapperCooldownTime > 0) {
            this.zapperCooldownTime -= delta;
            this.zapperCooldownOverlay.setVisible(true);
            // PvZ style recharge (gray overlay shrinks downwards to reveal tower)
            const percent = this.zapperCooldownTime / 5000;
            this.zapperCooldownOverlay.height = percent * 60;
            this.zapperCooldownOverlay.y = 70 - (this.zapperCooldownOverlay.height / 2);
            if (this.zapperCooldownTime <= 0) this.zapperCooldownOverlay.setVisible(false);
        }
        if (this.powerCooldownTime > 0) {
            this.powerCooldownTime -= delta;
            this.powerCooldownOverlay.setVisible(true);
            const percent = this.powerCooldownTime / 4000;
            this.powerCooldownOverlay.height = percent * 60;
            this.powerCooldownOverlay.y = 70 - (this.powerCooldownOverlay.height / 2);
            if (this.powerCooldownTime <= 0) this.powerCooldownOverlay.setVisible(false);
        }

        // Towers keep ticking before the wave starts, which lets economy defenses feel alive.
        this.towers = this.towers.filter(t => {
            if (!t.isAlive) return false;
            if (!this.previewMode) t.tick(time, delta, this.viruses);
            return true;
        });

        if (!this.waveActive || this.coreHp <= 0) return;

        const leaderAlive = this.finalWaveLeader && this.finalWaveLeader.active;
        this.viruses.forEach(v => v.setSpeedMultiplier(leaderAlive ? 1.5 : 1));

        // Campaign progression: one slow virus wave at a time, with time-based advancement
        if (!this.finalWaveStarted) {
            if (!this.campaignWaveResolved && this.currentCampaignVirus) {
                this.campaignWaveLifetime -= delta;
                if (this.campaignWaveLifetime <= 0) {
                    this.resolveCampaignWave(false);
                }
            }

            if (this.campaignWaveResolved) {
                this.spawnTimer += delta;
                if (this.spawnTimer >= this.waveStats.campaignWaveGapMs && this.waveKilled < this.waveTotal) {
                    this.spawnCampaignWave();
                }
            }
        } else {
            // Final flag wave: lots of enemies in all lanes
            if (this.finalWaveSpawned < this.waveStats.finalWaveTotalViruses) {
                this.finalWaveSpawnTimer += delta;
                const progress = this.finalWaveSpawned / this.waveStats.finalWaveTotalViruses;
                const spawnRate = this.waveStats.finalWaveSpawnRateStartMs - (progress * (this.waveStats.finalWaveSpawnRateStartMs - this.waveStats.finalWaveSpawnRateEndMs));

                if (this.finalWaveSpawnTimer >= spawnRate) {
                    this.finalWaveSpawnTimer = 0;
                    this.spawnFinalWaveVirus();
                }
            }

            if (leaderAlive) {
                this.finalWaveLeaderSummonTimer += delta;
                if (this.finalWaveLeaderSummonTimer >= 10000) {
                    this.finalWaveLeaderSummonTimer = 0;
                    this.summonLeaderReinforcements();
                }
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
            const virusBounds = virus.getBounds();
            // Find if there is a tower directly in front of this virus to attack
            let targetTower = null;
            if (virus.currentArea === 1) { // Only checking basic Node 1 collisions for now (lane matching)
                targetTower = this.towers.find(t => t.currentArea === 1 && t.gridY === virus.lane && Phaser.Geom.Rectangle.Overlaps(t.getBounds(), virusBounds));
            } else if (virus.currentArea === 0) {
                targetTower = this.towers.find(t => t.currentArea === 0 && Phaser.Geom.Rectangle.Overlaps(t.getBounds(), virusBounds));
            }
            
            const coreCenterX = this.scale.width / 2; // 512
            const coreCenterY = (this.scale.height / 2) + 40;
            const reachedCore = virus.currentArea === 0 && Phaser.Math.Distance.Between(virus.baseX, virus.baseY, coreCenterX, coreCenterY) < 32;

            virus.tick(delta, targetTower, reachedCore);

            // Projectile Collisions
            this.projectiles.forEach(p => {
                const virusLane = virus.currentArea === 0 ? virus.lane + 3 : virus.lane;
                if (p.active && p.currentArea === virus.currentArea && p.lane === virusLane && Phaser.Geom.Rectangle.Overlaps(p.getCollisionBounds(), virusBounds)) {
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
