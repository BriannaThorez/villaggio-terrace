import React from "react";
import { useFrame } from "@react-three/fiber";
import { useTimeStore } from "../store/timeStore";

/**
 * TimeEngine Component
 * 
 * An invisible bridge component that lives inside the R3F Canvas.
 * It uses the high-frequency R3F frame loop to advance the simulation time state.
 */
export const TimeEngine: React.FC = () => {
  const advanceTime = useTimeStore((state) => state.advanceTime);

  useFrame((_, delta) => {
    // Math Proof: 
    // 1 real second = 10 minutes in-game
    // 144 real seconds = 24 hours in-game (1.0 sunTime)
    // advanceTime expects delta in seconds.
    advanceTime(delta);
  });

  return null;
};
