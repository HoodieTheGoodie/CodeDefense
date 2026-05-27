const fs = require('fs');

let content = fs.readFileSync('src/scenes/GameScene.ts', 'utf8');

const s1 = `    private currentLevel: number = 1;`;
if (!content.includes(s1)) {
    content = content.replace(`    private waveTotal: number = 0;`, `    private currentLevel: number = 1;\n    private waveTotal: number = 0;`);
}

const s2 = `    create(data?: { level?: number }) {`;
content = content.replace(`    create() {`, s2);

const s3 = `        // Small persistent debug label`;
content = content.replace(s3, `        this.currentLevel = data?.level ?? getProgress().node1Level;\n\n        // Small persistent debug label`);

const s4 = `        markNode1LevelCleared(2);`;
content = content.replace(s4, `        markNode1LevelCleared(this.currentLevel + 1);`);

fs.writeFileSync('src/scenes/GameScene.ts', content);
console.log('patched levels');
