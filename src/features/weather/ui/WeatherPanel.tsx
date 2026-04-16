import React, { useMemo, useRef, useState } from "react";
import { useSimulationStore } from "../../../shared/utils/store";
import { useTimeStore } from "../../time/store/timeStore";
import { CloudRain, Sun, Cloud, X } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";

const normalizeTime = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
};

export const WeatherPanel: React.FC = () => {
  const showWeatherPanel = useSimulationStore(
    (state) => state.showWeatherPanel,
  );
  const setShowWeatherPanel = useSimulationStore(
    (state) => state.setShowWeatherPanel,
  );
  const showWeather = useSimulationStore((state) => state.showWeather);
  const setShowWeather = useSimulationStore((state) => state.setShowWeather);
  
  const sunTime = useTimeStore((state) => state.sunTime);
  const setSunTime = useTimeStore((state) => state.setSunTime);
  
  const sunIntensity = useTimeStore((state) => state.sunIntensity);
  const setSunIntensity = useTimeStore((state) => state.setSunIntensity);
  
  const uiPositions = useSimulationStore((state) => state.uiPositions);
  const setUIPosition = useSimulationStore((state) => state.setUIPosition);

  const pos = uiPositions["weather-panel"] || { x: 20, y: 150 };
  const dialRef = useRef<HTMLDivElement | null>(null);
  const [isDialDragging, setIsDialDragging] = useState(false);
  const dragControls = useDragControls();

  const solarTimeDegrees = useMemo(
    () => (normalizeTime(sunTime) - 0.5) * 360,
    [sunTime],
  );
  const solarTimeLabel = useMemo(() => {
    const hours = Math.round(normalizeTime(sunTime) * 24) % 24;
    return `${String(hours).padStart(2, "0")}:00`;
  }, [sunTime]);

  const updateSunTimeFromPointer = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = clientX - cx;
    const dy = clientY - cy;
    const angle = Math.atan2(dy, dx);
    
    // Normalized Time Mapping: Noon (0.5) at Top (-PI/2)
    // angle / 2PI maps [-PI, PI] to [-0.5, 0.5]
    // Adding 0.75 offsets it so -0.25 (Top) becomes 0.5
    const normalizedTime = (angle / (Math.PI * 2)) + 0.75;
    setSunTime(normalizeTime(normalizedTime));
  };

  // Global move listener for robust tracking
  React.useEffect(() => {
    if (!isDialDragging) return;

    // Industry leading UX: Lock cursor to grabbing state globally during dial manipulation
    const originalCursor = document.body.style.cursor;
    document.body.style.cursor = "grabbing";

    const handleGlobalMove = (e: PointerEvent) => {
      updateSunTimeFromPointer(e.clientX, e.clientY);
    };

    const handleGlobalUp = () => {
      setIsDialDragging(false);
    };

    window.addEventListener("pointermove", handleGlobalMove);
    window.addEventListener("pointerup", handleGlobalUp);
    return () => {
      window.removeEventListener("pointermove", handleGlobalMove);
      window.removeEventListener("pointerup", handleGlobalUp);
      document.body.style.cursor = originalCursor;
    };
  }, [isDialDragging]);

  const handlePointerDown = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDialDragging(true);
    updateSunTimeFromPointer(event.clientX, event.clientY);
  };

  const handleDragEnd = (_: any, info: { offset: { x: number; y: number } }) => {
    setUIPosition("weather-panel", {
      x: pos.x + info.offset.x,
      y: pos.y + info.offset.y,
    });
  };

  return (
    <AnimatePresence>
      {showWeatherPanel && (
        <motion.div
          drag
          dragListener={false}
          dragControls={dragControls}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          dragConstraints={{
            left: 0,
            right: window.innerWidth - 260,
            top: 0,
            bottom: window.innerHeight - 300,
          }}
          initial={{ opacity: 0, scale: 0.9, x: pos.x, y: pos.y }}
          animate={{ opacity: 1, scale: 1, x: pos.x, y: pos.y }}
          exit={{ opacity: 0, scale: 0.9 }}
          onPointerDown={(e) => {
            // Only start panel drag if we are NOT hitting the interactive solar dial handle
            if (!(e.target as HTMLElement).closest(".solar-dial-handle")) {
              dragControls.start(e);
            }
          }}
          className="fixed top-0 left-0 z-[100] w-64 bg-background/90 backdrop-blur-2xl border border-text/10 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] pointer-events-auto p-4 flex flex-col gap-5 select-none touch-none"
        >
          <div className="flex items-center justify-between border-b border-text/5 pb-3">
            <div className="flex items-center gap-2">
              <Cloud className="text-primary" size={18} />
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text/80">
                Atmosphere
              </h3>
            </div>
            <button
              onClick={() => setShowWeatherPanel(false)}
              className="p-1 hover:bg-text/5 rounded-lg transition-colors text-text/40 hover:text-text pointer-events-auto"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-text/90 uppercase tracking-wider">
                  Precipitation
                </span>
                <span className="text-[9px] text-text/40">
                  Rain & Storm mist
                </span>
              </div>
              <button
                onClick={() => setShowWeather(!showWeather)}
                className={`relative w-10 h-5 rounded-full transition-all duration-500 ${showWeather ? "bg-primary shadow-[0_0_15px_rgba(34,211,238,0.4)]" : "bg-text/10"}`}
              >
                <motion.div
                  animate={{ x: showWeather ? 20 : 2 }}
                  className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-lg flex items-center justify-center"
                >
                  {showWeather && (
                    <CloudRain size={8} className="text-primary" />
                  )}
                </motion.div>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-[10px] font-bold text-text/90 uppercase tracking-wider">
                <span>Solar Time</span>
                <span className="font-mono text-primary">{solarTimeLabel}</span>
              </div>
              <div className="flex items-center justify-center py-2">
                <div 
                  className="relative w-40 h-40 rounded-full border border-text/5 bg-gradient-to-b from-text/[0.02] to-transparent shadow-inner flex items-center justify-center p-2"
                >
                  {/* Dial Perimeter & Ticks */}
                  <div className="absolute inset-0 rounded-full border border-text/10" />
                  {[...Array(24)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-0.5 h-1.5 bg-text/20"
                      style={{
                        transform: `rotate(${i * 15}deg) translateY(-18px)`,
                        transformOrigin: "center 20px",
                        top: "50%",
                        left: "50%",
                        marginTop: "-20px",
                      }}
                    />
                  ))}

                  {/* The Dial Face (Non-interactive visual only, clicks here drag the panel) */}
                  <div 
                    ref={dialRef}
                    className="relative w-32 h-32 rounded-full bg-background/40 backdrop-blur-md border border-text/10 flex items-center justify-center pointer-events-none"
                  >
                     {/* Progress Arc */}
                     <svg className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] -rotate-90">
                      <circle
                        cx="68"
                        cy="68"
                        r="66"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-primary/20"
                      />
                      <circle
                        cx="68"
                        cy="68"
                        r="66"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={414.69}
                        strokeDashoffset={414.69 * (1 - sunTime)}
                        strokeLinecap="round"
                        className="text-primary transition-all duration-300"
                      />
                    </svg>

                    {/* Central Readout */}
                    <div className="flex flex-col items-center gap-0">
                      <Sun className={`w-5 h-5 transition-colors ${sunTime > 0.25 && sunTime < 0.75 ? 'text-primary' : 'text-text/20'}`} />
                      <div className="text-primary text-xl font-mono font-black tracking-tight">
                        {solarTimeLabel}
                      </div>
                    </div>

                    {/* INTERACTIVE DRAGGABLE ANCHOR (The Handle) */}
                    <motion.div
                      className="absolute w-10 h-10 -m-5 flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto solar-dial-handle"
                      onPointerDown={handlePointerDown}
                      animate={{
                        rotate: solarTimeDegrees,
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      style={{
                        transformOrigin: "50% 50%",
                        top: "50%",
                        left: "50%",
                        y: -64 
                      }}
                    >
                      <div className="w-6 h-6 rounded-full bg-background border-2 border-primary shadow-[0_0_15px_rgba(34,211,238,0.5)] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-[10px] font-bold text-text/90 uppercase tracking-wider">
                <span>Lux Calibration</span>
                <span className="font-mono text-primary">
                  {sunIntensity.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.1"
                value={sunIntensity}
                onChange={(e) => setSunIntensity(parseFloat(e.target.value))}
                className="w-full h-1 bg-text/10 rounded-full appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
          <div className="mt-2 text-[8px] font-mono text-text/30 uppercase tracking-widest text-center">
            Integrated Atmospheric Simulation
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
