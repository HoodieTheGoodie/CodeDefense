import Phaser from 'phaser';
import { getProgress } from '../config/Progression';

export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        const { width, height } = this.scale;
        const progress = getProgress();

        // Background Wall
        this.add.rectangle(width / 2, height / 2, width, height, 0x1d1d2b);

        // Desk
        this.add.rectangle(width / 2, height - 100, width, 250, 0x3d2817); // Desk surface
        this.add.rectangle(width / 2, height - 225, width, 10, 0x2b1c10); // Desk edge

        // Monitor Base & Stand
        this.add.rectangle(width / 2, height - 200, 200, 15, 0x222222);
        this.add.rectangle(width / 2, height - 240, 50, 80, 0x111111);

        // Monitor Bezel
        this.add.rectangle(width / 2, height / 2 - 80, 640, 480, 0x222222).setStrokeStyle(4, 0x000000);

        // Monitor Screen
        const screenX = width / 2;
        const screenY = height / 2 - 80;
        const screen = this.add.rectangle(screenX, screenY, 600, 440, 0x050f05);

        // Scanline effect (Simple UI overlay)
        this.add.grid(screenX, screenY, 600, 440, 4, 4, 0x000000, 0, 0x00ff00, 0.05);

        // Title text "EchoDefense"
        this.add.text(screenX, screenY - 100, 'EchoDefense', {
            fontSize: '56px',
            fontFamily: 'monospace',
            color: '#00ff00',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 0, color: '#00ff00', blur: 10, stroke: true, fill: true }
        }).setOrigin(0.5);

        // "PLAY" Button inside screen
        const playBtn = this.add.text(screenX, screenY + 20, '> PLAY', {
            fontSize: '32px',
            fontFamily: 'monospace',
            color: '#00ff00'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.add.text(screenX + 220, screenY + 20, `N1-${progress.node1Level}`, {
            fontSize: '26px',
            fontFamily: 'monospace',
            color: '#ffff66',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        playBtn.on('pointerover', () => {
            playBtn.setColor('#ffffff');
            playBtn.setText('> PLAY _');
        });
        playBtn.on('pointerout', () => {
            playBtn.setColor('#00ff00');
            playBtn.setText('> PLAY');
        });
        playBtn.on('pointerdown', () => {
            playBtn.disableInteractive();
            this.cameras.main.zoomTo(1.2, 450, 'Sine.easeInOut');
            this.cameras.main.fadeOut(450, 0, 12, 0);
            this.time.delayedCall(460, () => {
                this.scene.start('LoadingScene', { levelLabel: `N1-${progress.node1Level}` });
            });
        });

        // "SETTINGS" Button inside screen
        const settingsBtn = this.add.text(screenX, screenY + 80, '> SETTINGS', {
            fontSize: '32px',
            fontFamily: 'monospace',
            color: '#00ff00'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        settingsBtn.on('pointerover', () => {
            settingsBtn.setColor('#ffffff');
            settingsBtn.setText('> SETTINGS _');
        });
        settingsBtn.on('pointerout', () => {
            settingsBtn.setColor('#00ff00');
            settingsBtn.setText('> SETTINGS');
        });
        settingsBtn.on('pointerdown', () => {
            console.log('Open settings panel - To Be Implemented');
        });

        // Little blinking cursor decorative text
        this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => {
                // You can add blinking logic here if you want independent cursors
            }
        });
    }
}
