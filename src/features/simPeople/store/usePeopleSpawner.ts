import { useEffect, useRef } from 'react';
import { usePeopleStore } from './usePeopleStore';
import { simPositions } from './simPositions';

const NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah', 'Ian', 'Julia'];

/**
 * Population spawner. Checks if sims already exist in the store
 * before spawning — resilient to HMR re-runs where refs reset
 * but the store may or may not persist.
 */
export const usePeopleSpawner = () => {
    useEffect(() => {
        const { simIds, addPerson } = usePeopleStore.getState();

        // Already populated — skip (handles HMR where store persists)
        if (simIds.length > 0) {
            console.log('[SimPeople] Population already exists, skipping spawn');
            return;
        }

        console.log('[SimPeople] Spawning 3 sims...');

        for (let i = 0; i < 3; i++) {
            const id = `sim-${i}`;
            const startX = (Math.random() - 0.5) * 80;
            const meta = {
                id,
                name: NAMES[Math.floor(Math.random() * NAMES.length)] + ' ' + (i + 1),
                height: 0.95 + (Math.random() * 0.15),
                tint: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
            };

            addPerson(id, meta);

            simPositions.set(id, {
                position: [startX, 0, 0],
                targetPosition: [(Math.random() - 0.5) * 100, 0, 0],
                currentState: 'idle',
            });
        }

        console.log('[SimPeople] ✅ 3 sims spawned');
    }, []);
};
