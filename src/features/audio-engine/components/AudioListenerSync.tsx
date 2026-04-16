import { useFrame } from "@react-three/fiber";
import * as Tone from "tone";
import * as THREE from "three";
import { useRef } from "react";

/**
 * AudioListenerSync Component
 * Synchronizes the THREE.js Camera (Listener) position and orientation 
 * with the Web Audio context's Listener for spatialized 3D audio.
 */
export const AudioListenerSync = () => {
    const worldPosition = useRef(new THREE.Vector3());
    const worldQuaternion = useRef(new THREE.Quaternion());
    const worldDirection = useRef(new THREE.Vector3());
    const worldUp = useRef(new THREE.Vector3());

    useFrame(({ camera }) => {
        // We only care about the listener position in 3D space
        camera.getWorldPosition(worldPosition.current);
        camera.getWorldQuaternion(worldQuaternion.current);
        
        // Extract direction and up vectors for orientation
        worldDirection.current.set(0, 0, -1).applyQuaternion(worldQuaternion.current);
        worldUp.current.set(0, 1, 0).applyQuaternion(worldQuaternion.current);

        const listener = Tone.getContext().listener;

        // Sync position
        listener.positionX.value = worldPosition.current.x;
        listener.positionY.value = worldPosition.current.y;
        listener.positionZ.value = worldPosition.current.z;

        // Sync orientation (Forward and Up vectors)
        listener.forwardX.value = worldDirection.current.x;
        listener.forwardY.value = worldDirection.current.y;
        listener.forwardZ.value = worldDirection.current.z;

        listener.upX.value = worldUp.current.x;
        listener.upY.value = worldUp.current.y;
        listener.upZ.value = worldUp.current.z;
    });

    return null; // Invisible synchronization component
};
