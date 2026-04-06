import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useSimulationStore } from '../../../shared/utils/store';

export const SolarSystem: React.FC = () => {
    const time = useSimulationStore((state) => state.sunTime);
    const baseIntensity = useSimulationStore((state) => state.sunIntensity);
    const showWeather = useSimulationStore((state) => state.showWeather);

    // Dynamic solar arc calculation (for future Day/Night)
    const sunPosition = useMemo(() => {
        const angle = (time - 0.5) * Math.PI; // -PI/2 to PI/2
        const distance = 800; // Optimal for depth precision vs frustum coverage
        return new THREE.Vector3(
            Math.sin(angle) * distance,
            Math.cos(angle) * distance,
            150 // Restored forward-offset for architectural depth (now safe with near-plane fix)
        );
    }, [time]);

    // Weather dimming logic (Integration for real-time mood shifts)
    const sunIntensity = showWeather ? baseIntensity * 0.15 : baseIntensity;

    // Dynamic Radiosity Approximation (Bounced Sunlight)
    const skyColor = showWeather ? "#64748b" : "#b0c4fa"; // Zenith (sky)
    const groundColor = "#40433c"; // Nadir (earthy bounce albedo)

    // Bounce intensity mathematically linked to solar elevation.
    const sunElevation = (time - 0.5) * Math.PI;
    // CRITICAL: Ambient light was previously too high, causing 'light blurring' into shadows.
    const bounceIntensity = showWeather ? 0.08 : Math.max(0.01, Math.cos(sunElevation) * 0.06);

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
