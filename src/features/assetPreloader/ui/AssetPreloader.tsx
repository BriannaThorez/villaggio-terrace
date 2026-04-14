import React, { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { preloadAllAssets } from "../api/preload";

/**
 * PREMIUM ASSET PRELOADER UI
 * 
 * Provides visual feedback during the critical asset warming phase.
 * Following Feature Slice Design, this is a self-contained optimization module.
 */
export const AssetPreloader: React.FC = () => {
    const { gl } = useThree();
    const [isLoaded, setIsLoaded] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let isCancelled = false;

        const runPreload = async () => {
            // Simulate progress for UI smoothness while the async loading happens
            const interval = setInterval(() => {
                setProgress(prev => Math.min(prev + Math.random() * 5, 95));
            }, 100);

            try {
                await preloadAllAssets(gl);
                if (!isCancelled) {
                    setProgress(100);
                    setTimeout(() => setIsLoaded(true), 800);
                }
            } catch (err) {
                console.error("Asset Preloading Failed:", err);
            } finally {
                clearInterval(interval);
            }
        };

        runPreload();
        return () => { isCancelled = true; };
    }, [gl]);

    if (isLoaded) return null;

    return (
        <Html fullscreen style={{ pointerEvents: "none" }}>
            <div style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                backgroundColor: "rgba(10, 10, 12, 0.96)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "#ffffff",
                backdropFilter: "blur(20px)",
                transition: "opacity 0.8s ease-in-out"
            }}>
                <div style={{
                    fontSize: "0.8rem",
                    letterSpacing: "0.4em",
                    textTransform: "uppercase",
                    marginBottom: "2rem",
                    opacity: 0.6,
                    fontWeight: 300
                }}>
                    Initializing Architectural Assets
                </div>

                <div style={{
                    width: "300px",
                    height: "2px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    position: "relative",
                    overflow: "hidden"
                }}>
                    <div style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        height: "100%",
                        width: `${progress}%`,
                        backgroundColor: "#ffffff",
                        boxShadow: "0 0 20px rgba(255, 255, 255, 0.5)",
                        transition: "width 0.4s cubic-bezier(0.1, 0.5, 0.1, 1)"
                    }} />
                </div>

                <div style={{
                    marginTop: "1.5rem",
                    fontSize: "0.7rem",
                    opacity: 0.4,
                    fontFamily: "monospace"
                }}>
                    WARMING GPU PIPELINE {Math.round(progress)}%
                </div>
            </div>
        </Html>
    );
};
