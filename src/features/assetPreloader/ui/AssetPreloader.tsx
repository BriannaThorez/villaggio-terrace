import React, { useEffect, useState, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { preloadAllAssets } from "../api/preload";
import { loadingGate } from "../api/LoadingGate";

/**
 * PREMIUM ASSET PRELOADER UI
 * 
 * Provides visual feedback during the critical asset warming phase.
 * Uses a RAFLoop LERP to ensure progress feels smooth and premium.
 */
export const AssetPreloader: React.FC = () => {
    const { gl } = useThree();
    const [isLoaded, setIsLoaded] = useState(false);
    const [smoothProgress, setSmoothProgress] = useState(0);
    const targetProgress = useRef(0);

    const [statusLabel, setStatusLabel] = useState("Initializing Architectural Assets");

    useEffect(() => {
        let isCancelled = false;
        let rafId: number;

        // Map loading phases to truthful progress percentages and labels
        const phaseMap: Record<string, { p: number, l: string }> = {
            fetching_textures: { p: 15, l: "Loading High-Res Textures" },
            warming_materials: { p: 45, l: "Warming Physical Materials" },
            compiling_shaders: { p: 85, l: "Compiling GPU Shaders" },
            ready: { p: 100, l: "Engine Ready" }
        };

        const unsubscribe = loadingGate.subscribe((phase) => {
            if (isCancelled) return;
            const config = phaseMap[phase];
            if (config) {
                targetProgress.current = config.p;
                setStatusLabel(config.l);
                if (phase === 'ready') {
                    setTimeout(() => setIsLoaded(true), 1200); // Slightly more breath for the finish
                }
            }
        });

        // RAFLoop LERP: Glides smoothly toward the target percentage
        const updateProgress = () => {
            if (isCancelled) return;
            
            setSmoothProgress(prev => {
                const diff = targetProgress.current - prev;
                // Premium lerp: move by 8% of the distance each frame
                const next = prev + diff * 0.08;
                
                // Snap to target if very close
                if (Math.abs(diff) < 0.1) return targetProgress.current;
                return next;
            });

            rafId = requestAnimationFrame(updateProgress);
        };

        rafId = requestAnimationFrame(updateProgress);

        const runPreload = async () => {
            try {
                await preloadAllAssets(gl);
            } catch (err) {
                console.error("Asset Preloading Failed:", err);
            }
        };

        runPreload();
        
        return () => { 
            isCancelled = true;
            unsubscribe();
            cancelAnimationFrame(rafId);
        };
    }, [gl]);

    if (isLoaded) return null;

    return (
        <Html fullscreen style={{ pointerEvents: "none" }}>
            <div style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                backgroundColor: "rgba(10, 10, 12, 0.98)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "#ffffff",
                backdropFilter: "blur(40px)",
                transition: "opacity 1s ease-in-out"
            }}>
                <div style={{
                    fontSize: "0.8rem",
                    letterSpacing: "0.4em",
                    textTransform: "uppercase",
                    marginBottom: "2.5rem",
                    opacity: 0.6,
                    fontWeight: 300
                }}>
                    {statusLabel}
                </div>

                <div style={{
                    width: "400px",
                    height: "1px",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    position: "relative",
                    overflow: "hidden"
                }}>
                    <div style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        height: "100%",
                        width: `${smoothProgress}%`,
                        backgroundColor: "#ffffff",
                        boxShadow: "0 0 30px rgba(255, 255, 255, 0.6)",
                    }} />
                </div>

                <div style={{
                    marginTop: "2rem",
                    fontSize: "0.6rem",
                    letterSpacing: "0.2em",
                    opacity: 0.3,
                    fontFamily: "monospace"
                }}>
                    {Math.round(smoothProgress)}% COMPLETE
                </div>
            </div>
        </Html>
    );
};
