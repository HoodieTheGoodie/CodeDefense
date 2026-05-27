const fs = require('fs');

let content = fs.readFileSync('src/scenes/GameScene.ts', 'utf8');

content = content.replace("private waveTotal: number = this.waveStats.campaignWaves;", "private waveTotal: number = 0;");

fs.writeFileSync('src/scenes/GameScene.ts', content);
console.log('patched init');
