const fs = require('fs');

let content = fs.readFileSync('src/scenes/GameScene.ts', 'utf8');

const newPanel = `    private createDebugPanel() {
        const panelBg = this.add.rectangle(0, 0, 240, 34, 0x111111, 0.96).setOrigin(0).setStrokeStyle(2, 0x00ffcc);
        const title = this.add.text(10, 8, 'DEBUG', { fontSize: '16px', fontFamily: 'monospace', color: '#00ffcc' });
        const toggle = this.add.text(196, 2, '▼', { fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', padding: { x: 10, y: 8 } }).setInteractive({ useHandCursor: true });

        const bodyBg = this.add.rectangle(0, 34, 240, 220, 0x000000, 0.9).setOrigin(0).setStrokeStyle(1, 0x00ffcc);
        const infiniteBtn = this.createDebugButton(10, 44, 'Infinite Energy: OFF', () => {
            this.debugInfiniteEnergy = !this.debugInfiniteEnergy;
            infiniteBtn.setText(\`Infinite Energy: \${this.debugInfiniteEnergy ? 'ON' : 'OFF'}\`);
        });
        const cooldownBtn = this.createDebugButton(10, 72, 'No Cooldowns: OFF', () => {
            this.debugNoCooldowns = !this.debugNoCooldowns;
            cooldownBtn.setText(\`No Cooldowns: \${this.debugNoCooldowns ? 'ON' : 'OFF'}\`);
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
            speedBtn.setText(\`Game Speed: x\${this.debugGameSpeed}\`);
            this.time.timeScale = this.debugGameSpeed;
            this.tweens.timeScale = this.debugGameSpeed;
            // No arcade physics, just scaling our own delta in update()
        });

        const forceLvlBtn = this.createDebugButton(10, 184, 'Force Next Level', () => {
            const curr = getProgress();
            setProgress({ node1Level: curr.node1Level + 1, unlockedPowerTower: true });
            this.scene.start('LoadingScene', { levelLabel: \`N1-\${curr.node1Level + 1}\` });
        });

        this.debugPanelBody = this.add.container(0, 0, [bodyBg, infiniteBtn, cooldownBtn, sendAllBtn, summonFinalBtn, speedBtn, forceLvlBtn]).setScrollFactor(0).setDepth(3001);
        this.debugPanelContainer = this.add.container(14, 154, [panelBg, title, toggle, this.debugPanelBody]).setScrollFactor(0).setDepth(3000);
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
    }`;

const startMarker = '    private createDebugPanel() {';
const oldStart = content.indexOf(startMarker);
const oldEnd = content.indexOf('this.debugPanelBody.setVisible(false);\n    }', oldStart);

if (oldStart !== -1 && oldEnd !== -1) {
    const endMatch = 'this.debugPanelBody.setVisible(false);\n    }';
    const newContent = content.substring(0, oldStart) + newPanel + content.substring(oldEnd + endMatch.length);
    fs.writeFileSync('src/scenes/GameScene.ts', newContent);
    console.log("Success");
} else {
    console.log("Failed to find bounds");
}
