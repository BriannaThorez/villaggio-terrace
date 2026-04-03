import React from "react";
import {
  MouseLeftClick01Icon,
  MouseRightClick01Icon,
  MouseScroll01Icon,
  Delete02Icon,
} from "hugeicons-react";
import { useSimulationStore } from "../shared/utils/store";

const GUI_SPACING_REM = 0.375;
const GUI_HALF_SPACING_REM = GUI_SPACING_REM / 2;

const mouseControls = [
  {
    label: "Pan (Right Click)",
    icon: <MouseRightClick01Icon size={24} strokeWidth={1.2} />,
  },
  {
    label: "Zoom (Scroll Wheel)",
    icon: <MouseScroll01Icon size={24} strokeWidth={1.2} />,
  },
  {
    label: "Orbit (MMB)",
    icon: <MouseLeftClick01Icon size={24} strokeWidth={1.2} />,
  },
];

const keyControls = [
  {
    label: "Pan",
    kbd: (
      <span className="font-mono text-[9px] tracking-[0.3em]">
        W / A / S / D
      </span>
    ),
  },
  {
    label: "Zoom",
    kbd: (
      <span className="font-mono text-[9px] tracking-[0.3em]">
        R / F
      </span>
    ),
  },
  {
    label: "Orbit",
    kbd: (
      <span className="font-mono text-[9px] tracking-[0.3em]">
        Alt + Move
      </span>
    ),
  },
];

export const ControlsHint = () => {
  useSimulationStore((state) => state.activeTool);

  return (
    <div
      className="absolute top-4 right-4 bg-background/90 backdrop-blur-2xl border border-text/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] w-56 pointer-events-none select-none z-50"
      style={{ padding: `${GUI_SPACING_REM}rem` }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_5px_var(--accent)]" />
          <span className="text-[9px] font-mono tracking-[0.2em] text-text font-bold">
            VillaggioTerrace v1.4
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {mouseControls.map((control) => (
            <MouseHint key={control.label} icon={control.icon} label={control.label} />
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[8px] font-mono text-text/30 tracking-widest">
            Hotkeys
          </span>
          <div className="grid grid-cols-1 gap-1">
            {keyControls.map((control) => (
              <KbdHint key={control.label} kbd={control.kbd} label={control.label} />
            ))}
          </div>
        </div>

        <div className="border-t border-text/5 pt-1">
          <span className="text-[7px] font-mono uppercase tracking-tighter text-text/50">
            Alt + drag emulates MMB orbit for any mouse button
          </span>
        </div>
      </div>
    </div>
  );
};

const MouseHint = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) => (
  <div className="flex flex-col items-center gap-1">
    <div className="w-10 h-10 rounded-xl bg-text/5 border border-text/10 flex items-center justify-center text-text/80">
      {icon}
    </div>
    <span className="text-[8px] text-text/60 text-center font-semibold">
      {label}
    </span>
  </div>
);

const KbdHint = ({ kbd, label }: { kbd: React.ReactNode; label: string }) => (
  <div className="flex items-center justify-between" style={{ gap: `${GUI_HALF_SPACING_REM}rem` }}>
    <span className="text-[9px] text-text/40 font-medium">{label}</span>
    <div className="px-1.5 py-0.5 rounded bg-text/10 border border-text/10 text-[8px] font-mono text-text min-w-[24px] flex items-center justify-center">
      {kbd}
    </div>
  </div>
);
