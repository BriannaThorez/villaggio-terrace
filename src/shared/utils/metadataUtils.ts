import * as HugeIcons from "hugeicons-react";
import roomMetadata from "../../entities/rooms/roomMetadata.json";

export interface TraitDefinition {
    label: string;
    icon?: string;
}

export const getTraitDefinition = (key: string): TraitDefinition => {
    // Check utilities first
    const utilityDef = (roomMetadata as any).traitDefinitions?.utilities?.[key];
    if (utilityDef) return utilityDef;

    // Fallback to humanizing the key
    return {
        label: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    };
};

export const getIconComponent = (iconName?: string) => {
    if (!iconName) return null;
    return (HugeIcons as any)[iconName];
};

export const resolveTraitsByCategory = (metadata: any) => {
    if (!metadata) return { preferences: [], utilities: [], services: [] };

    const schema = (roomMetadata as any).masterTraitSchema;
    const traits = metadata;

    const result: {
        preferences: { key: string; value: any; label: string }[];
        utilities: { key: string; value: any; label: string; icon?: string }[];
        services: { key: string; value: any; label: string }[];
    } = {
        preferences: [],
        utilities: [],
        services: []
    };

    // Resolve Preferences
    schema.preferences.forEach((key: string) => {
        if (traits.preferences && traits.preferences[key] !== undefined) {
            result.preferences.push({
                key,
                value: traits.preferences[key],
                label: getTraitDefinition(key).label
            });
        }
    });

    // Resolve Utilities
    schema.utilities.forEach((key: string) => {
        if (traits.utilities && traits.utilities[key] !== undefined) {
            const def = getTraitDefinition(key);
            result.utilities.push({
                key,
                value: traits.utilities[key],
                label: def.label,
                icon: def.icon
            });
        }
    });

    // Resolve Services (Flat across subtypes for the variant)
    const allServiceKeys = [
        ...schema.services.Apartment,
        ...schema.services.Office
    ];

    allServiceKeys.forEach((key: string) => {
        if (traits.services && traits.services[key] !== undefined) {
            result.services.push({
                key,
                value: traits.services[key],
                label: getTraitDefinition(key).label
            });
        }
    });

    // Resolve Provided Services (Directly from the module)
    if (traits.services_provided && Array.isArray(traits.services_provided)) {
        traits.services_provided.forEach((key: string) => {
            const def = getTraitDefinition(key);
            // Avoid duplicates if already resolved via trait map
            if (!result.services.some(s => s.key === key)) {
                result.services.push({
                    key,
                    value: 'provided',
                    label: def.label
                });
            }
        });
    }

    return result;
};
