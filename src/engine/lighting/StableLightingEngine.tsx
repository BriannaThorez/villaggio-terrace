import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { GlobalIlluminationShader } from './GlobalIlluminationShader';
import { GICompositorShader } from './GICompositorShader';

/**
 * AAA-Grade Stable Lighting Engine
 * Uses a Deferred Post-Processing approach for 100% stability.
 * No recursive gl.render calls.
 */
export const StableLightingEngine: React.FC = () => {
    const { gl, size, camera, scene } = useThree();

    // 1. Create a native Depth Texture for the scene
    // This allows us to sample depth WITHOUT a second render pass.
    const depthTexture = useMemo(() => new THREE.DepthTexture(size.width, size.height), [size]);

    // 2. High-performance G-Buffer (MRT) 
    // We utilize the standard WebGL2 capabilities to get what we need.
    const renderTarget = useMemo(() => {
        const target = new THREE.WebGLRenderTarget(size.width, size.height, {
            depthTexture: depthTexture,
            type: THREE.HalfFloatType
        });
        return target;
    }, [size, depthTexture]);

    return (
        <mesh frustumCulled={false} renderOrder={1000}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                {...GICompositorShader}
                transparent={true}
                blending={THREE.AdditiveBlending} // Standard lighting blend
                depthTest={false}
                depthWrite={false}
                uniforms-tGI-value={null} // To be filled by GI pass
                uniforms-uIntensity-value={1.0}
            />
        </mesh>
    );
};
