import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { GBufferMaterials } from './GBufferMaterials';

export const GBufferCapture: React.FC<{ children: (props: { gBuffer: THREE.WebGLRenderTarget }) => React.ReactNode }> = ({ children }) => {
    const { gl, size, scene, camera } = useThree();

    // High-precision Multi-Render Target for GI
    const gBuffer = useMemo(() => {
        const target = new THREE.WebGLRenderTarget(
            size.width * gl.getPixelRatio(),
            size.height * gl.getPixelRatio(),
            { count: 3 } // 0: Albedo, 1: Normal, 2: Depth
        );
        return target;
    }, [size, gl]);

    // Use useFrame with priority to render the G-Buffer before the main scene
    useFrame((state) => {
        const { gl, scene, camera } = state;
        const prevTarget = gl.getRenderTarget();
        const prevBackground = scene.background;
        const prevOverride = scene.overrideMaterial;
        const prevAutoClear = gl.autoClear;
        const prevMask = camera.layers.mask;

        // Temporarily disable background and apply override
        gl.autoClear = true; // Clear the G-Buffer targets
        scene.background = null;
        scene.overrideMaterial = GBufferMaterials.Capture;

        // Isolate Simulation Layer
        camera.layers.set(0);

        // Switch to G-Buffer target
        gl.setRenderTarget(gBuffer);

        // Render scene to G-Buffer
        gl.render(scene, camera);

        // Restore
        camera.layers.mask = prevMask;
        scene.overrideMaterial = prevOverride;
        scene.background = prevBackground;
        gl.autoClear = prevAutoClear;
        gl.setRenderTarget(prevTarget);
    }, -1);

    return (
        <>
            <primitive object={gBuffer} attach="gBuffer" />
            {children({ gBuffer })}
        </>
    );
};
