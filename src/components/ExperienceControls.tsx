import {
  Accessibility,
  Settings2,
  Sparkles,
  Vibrate,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useExperience } from "../interaction/ExperienceProvider";
import type { MotionPreference } from "../interaction/types";

export function ExperienceControls() {
  const [open, setOpen] = useState(false);
  const { settings, updateSettings, feedback } = useExperience();

  function toggle() {
    setOpen((value) => !value);
    feedback("select");
  }

  return (
    <div className={open ? "experience-controls open" : "experience-controls"}>
      <button
        type="button"
        className="experience-trigger"
        onClick={toggle}
        aria-expanded={open}
        aria-label="Interaction settings"
      >
        {open ? <X size={17} /> : <Settings2 size={17} />}
        <span>Experience</span>
      </button>

      {open && (
        <div className="experience-popover" role="dialog" aria-label="Interaction settings">
          <div className="experience-popover-heading">
            <div>
              <p className="eyebrow">INTERACTION</p>
              <strong>Feel, don’t distract.</strong>
            </div>
            <Accessibility size={18} />
          </div>

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
