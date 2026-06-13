// Phase 3: Sessions, Persistence & History (SOLID: Repository pattern - IPersistence, concrete LocalStorageRepository)
// Key Decision: Interface for future (IndexedDB, server, file). Use JSON for messages.
export interface IPersistence {
  save(key: string, data: any): void;
  load(key: string): any;
}

export class LocalStoragePersistence implements IPersistence {
  save(key: string, data: any): void {
    localStorage.setItem(`harness-${key}`, JSON.stringify(data));
  }
  load(key: string): any {
    const item = localStorage.getItem(`harness-${key}`);
    return item ? JSON.parse(item) : null;
  }
}