import React, { useMemo } from 'react';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';
import { Bloom, Noise, Vignette, N8AO } from '@react-three/postprocessing';
import { useSimulationStore } from '../../shared/utils/store';
import themes from '../../shared/themes/color_palettes.json';
import { SolarSystem } from '../../features/lighting/ui/SolarSystem';
import { RainField, RainMist } from '../../features/weather/ui/WeatherEffects';

export const LegacyLightingSystem = () => {
  const showWeather = useSimulationStore((state) => state.showWeather);
  const themeName = useSimulationStore((state) => state.themeName);
  const currentTheme = useMemo(() => (themes as any)[themeName], [themeName]);
  const isDark = currentTheme?.mode === 'dark';

  return (
    <>
      <color attach="background" args={[isDark ? '#0d1117' : '#cbd5e1']} />
      <fog
        attach="fog"
        args={[
          isDark ? '#0d1117' : '#cbd5e1',
          showWeather ? 100 : 500,
          showWeather ? 1000 : 4000
        ]}
      />

      <SolarSystem />

      <Environment
        preset={isDark ? 'night' : 'city'}
        background={false}
        environmentIntensity={
          showWeather ? 0.45 : isDark ? 0.35 : 0.45
        }
      >
        {isDark && (
          <group>
            <Lightformer
              intensity={3.5}
              rotation={[Math.PI / 2, 0, 0]}
              position={[0, 20, -10]}
              scale={[20, 20, 1]}
              color="#22d3ee"
            />
            <Lightformer
              intensity={1.5}
              rotation={[0, Math.PI / 2, 0]}
              position={[-10, 10, 0]}
              scale={[20, 10, 1]}
              color="#a855f7"
            />
            <Lightformer
              intensity={1.5}
              rotation={[0, -Math.PI / 2, 0]}
              position={[10, 10, 0]}
              scale={[20, 10, 1]}
              color="#3b82f6"
            />
          </group>
        )}
      </Environment>

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.65}
        scale={240}
        blur={2.2}
        far={70}
        resolution={2048}
        color={isDark ? '#0d1a1f' : '#1a242a'}
        frames={1}
      />

      <N8AO
        aoRadius={8}
        intensity={3.0}
        color={isDark ? '#05080a' : '#0d1316'}
        quality="high"
      />

      <Bloom
        mipmapBlur
        luminanceThreshold={2.5}
        luminanceSmoothing={0.5}
        intensity={isDark ? 0.2 : 0.1}
      />

      <Noise opacity={0.002} premultiply />
      <Vignette eskil={false} offset={0.1} darkness={isDark ? 0.78 : 0.22} />

      {showWeather && (
        <>
          <RainField isDark={isDark} />
          <RainMist isDark={isDark} />
        </>
      )}
    </>
  );
};
