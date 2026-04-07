import React from "react";
import { useSimulationStore } from "../../../shared/utils/store";
import { Compass } from "lucide-react";
import themes from "../../../shared/themes/color_palettes.json";

export const CameraReadout: React.FC = () => {
  const cameraRotation = useSimulationStore((state) => state.cameraRotation);
  const cameraState = useSimulationStore((state) => state.cameraState);
  const themeName = useSimulationStore((state) => state.themeName);
  const currentTheme = (themes as any)[themeName];

  // Convert radians to degrees
  const azimuthDeg = Math.round((cameraRotation.azimuth * 180) / Math.PI);
  const pitchDeg = Math.round(
    ((Math.PI / 2 - cameraRotation.polar) * 180) / Math.PI,
  );

  const [posX, posY, posZ] = cameraState.position.map((v) => Math.round(v));
  const zoom = cameraState.zoom.toFixed(1);

  return (
    <div
      className="absolute bottom-6 right-6 pointer-events-none flex flex-col gap-2 px-5 py-4 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 min-w-[160px]"
      style={{
        backgroundColor: `${currentTheme.neutral_dark}BB`,
        borderColor: `${currentTheme.primary}44`,
        color: currentTheme.neutral_light,
      }}
    >
      <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.2em] opacity-40 font-black border-b border-white/10 pb-2 mb-1">
        <div className="flex items-center gap-2">
          <Compass size={12} className="text-accent animate-pulse" />
          <span>Telemetry</span>
        </div>
        <span className="text-[8px] px-1.5 py-0.5 bg-accent/20 text-accent rounded-sm">V2.0</span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        <span className="text-[10px] text-white/30 font-bold uppercase">Yaw</span>
        <span className="text-right font-mono text-accent text-xs">{azimuthDeg}°</span>

        <span className="text-[10px] text-white/30 font-bold uppercase">Pitch</span>
        <span className="text-right font-mono text-accent text-xs">{pitchDeg}°</span>

        <div className="col-span-2 border-t border-white/5 my-1"></div>

        <span className="text-[10px] text-white/30 font-bold uppercase">Pos</span>
        <span className="text-right font-mono text-accent text-[10px] tabular-nums">
          {posX}, {posY}, {posZ}
        </span>

        <span className="text-[10px] text-white/30 font-bold uppercase">Zoom</span>
        <span className="text-right font-mono text-accent text-xs">{zoom}x</span>
      </div>
    </div>
  );
};
