import { useCallback, useRef } from "react";
import roomMetadata from "../../../entities/rooms/roomMetadata.json";
import { textureLODHandler } from "../../materialsEngine/TextureLODHandler";
import { getTextureBundle } from "../../materialsEngine/presets/materials";

const normalize = (name: string): string =>
    name === "painted_plaster_wall" ? "beige_wall_1" : name;

/**
 * E-HOVER-CATEGORY: Category-Level Warm Preloader
 *
 * Fired when the user CLICKS a build category tab (e.g. "Apartment", "Office").
 * Initiates a background BATCH warm for every room in the category simultaneously.
 * This ensures all textures are ready before the user has time to select and place
 * a specific room, eliminating the first-placement cold-path stall.
 *
 * Strategy:
 * - BATCH (Promise.all): All rooms in the category are warmed in parallel.
 *   This maximizes throughput since the user hasn't declared intent yet.
 * - PRIORITY PROMOTION: When the user selects a specific room (useToolPreloader),
 *   any in-flight batch load for that texture is promoted to foreground priority.
 * - DEDUPLICATION: Only submits fetches for textures not already in memoryCache
 *   (via hasCachedBundle). Repeat category clicks are effectively free.
 */
export const useCategoryPreloader = () => {
    // Track the last warmed category to skip redundant re-triggers
    const lastWarmedCategory = useRef<string | null>(null);

    const warmForCategory = useCallback((categoryId: string, subTypes: Array<{ id: string; metadata?: any }>) => {
        // Skip if we already warmed this category in this session
        if (categoryId === lastWarmedCategory.current) return;
        lastWarmedCategory.current = categoryId;

        const generic = (roomMetadata as any).residence || {};

        // Collect all unique texture names across every room in the category
        const textureSet = new Set<string>();

        subTypes.forEach(sub => {
            const meta = sub.metadata || {};

            // Mirror the three-level fallback from ResidentialRoom.tsx
            const roomEntry = (roomMetadata as any).rooms?.find((r: any) => r.id === sub.id);
            const roomMeta = roomEntry?.metadata || meta;
            const roomClass = roomEntry?.class;
            const classMeta = roomClass
                ? (roomMetadata as any).classLibrary?.[roomClass]?.defaultTextures || {}
                : {};

            const wall = normalize(roomMeta.wallTexture || classMeta.wallTexture || generic.wallTexture || "beige_wall_1");
            const floor = normalize(roomMeta.floorTexture || classMeta.floorTexture || generic.floorTexture || "wood_floor_1");
            const ceiling = normalize(roomMeta.ceilingTexture || classMeta.ceilingTexture || generic.ceilingTexture || "beige_wall_1");

            textureSet.add(wall);
            textureSet.add(floor);
            textureSet.add(ceiling);
        });

        // Filter out textures already in cache — deduplication gate
        const texturesToFetch = Array.from(textureSet).filter(
            name => !textureLODHandler.hasCachedBundle(name)
        );

        if (texturesToFetch.length === 0) {
            console.debug(`[BuildToolbar-Category Prewarmer] "${categoryId}": All ${textureSet.size} textures already cached.`);
            return;
        }

        console.debug(`[BuildToolbar-Category Prewarmer] "${categoryId}": Batch warming ${texturesToFetch.length} textures (${textureSet.size - texturesToFetch.length} already cached): [${texturesToFetch.join(", ")}]`);

        // BATCH: fire all fetches in parallel — no sequential blocking
        texturesToFetch.forEach(name => {
            // getBundleProgressiveSync starts an async load and registers it in activeLoads.
            // textureLODHandler.promoteToForeground() can then fast-track any specific
            // texture from this batch when the user selects a room (useToolPreloader).
            textureLODHandler.getBundleProgressiveSync(name);
        });

        // After fetch completes: inject into memoryCache so the dedup gate catches it
        Promise.all(texturesToFetch.map(name => getTextureBundle(name)))
            .then(bundles => {
                texturesToFetch.forEach((name, i) => {
                    textureLODHandler.injectBundle(name, bundles[i]);
                });
                console.debug(`[BuildToolbar-Category Prewarmer] "${categoryId}": ${texturesToFetch.length} bundles injected into LOD cache.`);
            })
            .catch(err => {
                // Non-critical: log but do not surface to user
                console.warn(`[BuildToolbar-Category Prewarmer] "${categoryId}": Batch warm error:`, err);
            });
    }, []);

    return { warmForCategory };
};
