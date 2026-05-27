export type ProgressState = {
    node1Level: number;
    unlockedPowerTower: boolean;
};

const STORAGE_KEY = 'codedefense.progress';

export function getProgress(): ProgressState {
    if (typeof window === 'undefined' || !window.localStorage) {
        return { node1Level: 1, unlockedPowerTower: false };
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return { node1Level: 1, unlockedPowerTower: false };
        const parsed = JSON.parse(raw) as Partial<ProgressState>;
        return {
            node1Level: parsed.node1Level && parsed.node1Level > 0 ? parsed.node1Level : 1,
            unlockedPowerTower: Boolean(parsed.unlockedPowerTower)
        };
    } catch {
        return { node1Level: 1, unlockedPowerTower: false };
    }
}

export function setProgress(next: ProgressState) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function markNode1LevelCleared(nextLevel: number) {
    const current = getProgress();
    setProgress({
        node1Level: Math.max(current.node1Level, nextLevel),
        unlockedPowerTower: current.unlockedPowerTower
    });
}

export function unlockPowerTower() {
    const current = getProgress();
    setProgress({
        node1Level: current.node1Level,
        unlockedPowerTower: true
    });
}
