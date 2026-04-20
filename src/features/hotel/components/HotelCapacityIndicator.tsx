import React from "react";
import { Html } from "@react-three/drei";
import { useSimulationStore } from "../../../shared/utils/store";

interface HotelCapacityIndicatorProps {
  deskId: string;
}

/**
 * HotelCapacityIndicator
 * Renders a small floating HUD above hotel reception desks showing current capacity.
 */
export const HotelCapacityIndicator: React.FC<HotelCapacityIndicatorProps> = ({ deskId }) => {
  const remainingCapacity = useSimulationStore((state) => state.hotelReceptionCapacity[deskId] ?? 10);
  const usedCapacity = 10 - remainingCapacity;

  // Premium visual: Color shifts from emerald (empty) to red (full)
  const isFull = remainingCapacity === 0;
  const colorClass = isFull ? "text-red-400 bg-red-400/10 border-red-400/20" : "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";

  return (
    <Html
      center
      distanceFactor={40}
      position={[0, 25, 0]} // Positioned above the 40h desk
      className="pointer-events-none select-none"
    >
      <div className={`flex flex-col items-center gap-1 backdrop-blur-md rounded-lg border px-3 py-1.5 transition-all duration-300 ${colorClass}`}>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-60">Hospitality</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[...Array(10)].map((_, i) => (
              <div 
                key={i} 
                className={`w-1 h-3 rounded-full transition-colors duration-500 ${i < usedCapacity ? 'bg-current' : 'bg-current/10'}`} 
              />
            ))}
          </div>
          <span className="text-xs font-bold leading-none">{usedCapacity}/10</span>
        </div>
      </div>
    </Html>
  );
};
