import React from 'react';
import { usePeopleStore } from '../store/usePeopleStore';
import { SimPerson } from './SimPerson';

/**
 * Orchestrates the rendering of all sims.
 * Subscribes to `simIds` — a stable array that only changes
 * when sims are added or removed (not every frame).
 */
export const SimPeopleManager: React.FC = () => {
    const simIds = usePeopleStore((state) => state.simIds);

    return (
        <group>
            {simIds.map((id) => (
                <SimPerson key={id} id={id} />
            ))}
        </group>
    );
};
