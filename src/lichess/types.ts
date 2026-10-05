export interface LichessConnection {
  username: string;
  linkedAt: string;
  autoSync: boolean;
  lastSyncAt?: string;
  lastImportedAt?: string;
  lastSyncCount?: number;
}

export interface LichessPublicProfile {
  id: string;
  username: string;
  title?: string;
  disabled?: boolean;
}

export interface LichessSyncResult {
  fetched: number;
  imported: number;
  duplicates: number;
  games: string[];
}
