---
name: game-animations
description: 'Use when creating, updating, or debugging Phaser animations and sprite assets.'
argument-hint: 'Sprite name or animation state'
user-invocable: true
---

# Game Animations

## When to Use
- Adding new animated entities (towers, viruses, projectiles)
- Updating sprite sheets and animation configurations
- Debugging animation frame rates, loops, or scale

## Procedure

1. **Asset Preparation**
   - Identify the size of each frame in the sprite sheet.
   - Verify the state/action being animated (e.g., idle, attack, death).
   - *If generating new assets*, note the style constraints (e.g., retro, sci-fi) to ensure the sprite matches the `CodeDefense` theme exactly.

2. **Asset Loading (`LoadingScene.ts`)**
   - Load the sprite sheet using `this.load.spritesheet('sprite-key', 'path/to/asset.png', { frameWidth: X, frameHeight: Y })`.
   
3. **Animation Definition**
   - Typically done in a scene's `create` method or a dedicated animation manager.
   - Use `this.anims.create()`.
   - Set the `key`, `frames` (via `this.anims.generateFrameNumbers`), `frameRate`, and `repeat` settings.

4. **Integration (`Entities/Towers`)**
   - Apply the animation to the Sprite or Physics Image.
   - Call `this.play('anim-key')` during the appropriate entity state.

5. **Quality Check**
   - Validate that the origin (`setOrigin`) and hitboxes (`setSize`) match the visual center.
   - Check the speed and fluidity of the animation.
