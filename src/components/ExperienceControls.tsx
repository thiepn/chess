import {
  Accessibility,
  Grid2X2,
  Palette,
  Settings2,
  Sparkles,
  Vibrate,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useExperience } from "../interaction/ExperienceProvider";
import type {
  AppTheme,
  BoardTheme,
  MotionPreference,
  PieceStyle,
} from "../interaction/types";
import {
  appThemeOptions,
  boardThemeOptions,
  pieceStyleOptions,
} from "../interaction/customization";
import { ChessPiece } from "./ChessPiece";

export function ExperienceControls() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();
  const headingId = useId();
  const { settings, updateSettings, feedback } = useExperience();

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      window.requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    };

    window.addEventListener("keydown", closeOnEscape);
    window.requestAnimationFrame(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>("input, select, button")
        ?.focus();
    });

    return () =>
      window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function toggle() {
    setOpen((value) => !value);
    feedback("select");
  }

  return (
    <div className={open ? "experience-controls open" : "experience-controls"}>
      <button
        ref={triggerRef}
        type="button"
        className="experience-trigger"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={dialogId}
        aria-haspopup="dialog"
        aria-label="Experience settings"
      >
        {open ? <X size={17} /> : <Settings2 size={17} />}
        <span>Experience</span>
      </button>

      {open && (
        <div
          ref={dialogRef}
          id={dialogId}
          className="experience-popover"
          role="dialog"
          aria-labelledby={headingId}
        >
          <div className="experience-popover-heading">
            <div>
              <p className="eyebrow">EXPERIENCE</p>
              <strong id={headingId}>Experience settings</strong>
            </div>
            <Accessibility size={18} />
          </div>

          <div className="experience-divider" />

          <fieldset className="appearance-setting-group">
            <legend>
              <Palette size={15} aria-hidden="true" />
              App finish
            </legend>
            <div className="appearance-choice-row app-theme-choices">
              {appThemeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="appearance-choice"
                  aria-pressed={settings.appTheme === option.id}
                  aria-label={`${option.label}. ${option.description}`}
                  title={option.description}
                  onClick={() => {
                    updateSettings({ appTheme: option.id as AppTheme });
                    feedback("select");
                  }}
                >
                  <span
                    className="app-theme-swatch"
                    data-preview-app-theme={option.id}
                    aria-hidden="true"
                  >
                    <i />
                    <i />
                  </span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="appearance-setting-group">
            <legend>
              <Grid2X2 size={15} aria-hidden="true" />
              Board
            </legend>
            <div className="appearance-choice-row board-theme-choices">
              {boardThemeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="appearance-choice"
                  aria-pressed={settings.boardTheme === option.id}
                  aria-label={`${option.label}. ${option.description}`}
                  title={option.description}
                  onClick={() => {
                    updateSettings({ boardTheme: option.id as BoardTheme });
                    feedback("select");
                  }}
                >
                  <span
                    className="board-theme-swatch"
                    data-preview-board-theme={option.id}
                    aria-hidden="true"
                  >
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="appearance-setting-group">
            <legend>Pieces</legend>
            <div className="appearance-choice-row piece-style-choices">
              {pieceStyleOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="appearance-choice piece-style-choice"
                  aria-pressed={settings.pieceStyle === option.id}
                  aria-label={`${option.label}. ${option.description}`}
                  title={option.description}
                  onClick={() => {
                    updateSettings({ pieceStyle: option.id as PieceStyle });
                    feedback("select");
                  }}
                >
                  <span className="piece-style-preview" aria-hidden="true">
                    <ChessPiece
                      color="w"
                      type="n"
                      styleVariant={option.id}
                    />
                  </span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            className="appearance-reset"
            onClick={() => {
              updateSettings({
                appTheme: "graphite",
                boardTheme: "tournament",
                pieceStyle: "classic",
              });
              feedback("select");
            }}
          >
            Reset appearance
          </button>

          <div className="experience-divider" />

          <SettingToggle
            icon={settings.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
            title="Sound"
            description="Move, capture and success cues."
            checked={settings.sound}
            onChange={(value) => updateSettings({ sound: value })}
          />

          <SettingToggle
            icon={<Vibrate size={16} />}
            title="Haptics"
            description="Subtle vibration on supported devices."
            checked={settings.haptics}
            onChange={(value) => updateSettings({ haptics: value })}
          />

          <SettingToggle
            icon={<Sparkles size={16} />}
            title="Celebrations"
            description="Reserved for meaningful progress."
            checked={settings.celebrations}
            onChange={(value) => updateSettings({ celebrations: value })}
          />

          <label className="motion-setting">
            <div>
              <Accessibility size={16} />
              <div>
                <strong>Motion</strong>
                <span>Respect system settings or override them.</span>
              </div>
            </div>
            <select
              value={settings.motion}
              onChange={(event) =>
                updateSettings({
                  motion: event.target.value as MotionPreference,
                })
              }
            >
              <option value="system">System</option>
              <option value="full">Full</option>
              <option value="reduced">Reduced</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

function SettingToggle({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="experience-setting">
      <div>
        {icon}
        <div>
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  );
}
