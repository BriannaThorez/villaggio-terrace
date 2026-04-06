import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const RAIN_COUNT = 1400;
const RAIN_AREA = 1200;
const RAIN_HEIGHT = 420;
const RAIN_FALL_SPEED = 420;
const RAIN_WIND_SPEED = 95;
const RAIN_MIST_COUNT = 180;
const RAIN_MIST_SPEED = 16;
const RAIN_MIST_RADIUS = 22;

export const RainField = ({ isDark }: { isDark: boolean }) => {
    const pointsRef = useRef<THREE.Points>(null);
    const positions = useMemo(() => {
        const array = new Float32Array(RAIN_COUNT * 3);
        for (let i = 0; i < RAIN_COUNT; i += 1) {
            array[i * 3] = (Math.random() - 0.5) * RAIN_AREA;
            array[i * 3 + 1] = (Math.random() - 0.2) * RAIN_HEIGHT;
            array[i * 3 + 2] = (Math.random() - 0.5) * RAIN_AREA;
        }
        return array;
    }, []);

    const offsets = useMemo(
        () => Array.from({ length: RAIN_COUNT }, () => Math.random() * RAIN_HEIGHT),
        [],
    );

    useFrame((state, delta) => {
        const points = pointsRef.current;
        if (!points) return;

        const positionsAttr = points.geometry.getAttribute("position");
        const array = positionsAttr.array as Float32Array;
        const cam = state.camera.position;

        for (let i = 0; i < RAIN_COUNT; i += 1) {
            const base = i * 3;
            let y = array[base + 1] - RAIN_FALL_SPEED * delta;
            if (y < -40) {
                y = RAIN_HEIGHT + Math.random() * 100;
                array[base] = cam.x + (Math.random() - 0.5) * RAIN_AREA;
                array[base + 2] = cam.z + (Math.random() - 0.5) * RAIN_AREA;
            }

            array[base + 1] = y;
            array[base] +=
                (Math.sin(offsets[i] + state.clock.elapsedTime * 0.6) *
                    RAIN_WIND_SPEED *
                    delta) /
                60;
            array[base + 2] +=
                (Math.cos(offsets[i] + state.clock.elapsedTime * 0.45) *
                    RAIN_WIND_SPEED *
                    delta) /
                120;
        }

        positionsAttr.needsUpdate = true;
    });

    return (
        <points ref={pointsRef} position={[0, 0, 0]}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <pointsMaterial
                color={isDark ? "#cfe8ff" : "#e8f2ff"}
                size={1.4}
                sizeAttenuation
                transparent
                opacity={0.38}
                depthWrite={false}
            />
        </points>
    );
};

export const RainMist = ({ isDark }: { isDark: boolean }) => {
    const pointsRef = useRef<THREE.Points>(null);

    const positions = useMemo(() => {
        const array = new Float32Array(RAIN_MIST_COUNT * 3);
        for (let i = 0; i < RAIN_MIST_COUNT; i += 1) {
            array[i * 3] = (Math.random() - 0.5) * 900;
            array[i * 3 + 1] = Math.random() * 140;
            array[i * 3 + 2] = (Math.random() - 0.5) * 900;
        }
        return array;
    }, []);

    const seeds = useMemo(
        () =>
            Array.from(
                { length: RAIN_MIST_COUNT },
                () => Math.random() * Math.PI * 2,
            ),
        [],
    );

    useFrame((state, delta) => {
        const points = pointsRef.current;
        if (!points) return;

        const attr = points.geometry.getAttribute("position");
        const array = attr.array as Float32Array;
        const t = state.clock.elapsedTime;

        for (let i = 0; i < RAIN_MIST_COUNT; i += 1) {
            const base = i * 3;
            const s = seeds[i];
            array[base + 1] =
                26 + Math.sin(t * 0.4 + s) * 7 + Math.cos(t * 0.2 + s) * 3;
            array[base] += Math.sin(t * 0.08 + s) * RAIN_MIST_SPEED * delta;
            array[base + 2] += Math.cos(t * 0.06 + s) * RAIN_MIST_SPEED * delta;
        }

        attr.needsUpdate = true;
    });

    return (
        <points ref={pointsRef} position={[0, 0, 0]}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <pointsMaterial
                color={isDark ? "#dfeeff" : "#f4fbff"}
                size={RAIN_MIST_RADIUS}
                sizeAttenuation
                transparent
                opacity={0.03}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};
