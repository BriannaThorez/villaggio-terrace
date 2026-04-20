import { useCallback, useRef } from "react";
import roomMetadata from "../../../entities/rooms/roomMetadata.json";
import { textureLODHandler } from "../../materialsEngine/TextureLODHandler";

/**
 * useHoverPreloader
 * 
 * Provides a `warmForModule` function to be called on pointer enter (hover).
 * Identifies the textures used by the module and initiates a background fetch
 * to the textureLODHandler's persistent cache.
 */
export const useHoverPreloader = () => {
    const lastHoveredId = useRef<string | null>(null);

    const warmForModule = useCallback((moduleId: string) => {
        try {
            // Deduplicate rapid hovers over the same item
            if (moduleId === lastHoveredId.current) return;
            lastHoveredId.current = moduleId;

            // Find matching metadata
            const roomData = (roomMetadata as any).rooms.find((r: any) => r.id === moduleId);
            if (!roomData) return;

            const meta = roomData.metadata || {};
            // Normalize texture names — e.g., 'painted_plaster_wall' has no diff map,
            // it must be redirected to 'beige_wall_1' (matches MaterialParser behavior).
            const normalize = (name: string) => name === "painted_plaster_wall" ? "beige_wall_1" : name;
            const textures = [
                normalize(meta.wallTexture || "beige_wall_1"),
                normalize(meta.floorTexture || "wood_floor_1"),
                normalize(meta.ceilingTexture || "beige_wall_1")
            ];

            // Initiate non-blocking background loads
            // These will land in textureLODHandler.memoryCache
            const textureNames: string[] = [];
            textures.forEach(txName => {
                textureLODHandler.getBundleProgressiveSync(txName);
                textureNames.push(txName);
            });

            console.debug(`[BuildToolbar-Hover Prewarmer] Module: ${moduleId} | Warming textures: [${textureNames.join(", ")}]`);
        } catch (err) {
            // Silently fail - preloading is a non-critical progressive enhancement
            console.warn("[HoverPreloader] Failed to warm module:", moduleId, err);
        }
    }, []);

    return { warmForModule };
};
