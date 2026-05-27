const fs = require('fs');

let content = fs.readFileSync('src/scenes/GameScene.ts', 'utf8');

const s1 = `        const forceLvlBtn = this.createDebugButton(10, 184, 'Force Next Level', () => {
            const curr = getProgress();
            setProgress({ node1Level: curr.node1Level + 1, unlockedPowerTower: true });
            this.scene.start('LoadingScene', { levelLabel: \`N1-\${curr.node1Level + 1}\` });
        });`;

const replacement = `        const lvl1Btn = this.createDebugButton(10, 184, 'Load Level N1-1', () => {
            setProgress({ node1Level: 1, unlockedPowerTower: false });
            this.scene.start('LoadingScene', { levelLabel: 'N1-1', levelId: 1 });
        });
        
        const lvl2Btn = this.createDebugButton(10, 212, 'Load Level N1-2', () => {
            setProgress({ node1Level: 2, unlockedPowerTower: true });
            this.scene.start('LoadingScene', { levelLabel: 'N1-2', levelId: 2 });
        });`;

content = content.replace(s1, replacement);

const line1 = `        const bodyBg = this.add.rectangle(0, 34, 240, 220, 0x000000, 0.9).setOrigin(0).setStrokeStyle(1, 0x00ffcc);`;
content = content.replace(line1, `        const bodyBg = this.add.rectangle(0, 34, 240, 250, 0x000000, 0.9).setOrigin(0).setStrokeStyle(1, 0x00ffcc);`);

const line2 = `[bodyBg, infiniteBtn, cooldownBtn, sendAllBtn, summonFinalBtn, speedBtn, forceLvlBtn]`;
content = content.replace(line2, `[bodyBg, infiniteBtn, cooldownBtn, sendAllBtn, summonFinalBtn, speedBtn, lvl1Btn, lvl2Btn]`);

fs.writeFileSync('src/scenes/GameScene.ts', content);
console.log('patched debug level select');
