import React from 'react';
import { GBufferCapture } from './GBufferCapture';
import { GlobalIlluminationEngine, GlobalIlluminationEngineProps } from './GlobalIlluminationEngine';

export interface LightingPipelineProps {
  /** Children should contain the scene you want to light (geometry, lights, effects). */
  children: React.ReactNode;
  /** Pass-through props that configure the GI compositor. */
  debugMode?: GlobalIlluminationEngineProps['debugMode'];
  intensity?: GlobalIlluminationEngineProps['intensity'];
  emissionMultiplier?: GlobalIlluminationEngineProps['emissionMultiplier'];
  temporalBlend?: GlobalIlluminationEngineProps['temporalBlend'];
}

/**
 * LightingPipeline
 * Wrap your entire scene with this wrapper to ensure the MRT G-Buffer is populated
 * and the GI pass executes transparently. The pipeline renders the scene, captures
 * the required targets, and then composits GI on top of the final output.
 *
 * Example usage:
 * <LightingPipeline>
 *   <SceneContent />
 * </LightingPipeline>
 */
export const LightingPipeline: React.FC<LightingPipelineProps> = ({
  children,
  debugMode,
  intensity,
  emissionMultiplier,
  temporalBlend
}) => {
  const effectiveDebugMode = import.meta.env.DEV ? 3 : (debugMode ?? 0);
  return (
    <GBufferCapture>
      {({ gBuffer, isPrimed }) => (
        <>
          {children}
          <GlobalIlluminationEngine
            gBuffer={gBuffer}
            isPrimed={isPrimed}
            debugMode={effectiveDebugMode}
            intensity={intensity}
            emissionMultiplier={emissionMultiplier}
            temporalBlend={temporalBlend}
          />
        </>
      )}
    </GBufferCapture>
  );
};
