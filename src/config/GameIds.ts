export const EVENT_IDS = {
    spawnProjectile: 'event.spawn_projectile',
    addEnergy: 'event.add_energy',
    virusKilled: 'event.virus_killed',
    towerUnlocked: 'event.tower_unlocked'
} as const;

export const TOWER_IDS = {
    zapper: 'tower.zapper',
    powerFactory: 'tower.power_factory',
    powerPole: 'tower.power_pole',
    powerTower: 'tower.power_tower'
} as const;

export const VIRUS_IDS = {
    standard: 'virus.standard',
    green: 'virus.green',
    leader: 'virus.leader'
} as const;

export const SPECIAL_EVENT_IDS = {
    finalWave: 'special.final_wave'
} as const;
