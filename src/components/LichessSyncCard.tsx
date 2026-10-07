import {
  ExternalLink,
  Link2,
  LoaderCircle,
  RefreshCcw,
  Unlink,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { LichessConnection } from "../lichess/types";
import { lichessPlayUrl, lichessProfileUrl } from "../lichess/api";

interface LichessSyncCardProps {
  connection?: LichessConnection;
  syncing: boolean;
  message?: string | null;
  error?: string | null;
  compact?: boolean;
  onLink: (username: string) => Promise<void> | void;
  onUnlink: () => void;
  onSync: () => Promise<void> | void;
}

export function LichessSyncCard({
  connection,
  syncing,
  message,
  error,
  compact = false,
  onLink,
  onUnlink,
  onSync,
}: LichessSyncCardProps) {
  const [username, setUsername] = useState(connection?.username ?? "");
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    setUsername(connection?.username ?? "");
  }, [connection?.username]);

  async function link() {
    const value = username.trim();
    if (!value || linking) return;
    setLinking(true);
    try {
      await onLink(value);
    } finally {
      setLinking(false);
    }
  }

  if (!connection) {
    return (
      <article className={compact ? "lichess-card compact" : "lichess-card"}>
        <div className="lichess-card-icon">
          <Link2 size={22} />
        </div>
        <div className="lichess-card-copy">
          <p className="eyebrow">LICHESS</p>
          <strong>Link your public username</strong>
          <span>
            No password or API token is stored. THIEPN uses your public game
            history to pull finished human games into Review.
          </span>
        </div>
        <div className="lichess-link-form">
          <input
            aria-label="Lichess username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Lichess username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onKeyDown={(event) => {
              if (event.key === "Enter") void link();
            }}
          />
          <button
            className="secondary"
            type="button"
            disabled={!username.trim() || linking}
            onClick={() => void link()}
          >
            {linking ? <LoaderCircle className="spin" size={15} /> : <Link2 size={15} />}
            Link
          </button>
        </div>
        {error && <div className="lichess-inline-error" role="alert">{error}</div>}
      </article>
    );
  }

  return (
    <article className={compact ? "lichess-card compact linked" : "lichess-card linked"}>
      <div className="lichess-card-icon linked">
        <Users size={22} />
      </div>
      <div className="lichess-card-copy">
        <p className="eyebrow">HUMAN PLAY · LICHESS</p>
        <strong>{connection.username}</strong>
        <span>
          {connection.lastSyncAt
            ? `Last synced ${new Date(connection.lastSyncAt).toLocaleString()} · ${connection.lastSyncCount ?? 0} new game${connection.lastSyncCount === 1 ? "" : "s"}.`
            : "Linked. Sync finished games whenever you return from Lichess."}
        </span>
      </div>

      <div className="lichess-card-actions">
        {!compact && (
          <a
            className="primary"
            href={lichessPlayUrl()}
            target="_blank"
            rel="noreferrer"
          >
            Play humans <ExternalLink size={16} />
          </a>
        )}
        <button
          className="secondary"
          type="button"
          disabled={syncing}
          onClick={() => void onSync()}
        >
          {syncing ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <RefreshCcw size={15} />
          )}
          {syncing ? "Syncing…" : "Sync games"}
        </button>
        <a
          className="lichess-profile-link"
          href={lichessProfileUrl(connection.username)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${connection.username} on Lichess`}
        >
          <ExternalLink size={15} />
        </a>
        <button
          className="lichess-unlink"
          type="button"
          onClick={onUnlink}
          aria-label="Unlink Lichess"
        >
          <Unlink size={15} />
        </button>
      </div>

      {message && <div className="lichess-inline-message" role="status" aria-live="polite">{message}</div>}
      {error && <div className="lichess-inline-error" role="alert">{error}</div>}
    </article>
  );
}
