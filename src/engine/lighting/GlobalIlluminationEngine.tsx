import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { GlobalIlluminationShader } from './GlobalIlluminationShader';
import { createBlueNoiseTexture } from './BlueNoise';
import { GICompositorShader } from './GICompositorShader';

export interface GlobalIlluminationEngineProps {
  gBuffer: THREE.WebGLRenderTarget;
  isPrimed?: boolean;
  debugMode?: number;
  intensity?: number;
  emissionMultiplier?: number;
  temporalBlend?: number;
}

export const GlobalIlluminationEngine: React.FC<GlobalIlluminationEngineProps> = ({ 
  gBuffer,
  isPrimed = true,
  debugMode = 0,
  intensity = 1.0,
  temporalBlend = 0.95
}) => {
    const { gl, size, camera } = useThree();
    const [frameIndex, setFrameIndex] = useState(0);

    const blueNoiseTexture = useMemo(() => createBlueNoiseTexture(64), []);

    // Ping-Pong Accumulation Buffers for Temporal STR
    const accumTargets = useMemo(() => {
        const targets = [
            new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType }),
            new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType })
        ];
        return targets;
    }, [size]);

    const currentTargetIndex = useRef(0);

    const quadMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            ...GlobalIlluminationShader,
            transparent: true,
            depthWrite: false,
            depthTest: false
        });
    }, []);

    const fullScreenQuad = useMemo(() => {
        const geo = new THREE.PlaneGeometry(2, 2);
        return new THREE.Mesh(geo, quadMaterial);
    }, [quadMaterial]);

    const compositeMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            ...GICompositorShader,
            transparent: true,
            blending: THREE.NormalBlending,
            depthWrite: false,
            depthTest: false
        });
    }, []);

    // Ensure debug mode is 1 for albedo visualization
    compositeMaterial.uniforms.uDebug.value = 1;

    const compositeQuad = useMemo(() => {
        const geo = new THREE.PlaneGeometry(2, 2);
        return new THREE.Mesh(geo, compositeMaterial);
    }, [compositeMaterial]);

    useFrame((state) => {
        const readIndex = currentTargetIndex.current;
        const writeIndex = 1 - readIndex;

        // Update GI Uniforms
        quadMaterial.uniforms.tDiffuse.value = gBuffer.textures[0];
        quadMaterial.uniforms.tNormal.value = gBuffer.textures[1];
        quadMaterial.uniforms.tDepth.value = gBuffer.textures[2];
        quadMaterial.uniforms.tPrevAccum.value = accumTargets[readIndex].texture;
        quadMaterial.uniforms.tBlueNoise.value = blueNoiseTexture;

        quadMaterial.uniforms.projectionMatrix.value.copy(camera.projectionMatrix);
        quadMaterial.uniforms.inverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);
        quadMaterial.uniforms.cameraMatrixWorld.value.copy(camera.matrixWorld);
        quadMaterial.uniforms.uViewMatrix.value.copy(camera.matrixWorldInverse);

        quadMaterial.uniforms.uTime.value = state.clock.elapsedTime;
        quadMaterial.uniforms.uFrameIndex.value = frameIndex;
        quadMaterial.uniforms.uResolution.value.set(size.width, size.height);

        // GI Pass [RE-ENABLED FOR STABLE SINGLE PASS]
        const prevTarget = gl.getRenderTarget();
        gl.setRenderTarget(accumTargets[writeIndex]);

        // Manual clear to ensure no old data interferes
        gl.autoClear = true;
        gl.clear();

        const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        gl.render(fullScreenQuad, quadCamera);

        // Restore target
        gl.setRenderTarget(prevTarget);

        // Update Composite Uniforms
        compositeMaterial.uniforms.tDiffuse.value = gBuffer.textures[0];
        compositeMaterial.uniforms.tNormal.value = gBuffer.textures[1];
        compositeMaterial.uniforms.tDepth.value = gBuffer.textures[2];
        compositeMaterial.uniforms.tGI.value = accumTargets[writeIndex].texture;
        compositeMaterial.uniforms.uIntensity.value = 1.0;

        currentTargetIndex.current = writeIndex;
        setFrameIndex(prev => prev + 1);
    }, 1);

    return (
        <mesh
            renderOrder={999}
            frustumCulled={false}
        >
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                {...GICompositorShader}
                transparent={true}
                blending={THREE.NormalBlending}
                depthWrite={false}
                depthTest={false}
                uniforms-tDiffuse-value={gBuffer.textures[0]}
                uniforms-tNormal-value={gBuffer.textures[1]}
                uniforms-tDepth-value={gBuffer.textures[2]}
                uniforms-tGI-value={accumTargets[currentTargetIndex.current].texture}
                uniforms-uIntensity-value={0.5}
                uniforms-uDebug-value={1} // Keep Albedo debug active
            />
        </mesh>
    );
};
