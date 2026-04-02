import React from 'react';
import { useFlowchartStore } from '../shared/utils/store';
import { Compass } from 'lucide-react';
import themes from '../shared/themes/color_palettes.json';

export const CameraReadout: React.FC = () => {
  const cameraRotation = useFlowchartStore(state => state.cameraRotation);
  const themeName = useFlowchartStore(state => state.themeName);
  const currentTheme = (themes as any)[themeName];
  
  // Convert radians to degrees
  const azimuthDeg = Math.round(cameraRotation.azimuth * 180 / Math.PI);
  const polarDeg = Math.round(cameraRotation.polar * 180 / Math.PI);
  
  // Adjust polar to be relative to horizon (90 degrees)
  // In OrbitControls, 0 is top, PI/2 is horizon, PI is bottom
  const pitchDeg = Math.round((Math.PI / 2 - cameraRotation.polar) * 180 / Math.PI);

  return (
    <div 
      className="absolute bottom-6 right-6 pointer-events-none flex items-center gap-3 px-4 py-2 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300"
      style={{
        backgroundColor: `${currentTheme.neutral_dark}99`,
        borderColor: `${currentTheme.primary}44`,
        color: currentTheme.neutral_light,
      }}
    >
      <Compass size={16} className="text-accent animate-pulse" />
      <div className="flex flex-col">
        <div className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Camera Orientation</div>
        <div className="flex gap-4 font-mono text-xs">
          <div className="flex gap-1">
            <span className="opacity-40">YAW:</span>
            <span className="text-accent">{azimuthDeg}°</span>
          </div>
          <div className="flex gap-1">
            <span className="opacity-40">PITCH:</span>
            <span className="text-accent">{pitchDeg}°</span>
          </div>
        </div>
      </div>
    </div>
  );
};
