import { useFrame } from "@react-three/fiber";
import { simPositions } from "../store/simPositions";
import * as THREE from 'three';

/**
 * SimPeople frame-driven behavior loop.
 * 
 * Reads/writes to the mutable simPositions store — never touches
 * Zustand or React state, so zero re-renders per frame.
 */
export const useSimPeopleLoop = () => {
    useFrame((_state, delta) => {
        const allTransforms = simPositions.getAll();

        allTransforms.forEach((transform, id) => {
            if (transform.targetPosition) {
                const currentPos = new THREE.Vector3(...transform.position);
                const targetPos = new THREE.Vector3(...transform.targetPosition);
                const distance = currentPos.distanceTo(targetPos);

                const speed = 10 * delta;

                if (distance < speed) {
                    const nextTargetX = (Math.random() - 0.5) * 100;
                    transform.position = [...transform.targetPosition];
                    transform.targetPosition = [nextTargetX, transform.position[1], transform.position[2]];
                    transform.currentState = 'idle';
                } else {
                    const direction = targetPos.clone().sub(currentPos).normalize();
                    const nextPos = currentPos.clone().add(direction.multiplyScalar(speed));
                    transform.position = [nextPos.x, nextPos.y, nextPos.z];
                    transform.currentState = 'walking';
                }
            }
        });
    });
};
