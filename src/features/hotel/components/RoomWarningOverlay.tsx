import React from "react";
import { Html } from "@react-three/drei";
import { useSimulationStore, SimulationNode } from "../../../shared/utils/store";
import { AlertTriangle } from "lucide-react";

export const RoomWarningOverlay: React.FC<{ shape: SimulationNode }> = ({ shape }) => {
  const status = useSimulationStore((state) => state.hotelRoomServiceStatus[shape.id]);
  
  if (status !== "NO_RECEPTION") return null;

  return (
    <Html
      center
      distanceFactor={40}
      position={[0, 0, 0.5]}
      className="pointer-events-auto select-none"
    >
      <div 
        className="flex items-center gap-2 bg-amber-400/90 backdrop-blur-md text-amber-950 px-3 py-1.5 rounded-full shadow-lg border border-amber-500/50 cursor-help"
        title="No Reception Desk coverage or Desk at capacity. Add another Reception Desk."
      >
        <AlertTriangle size={14} />
        <span className="text-[10px] font-bold uppercase tracking-wider">No Reception</span>
      </div>
    </Html>
  );
};
