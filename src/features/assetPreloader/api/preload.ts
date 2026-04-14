import * as THREE from "three";
import { getTextureBundle } from "@/src/features/materialsEngine/presets/materials";
import {
    getRoomMaterialsFromMetadata, 
    getLobbyMaterials, 
    getStructuralConcreteMaterials 
} from "@/src/engine/MaterialParser";
import roomMetadata from "@/src/entities/rooms/roomMetadata.json";

/**
 * ASSET_PRELOADER ARCHITECTURE:
 * 
 * To eliminate placement lag, we must:
 * 1. Pre-buffer 4K texture assets into System RAM.
 * 2. Pre-upload texture buffers to GPU VRAM.
 * 3. Pre-compile patched Triplanar Shaders for every variant.
 */

export const preloadAllAssets = async (renderer: THREE.WebGLRenderer) => {
    console.log("🚀 [AssetPreloader]: Starting architectural asset warming sequence...");
    
    // Dynamic Texture Extraction from Metadata
    const textureSet = new Set<string>([
        "wood_floor_1",
        "beige_wall_1",
        "concrete_floor_1",
        "concrete_wall_1",
        "grey_cartago_tiles",
        "rocky_terrain_2"
    ]);

    const rooms = roomMetadata.rooms || [];
    const metadataVariants: any[] = [];

    for (const room of rooms) {
        if (room.metadata) {
            if (room.metadata.wallTexture) textureSet.add(room.metadata.wallTexture as string);
            if (room.metadata.floorTexture) textureSet.add(room.metadata.floorTexture as string);
            if (room.metadata.ceilingTexture) textureSet.add(room.metadata.ceilingTexture as string);
            
            metadataVariants.push({
                wallTexture: room.metadata.wallTexture,
                floorTexture: room.metadata.floorTexture,
                ceilingTexture: room.metadata.ceilingTexture
            });
        }
    }

    const TEXTURE_KEYS = Array.from(textureSet);
    
    // 1. Warm Texture Cache (System RAM)
    TEXTURE_KEYS.forEach(key => getTextureBundle(key));
    
    // 2. Warm Material Cache & Shader Compilation (GPU)
    // We create a dummy scene to force the renderer to compile and upload.
    let materialQueue: THREE.Material[] = [];
    
    // Compile permutations of all dynamic room variants
    metadataVariants.forEach(meta => {
        materialQueue.push(...getRoomMaterialsFromMetadata(meta));
    });

    // Add static ones
    materialQueue.push(
        ...getLobbyMaterials(),
        ...Object.values(getStructuralConcreteMaterials())
    );

    const dummyScene = new THREE.Scene();
    const dummyCamera = new THREE.PerspectiveCamera();
    const dummyGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);

    materialQueue.forEach((mat, i) => {
        const mesh = new THREE.Mesh(dummyGeo, mat);
        dummyScene.add(mesh);
    });

    // Industry Leading: renderer.compile() forces the GPU to prepare shaders and textures.
    // This prevents the "judder" when the first real room is placed.
    renderer.compile(dummyScene, dummyCamera);
    
    console.log("✅ [AssetPreloader]: Pre-caching sequence complete. GPU is warmed.");
};
