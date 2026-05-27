export const WAVE = {
    campaignWaves: 6,
    campaignWaveLifetimeMs: 12000,
    campaignWaveGapMs: 3500,
    campaignInitialSpawnDelayMs: 2200,
    finalWaveTotalViruses: 24,
    finalWaveInitialDelayMs: 1800,
    finalWaveSpawnRateStartMs: 1800,
    finalWaveSpawnRateEndMs: 900
};

export function getWaveData(level: number) {
    if (level === 1) return WAVE;
    
    // Scale difficulty for later levels
    const multiplier = 1 + ((level - 1) * 0.5);
    return {
        campaignWaves: Math.floor(WAVE.campaignWaves * multiplier),
        campaignWaveLifetimeMs: WAVE.campaignWaveLifetimeMs - (level * 500),
        campaignWaveGapMs: Math.max(1500, WAVE.campaignWaveGapMs - (level * 200)),
        campaignInitialSpawnDelayMs: WAVE.campaignInitialSpawnDelayMs,
        finalWaveTotalViruses: Math.floor(WAVE.finalWaveTotalViruses * multiplier),
        finalWaveInitialDelayMs: WAVE.finalWaveInitialDelayMs,
        finalWaveSpawnRateStartMs: Math.max(800, WAVE.finalWaveSpawnRateStartMs - (level * 150)),
        finalWaveSpawnRateEndMs: Math.max(300, WAVE.finalWaveSpawnRateEndMs - (level * 100))
    };
}

export const VIRUS = {
    maxHp: 100,
    speed: 18,
    uploadTimeMs: 3500,
    disorientMs: 450,
    disorientSlowMultiplier: 0.25
};

export const GREEN_VIRUS = {
    maxHp: 250,
    speed: 14, // Slightly slower but much tankier
    uploadTimeMs: 3500,
    disorientMs: 300, // Harder to stun
    disorientSlowMultiplier: 0.5
};

export const PROJECTILE = {
    speed: 420,
    damage: 20,
    stunMs: VIRUS.disorientMs
};

export const TOWER = {
    zapperCost: 100,
    zapperCooldownMs: 3200,
    zapperFireRateMs: 2200,
    zapperPowerDraw: 15,
    powerCost: 50,
    powerCooldownMs: 4000,
    powerPoleCost: 25,
    powerPoleCooldownMs: 1500,
    powerPoleMaxConnections: 5,
    powerPoleRange: 5 // 5x5 grid cells
};

export const CORE = {
    maxPowerOutput: 100 // System overloads if things draw more than this
};
