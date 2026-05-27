import Phaser from 'phaser';
import { TOWER_IDS } from '../config/GameIds';
import { getProgress } from '../config/Progression';

export class UnlockScene extends Phaser.Scene {
    constructor() {
        super('UnlockScene');
    }

    create(data: { towerId?: string; title?: string; summary?: string }) {
        const { width, height } = this.scale;
        const progress = getProgress();

        this.add.rectangle(width / 2, height / 2, width, height, 0x060d1a);
        this.add.rectangle(width / 2, height / 2, width - 120, height - 120, 0x111111).setStrokeStyle(3, 0x00ffff);

        this.add.text(width / 2, 120, 'NEW TOWER UNLOCKED', {
            fontSize: '38px',
            fontFamily: 'monospace',
            color: '#00ffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const towerTitle = data?.title ?? (data?.towerId === TOWER_IDS.powerTower ? 'Power Tower' : 'Unknown Tower');
        const towerSummary = data?.summary ?? 'A new tower has been added to your arsenal.';

        this.add.text(width / 2, 220, towerTitle, {
            fontSize: '34px',
            fontFamily: 'monospace',
            color: '#ffff66',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, 320, towerSummary, {
            fontSize: '20px',
            fontFamily: 'monospace',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: width - 220 }
        }).setOrigin(0.5);

        const nextLevelBtn = this.add.text(width / 2, height - 180, `> NEXT LEVEL (N1-${progress.node1Level})`, {
            fontSize: '28px',
            fontFamily: 'monospace',
            color: '#00ff66',
            backgroundColor: '#113311',
            padding: { x: 16, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const menuBtn = this.add.text(width / 2, height - 110, '> MAIN MENU', {
            fontSize: '24px',
            fontFamily: 'monospace',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 14, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        nextLevelBtn.on('pointerup', () => {
            this.scene.start('LoadingScene', { levelLabel: `N1-${progress.node1Level}` });
        });

        menuBtn.on('pointerup', () => {
            this.scene.start('MainMenuScene');
        });
    }
}
