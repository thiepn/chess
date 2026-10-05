import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { UserState } from "../domain/types";

const LOCAL_KEY = "thiepn.chess.user-state.v1";

export interface ChessStateRepository {
  load(fallback: UserState): Promise<UserState>;
  save(state: UserState): Promise<void>;
  mode: "local" | "supabase";
}

class LocalChessStateRepository implements ChessStateRepository {
  mode = "local" as const;

  async load(fallback: UserState) {
    try {
      const value = localStorage.getItem(LOCAL_KEY);
      return value ? (JSON.parse(value) as UserState) : fallback;
    } catch {
      return fallback;
    }
  }

  async save(state: UserState) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  }
}

class SupabaseChessStateRepository implements ChessStateRepository {
  mode = "supabase" as const;
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
  }

  private async userId() {
    const { data } = await this.client.auth.getUser();
    return data.user?.id;
  }

  async load(fallback: UserState) {
    const loadLocal = () => {
      try {
        const local = localStorage.getItem(LOCAL_KEY);
        return local ? (JSON.parse(local) as UserState) : fallback;
      } catch {
        return fallback;
      }
    };

    try {
      const userId = await this.userId();
      if (!userId) return loadLocal();

      const { data, error } = await this.client
        .from("chess_user_state")
        .select("state")
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data?.state) return loadLocal();
      return data.state as UserState;
    } catch {
      return loadLocal();
    }
  }

  async save(state: UserState) {
    const saveLocal = () => {
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
      } catch {
        // Persistence fallback is best-effort.
      }
    };

    try {
      const userId = await this.userId();
      if (!userId) {
        saveLocal();
        return;
      }

      const { error } = await this.client.from("chess_user_state").upsert({
        user_id: userId,
        state,
        updated_at: new Date().toISOString(),
      });

      if (error) saveLocal();
    } catch {
      saveLocal();
    }
  }
}

export function createChessStateRepository(): ChessStateRepository {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (url && key) return new SupabaseChessStateRepository(url, key);
  return new LocalChessStateRepository();
}
