export const WAVE = {
    firstTotalViruses: 10,
    initialSpawnDelayMs: 1200,
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
    powerCooldownMs: 4000
};
