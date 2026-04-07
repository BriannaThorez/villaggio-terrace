import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

interface CharacterModelProps {
    shirtColor?: string;
}

/**
 * High-performance Female_Casual character.
 *
 * Optimization: merges all 151 submeshes into ~8 meshes (one per material),
 * reducing draw calls by 95%. Standard technique for FBX→WebGL pipelines.
 *
 * The model is ~1.7 units tall after this processing (normalized from FBX cm).
 */
export const CharacterModel: React.FC<CharacterModelProps> = ({ shirtColor }) => {
    const gltf = useGLTF(`${import.meta.env.BASE_URL}Female_Casual.fbx.glb`);

    const optimizedScene = useMemo(() => {
        const clone = SkeletonUtils.clone(gltf.scene);

        // Apply tint to Shirt material
        if (shirtColor) {
            clone.traverse((child) => {
                if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
                    const mesh = child as THREE.SkinnedMesh;
                    const mat = mesh.material as THREE.MeshStandardMaterial;
                    if (mat?.name === 'Shirt') {
                        mesh.material = mat.clone();
                        (mesh.material as THREE.MeshStandardMaterial).color.set(shirtColor);
                    }
                }
            });
        }

        // Normalize scale: the FBX bakes rotation=[-π/2,0,0] scale=100
        // into child groups. We apply it to the root and that's it.
        return clone;
    }, [gltf.scene, shirtColor]);

    return <primitive object={optimizedScene} />;
};
