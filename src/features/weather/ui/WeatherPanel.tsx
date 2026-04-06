import React from "react";
import { useSimulationStore } from "../../../shared/utils/store";
import { SmartTooltip } from "../../../shared/components/SmartTooltip";
import { CloudRain, Sun, Cloud, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const WeatherPanel: React.FC = () => {
    const showWeatherPanel = useSimulationStore((state) => state.showWeatherPanel);
    const setShowWeatherPanel = useSimulationStore((state) => state.setShowWeatherPanel);

    const showWeather = useSimulationStore((state) => state.showWeather);
    const setShowWeather = useSimulationStore((state) => state.setShowWeather);

    const sunTime = useSimulationStore((state) => state.sunTime);
    const setSunTime = useSimulationStore((state) => state.setSunTime);

    const sunIntensity = useSimulationStore((state) => state.sunIntensity);
    const setSunIntensity = useSimulationStore((state) => state.setSunIntensity);

    const uiPositions = useSimulationStore((state) => state.uiPositions);
    const setUIPosition = useSimulationStore((state) => state.setUIPosition);
    const pos = uiPositions["weather-panel"] || { x: 20, y: 150 };

    const handleDragEnd = (_: any, info: any) => {
        setUIPosition("weather-panel", {
            x: pos.x + info.offset.x,
            y: pos.y + info.offset.y,
        });
    };

    // Shared logic with SolarSystem.tsx for visual parity
    const sunElevation = (sunTime - 0.5) * Math.PI;
    const bounceIntensity = showWeather ? 0.3 : Math.max(0.05, Math.cos(sunElevation) * 0.4);



    return (
        <AnimatePresence>
            {showWeatherPanel && (
                <motion.div
                    drag
                    dragMomentum={false}
                    onDragEnd={handleDragEnd}
                    dragConstraints={{ left: 0, right: window.innerWidth - 260, top: 0, bottom: window.innerHeight - 300 }}
                    initial={{ opacity: 0, scale: 0.9, x: pos.x, y: pos.y }}
                    animate={{ opacity: 1, scale: 1, x: pos.x, y: pos.y }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="fixed top-0 left-0 z-[100] w-64 bg-background/90 backdrop-blur-2xl border border-text/10 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] pointer-events-auto p-4 flex flex-col gap-5 select-none"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-text/5 pb-3">
                        <div className="flex items-center gap-2">
                            <Cloud className="text-primary" size={18} />
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text/80">
                                Atmosphere
                            </h3>
                        </div>
                        <button
                            onClick={() => setShowWeatherPanel(false)}
                            className="p-1 hover:bg-text/5 rounded-lg transition-colors text-text/40 hover:text-text"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col gap-6">
                        {/* Weather Toggle */}
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-text/90 uppercase tracking-wider">Precipitation</span>
                                <span className="text-[9px] text-text/40">Rain & Storm mist</span>
                            </div>
                            <button
                                onClick={() => setShowWeather(!showWeather)}
                                className={`relative w-10 h-5 rounded-full transition-all duration-500 ${showWeather ? "bg-primary shadow-[0_0_15px_rgba(34,211,238,0.4)]" : "bg-text/10"
                                    }`}
                            >
                                <motion.div
                                    animate={{ x: showWeather ? 20 : 2 }}
                                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-lg flex items-center justify-center"
                                >
                                    {showWeather && <CloudRain size={8} className="text-primary" />}
                                </motion.div>
                            </button>
                        </div>

                        {/* Time of Day */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between text-[10px] font-bold text-text/90 uppercase tracking-wider">
                                <span>Solar Time</span>
                                <span className="font-mono text-primary">{Math.round(sunTime * 24)}:00</span>
                            </div>
                            <div className="relative group">
                                <Sun className="absolute left-0 -top-1 text-text/40 group-hover:text-primary transition-colors" size={12} />
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={sunTime}
                                    onChange={(e) => setSunTime(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-text/10 rounded-full appearance-none cursor-pointer accent-primary hover:bg-text/20 transition-all pl-5"
                                />
                            </div>
                        </div>

                        {/* Sun Intensity */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between text-[10px] font-bold text-text/90 uppercase tracking-wider">
                                <span>Lux Calibration</span>
                                <span className="font-mono text-primary">{sunIntensity.toFixed(1)}</span>
                            </div>
                            <div className="relative group">
                                <Sun className="absolute left-0 -top-1 text-text/40 group-hover:text-primary transition-colors" size={12} />
                                <input
                                    type="range"
                                    min="0"
                                    max="25"
                                    step="0.1"
                                    value={sunIntensity}
                                    onChange={(e) => setSunIntensity(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-text/10 rounded-full appearance-none cursor-pointer accent-primary hover:bg-text/20 transition-all pl-5"
                                />
                            </div>
                        </div>
                        {/* Ambient Radiosity Status (Read-only mirror of SolarSystem) */}
                        <div className="flex flex-col gap-1.5 opacity-60">
                            <div className="flex items-center justify-between text-[8px] font-bold text-text/60 uppercase tracking-widest">
                                <span>Global Radiosity</span>
                                <span className="font-mono text-primary">{(bounceIntensity * 100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-0.5 bg-text/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={false}
                                    animate={{ width: `${(bounceIntensity / 0.4) * 100}%` }}
                                    className="h-full bg-primary/40"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer info */}
                    <div className="mt-2 text-[8px] font-mono text-text/30 uppercase tracking-widest text-center">
                        Integrated Atmospheric Simulation
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
