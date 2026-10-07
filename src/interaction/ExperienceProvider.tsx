import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CelebrationLevel,
  ExperienceSettings,
  FeedbackEvent,
} from "./types";
import { normalizeExperienceSettings } from "./customization";
import type { ExperienceEventDetail } from "./events";

interface ExperienceContextValue {
  settings: ExperienceSettings;
  reducedMotion: boolean;
  updateSettings: (patch: Partial<ExperienceSettings>) => void;
  feedback: (event: FeedbackEvent) => void;
  celebrate: (level?: CelebrationLevel) => void;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

const soundMap: Record<FeedbackEvent, { frequency: number; duration: number; gain: number }> = {
  select: { frequency: 340, duration: .025, gain: .018 },
  move: { frequency: 220, duration: .04, gain: .025 },
  capture: { frequency: 155, duration: .055, gain: .03 },
  castle: { frequency: 260, duration: .07, gain: .024 },
  promotion: { frequency: 560, duration: .10, gain: .028 },
  reveal: { frequency: 390, duration: .035, gain: .016 },
  check: { frequency: 470, duration: .065, gain: .025 },
  success: { frequency: 620, duration: .075, gain: .028 },
  error: { frequency: 120, duration: .06, gain: .025 },
  complete: { frequency: 760, duration: .11, gain: .03 },
  mate: { frequency: 880, duration: .15, gain: .035 },
  navigate: { frequency: 300, duration: .025, gain: .015 },
};

const vibrationMap: Partial<Record<FeedbackEvent, number | number[]>> = {
  select: 7,
  move: 9,
  capture: [10, 18, 13],
  castle: [8, 12, 8],
  promotion: [10, 14, 18],
  reveal: 7,
  check: [10, 22, 10],
  success: 14,
  error: [18, 24, 18],
  complete: [12, 28, 16],
  mate: [18, 32, 18, 45, 28],
};

function systemPrefersReducedMotion() {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function CelebrationLayer({
  nonce,
  level,
  reducedMotion,
}: {
  nonce: number;
  level: CelebrationLevel;
  reducedMotion: boolean;
}) {
  if (!nonce || reducedMotion) return null;
  const count = level === "large" ? 28 : level === "medium" ? 18 : 10;

  return (
    <div
      key={nonce}
      className={`celebration-layer celebration-${level}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <i
          key={index}
          style={{
            "--particle-index": index,
            "--particle-count": count,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

export function ExperienceProvider({
  settings,
  onChange,
  children,
}: {
  settings: ExperienceSettings;
  onChange: (settings: ExperienceSettings) => void;
  children: ReactNode;
}) {
  const audioRef = useRef<AudioContext | null>(null);
  const resolvedSettings = useMemo(
    () => normalizeExperienceSettings(settings),
    [settings],
  );
  const [systemReduced, setSystemReduced] = useState(systemPrefersReducedMotion);
  const [celebrationNonce, setCelebrationNonce] = useState(0);
  const [celebrationLevel, setCelebrationLevel] =
    useState<CelebrationLevel>("small");

  const reducedMotion =
    resolvedSettings.motion === "reduced" ||
    (resolvedSettings.motion === "system" && systemReduced);

  useEffect(
    () => () => {
      const context = audioRef.current;
      if (context && context.state !== "closed") void context.close();
    },
    [],
  );

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;

    const sync = () => setSystemReduced(media.matches);
    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = reducedMotion ? "reduced" : "full";
    root.dataset.appTheme = resolvedSettings.appTheme;
    root.dataset.boardTheme = resolvedSettings.boardTheme;
    root.dataset.pieceStyle = resolvedSettings.pieceStyle;
  }, [
    reducedMotion,
    resolvedSettings.appTheme,
    resolvedSettings.boardTheme,
    resolvedSettings.pieceStyle,
  ]);

  const updateSettings = useCallback(
    (patch: Partial<ExperienceSettings>) => {
      onChange({ ...resolvedSettings, ...patch });
    },
    [onChange, resolvedSettings],
  );

  const feedback = useCallback(
    (event: FeedbackEvent) => {
      if (resolvedSettings.haptics && navigator.vibrate) {
        const pattern = vibrationMap[event];
        if (pattern) navigator.vibrate(pattern);
      }

      if (!resolvedSettings.sound) return;

      try {
        const audioWindow = window as unknown as {
          AudioContext?: typeof AudioContext;
          webkitAudioContext?: typeof AudioContext;
        };
        const AudioCtor =
          audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
        if (!AudioCtor) return;

        const context = audioRef.current ?? new AudioCtor();
        audioRef.current = context;
        if (context.state === "suspended") void context.resume();

        const config = soundMap[event];
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;

        oscillator.type = event === "error" ? "square" : "sine";
        oscillator.frequency.setValueAtTime(config.frequency, now);
        if (event === "success" || event === "complete" || event === "mate") {
          oscillator.frequency.exponentialRampToValueAtTime(
            config.frequency * 1.2,
            now + config.duration,
          );
        }

        gain.gain.setValueAtTime(config.gain, now);
        gain.gain.exponentialRampToValueAtTime(.0001, now + config.duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + config.duration);
      } catch {
        // Audio feedback is enhancement-only.
      }
    },
    [resolvedSettings.haptics, resolvedSettings.sound],
  );

  const celebrate = useCallback(
    (level: CelebrationLevel = "small") => {
      if (!resolvedSettings.celebrations || reducedMotion) return;
      setCelebrationLevel(level);
      setCelebrationNonce((value) => value + 1);
    },
    [reducedMotion, resolvedSettings.celebrations],
  );

  useEffect(() => {
    const handleExperience = (event: Event) => {
      const detail = (event as CustomEvent<ExperienceEventDetail>).detail;
      if (detail?.feedback) feedback(detail.feedback);
      if (detail?.celebration) celebrate(detail.celebration);
    };

    window.addEventListener("chess:experience", handleExperience);
    return () => window.removeEventListener("chess:experience", handleExperience);
  }, [celebrate, feedback]);

  const value = useMemo(
    () => ({
      settings: resolvedSettings,
      reducedMotion,
      updateSettings,
      feedback,
      celebrate,
    }),
    [celebrate, feedback, reducedMotion, resolvedSettings, updateSettings],
  );

  return (
    <ExperienceContext.Provider value={value}>
      {children}
      <CelebrationLayer
        nonce={celebrationNonce}
        level={celebrationLevel}
        reducedMotion={reducedMotion}
      />
    </ExperienceContext.Provider>
  );
}

export function useExperience() {
  const value = useContext(ExperienceContext);
  if (!value) {
    throw new Error("useExperience must be used inside ExperienceProvider.");
  }
  return value;
}
