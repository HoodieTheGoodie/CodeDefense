import Phaser from 'phaser';

export class LoadingScene extends Phaser.Scene {
    constructor() {
        super('LoadingScene');
    }

    create(data: { levelLabel?: string, levelId?: number }) {
        const { width, height } = this.scale;
        const levelLabel = data?.levelLabel ?? 'N1-1';
        const parsedId = parseInt(levelLabel.replace('N1-', ''));
        const levelId = data?.levelId ?? (isNaN(parsedId) ? 1 : parsedId);

        // Background
        this.add.rectangle(0, 0, width * 2, height * 2, 0x050f05);

        // Fun text
        const loadText = this.add.text(width / 2, height / 2 - 50, `LOADING LEVEL ${levelLabel}...`, {
            fontSize: '32px',
            fontFamily: 'monospace',
            color: '#00ff00'
        }).setOrigin(0.5);

        // Progress bar container
        const barWidth = 400;
        this.add.rectangle(width / 2, height / 2 + 20, barWidth, 30, 0x000000).setStrokeStyle(2, 0x00ff00);
        
        // Progress bar fill
        const fill = this.add.rectangle(width / 2 - barWidth / 2 + 5, height / 2 + 20, 0, 20, 0x00ff00).setOrigin(0, 0.5);

        // Tween the loading bar to simulate loading
        this.tweens.add({
            targets: fill,
            width: barWidth - 10,
            duration: 2000,
            ease: 'Power2',
            onUpdate: (tween) => {
                if (tween.progress > 0.5) loadText.setText(`BOOTING ${levelLabel}...`);
                if (tween.progress > 0.8) loadText.setText(`LEVEL ${levelLabel} READY.`);
            },
            onComplete: () => {
                this.cameras.main.flash(500, 0, 255, 0);
                this.time.delayedCall(500, () => {
                    this.scene.start('GameScene', { level: levelId });
                });
            }
        });

        // Add some random matrix numbers in the background
        this.time.addEvent({
            delay: 50,
            loop: true,
            callback: () => {
                const char = Math.random() > 0.5 ? '1' : '0';
                const rx = Math.random() * width;
                const ry = Math.random() * height;
                const txt = this.add.text(rx, ry, char, { color: '#004400', fontSize: '20px' });
                this.tweens.add({
                    targets: txt,
                    alpha: 0,
                    y: ry + 50,
                    duration: 1000,
                    onComplete: () => txt.destroy()
                });
            }
        });
    }
}
