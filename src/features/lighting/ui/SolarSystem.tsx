import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useSimulationStore } from '../../../shared/utils/store';

export const SolarSystem: React.FC = () => {
    const time = useSimulationStore((state) => state.sunTime);
    const baseIntensity = useSimulationStore((state) => state.sunIntensity);
    const showWeather = useSimulationStore((state) => state.showWeather);

    // 24-Hour Solar Orbit (360 Degree Logic)
    const sunPosition = useMemo(() => {
        const angle = (time - 0.5) * Math.PI * 2; // Full PI * 2 cycle
        const distance = 800;
        return new THREE.Vector3(
            Math.sin(angle) * distance,
            Math.cos(angle) * distance, // Noon (0.5) -> Top (1.0), Midnight (0/1) -> Bottom (-1.0)
            150
        );
    }, [time]);

    // Solar Elevation Intensity Modulation
    const sunElevation = (time - 0.5) * Math.PI * 2;
    const dayFactor = Math.max(0, Math.cos(sunElevation)); 
    const effectiveIntensity = baseIntensity * Math.pow(dayFactor, 0.5); // Soft falloff near horizon

    // Weather and Day/Night integration
    const sunIntensity = showWeather ? effectiveIntensity * 0.15 : effectiveIntensity;

    // Dynamic Radiosity Approximation
    const skyColor = showWeather ? "#64748b" : (dayFactor > 0 ? "#b0c4fa" : "#02040a");
    const groundColor = "#40433c";

    // Bounce intensity linked to solar elevation and time of day
    const bounceIntensity = showWeather 
        ? 0.08 
        : dayFactor > 0 
            ? Math.max(0.01, dayFactor * 0.08) 
            : 0.005; // Faint ambient at night

    return (
        <group>
            <hemisphereLight
                args={[skyColor, groundColor, bounceIntensity]}
            />
            <directionalLight
                position={sunPosition}
                intensity={sunIntensity}
                color={showWeather ? "#a5b4fc" : "#ffe4ce"} // 5000K Sunlight
                castShadow
                shadow-mapSize={[8192, 8192]} // Ultra-high resolution for architectural seams
                shadow-camera-left={-300}
                shadow-camera-right={300}
                shadow-camera-top={300}
                shadow-camera-bottom={-300}
                shadow-camera-far={2500}
                shadow-camera-near={1} // CRITICAL: Was clipping front-faces at 100u. Now captures all architectural depth.
                shadow-bias={-0.0001} // Re-tightened for 1.1u thin-slab precision
                shadow-normalBias={0.002}
                shadow-radius={4}
            />
        </group>
    );
};
