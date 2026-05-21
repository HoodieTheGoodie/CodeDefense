export const WAVE = {
    definitions: [
        { totalViruses: 10, hpMultiplier: 1, speedMultiplier: 1 },
        { totalViruses: 14, hpMultiplier: 1.15, speedMultiplier: 1.08 },
        { totalViruses: 18, hpMultiplier: 1.35, speedMultiplier: 1.16 }
    ],
    initialSpawnDelayMs: 1200,
    betweenWaveDelayMs: 3500,
    spawnRateStartMs: 2600,
    spawnRateEndMs: 1200
};

export const VIRUS = {
    maxHp: 100,
    speed: 18,
    uploadTimeMs: 3500,
    disorientMs: 450,
    disorientSlowMultiplier: 0.25
};

export const PROJECTILE = {
    speed: 420,
    damage: 20,
    stunMs: VIRUS.disorientMs
};

export const TOWER = {
    zapperCost: 100,
    zapperCooldownMs: 3000,
    zapperFireRateMs: 850,
    powerCost: 50,
    powerCooldownMs: 4000,
    powerGenRateMs: 7000,
    powerGenAmount: 25
};
