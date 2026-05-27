const fs = require('fs');

let content = fs.readFileSync('src/scenes/GameScene.ts', 'utf8');

const importStr = "import { TOWER, WAVE } from '../config/GameBalance';";
content = content.replace(importStr, "import { TOWER, WAVE, getWaveData } from '../config/GameBalance';");

// Insert waveStats property
content = content.replace("    private currentLevel: number = 1;\n    private waveTotal: number = 0;", "    private currentLevel: number = 1;\n    private waveStats: any;\n    private waveTotal: number = 0;");

// init waveStats in create:
content = content.replace(
    "        this.currentLevel = data?.level ?? getProgress().node1Level;",
    "        this.currentLevel = data?.level ?? getProgress().node1Level;\n        this.waveStats = getWaveData(this.currentLevel);"
);

// Replace WAVE with this.waveStats
content = content.replace(/WAVE\./g, "this.waveStats."); 

fs.writeFileSync('src/scenes/GameScene.ts', content);
console.log('patched wave stats');
