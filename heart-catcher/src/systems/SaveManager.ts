import type { SaveData, LevelSave } from '../data/types';

const SAVE_KEY = 'heart-catcher-save';

function defaultSave(): SaveData {
  return {
    currentLevel: 1,
    levels: {},
    scrapbookReadIds: [],
  };
}

export class SaveManager {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return JSON.parse(raw) as SaveData;
    } catch {
      // ignore
    }
    return defaultSave();
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // ignore (private browsing mode may block this)
    }
  }

  completeLevel(levelId: number, timeMs: number, heartsFound: number, masterCatcher: boolean): void {
    const existing = this.data.levels[levelId];
    this.data.levels[levelId] = {
      completed: true,
      bestTimeMs: existing ? Math.min(existing.bestTimeMs, timeMs) : timeMs,
      heartsFound,
      masterCatcher: existing?.masterCatcher || masterCatcher,
    };
    if (levelId >= this.data.currentLevel) {
      this.data.currentLevel = Math.min(levelId + 1, 22);
    }
    this.save();
  }

  getLevelSave(levelId: number): LevelSave | null {
    return this.data.levels[levelId] ?? null;
  }

  isLevelComplete(levelId: number): boolean {
    return this.data.levels[levelId]?.completed ?? false;
  }

  markScrapbookRead(entryId: number): void {
    if (!this.data.scrapbookReadIds.includes(entryId)) {
      this.data.scrapbookReadIds.push(entryId);
      this.save();
    }
  }

  get currentLevel(): number { return this.data.currentLevel; }
  get scrapbookReadIds(): number[] { return [...this.data.scrapbookReadIds]; }

  reset(): void {
    this.data = defaultSave();
    this.save();
  }
}
