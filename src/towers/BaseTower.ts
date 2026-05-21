import Phaser from 'phaser';

export class BaseTower extends Phaser.GameObjects.Rectangle {
    public hp: number;
    public maxHp: number;
    public currentArea: number;
    public gridX: number;
    public gridY: number;
    public isAlive: boolean = true;

    constructor(scene: Phaser.Scene, x: number, y: number, color: number, hp: number, currentArea: number, gridX: number, gridY: number) {
        super(scene, x, y, 40, 40, color);
        this.hp = hp;
        this.maxHp = hp;
        this.currentArea = currentArea;
        this.gridX = gridX;
        this.gridY = gridY;
        scene.add.existing(this);
    }

    public takeDamage(amount: number) {
        if (!this.isAlive) return;
        this.hp -= amount;
        
        this.setAlpha(this.hp / this.maxHp);
        
        if (this.hp <= 0) {
            this.isAlive = false;
            this.destroy();
        }
    }

    public tick(time: number, delta: number, viruses: any[]) {
        // To be overridden
    }
}
