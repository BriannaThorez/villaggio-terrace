import { useEffect } from "react";
import { useSimulationStore } from "@/src/shared/utils/store";
import { audioEngine } from "../AudioEngine";

/**
 * Global Audio Controller Hook.
 * Manages the connection between the Simulation State and the Procedural Audio Engine.
 */
export const useAudioController = () => {
    const zoom = useSimulationStore(state => state.cameraState.zoom);
    
    // 1. Sync Environment Ambience with Camera Zoom
    useEffect(() => {
        audioEngine.updateEnvironment(zoom);
    }, [zoom]);

    // 2. Browser Autoplay Compliance & Tab Focus Resilience
    // Resumes Tone.js context on user interaction OR tab focus events.
    useEffect(() => {
        const handleInteraction = async () => {
            await audioEngine.resume();
            // REMOVED: No longer removing listeners to ensure we can recover 
            // from any future browser-enforced suspensions (persistence).
        };

        const handleFocus = async () => {
            if (document.visibilityState === "visible") {
                await audioEngine.forceResume();
            }
        };

        window.addEventListener("mousedown", handleInteraction);
        window.addEventListener("keydown", handleInteraction);
        window.addEventListener("mouseenter", handleInteraction);
        window.addEventListener("mousemove", handleInteraction);
        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleFocus);

        return () => {
            window.removeEventListener("mousedown", handleInteraction);
            window.removeEventListener("keydown", handleInteraction);
            window.removeEventListener("mouseenter", handleInteraction);
            window.removeEventListener("mousemove", handleInteraction);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleFocus);
        };
    }, []);
};
