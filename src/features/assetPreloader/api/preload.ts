import * as THREE from "three";
import { getTextureBundle } from "@/src/features/materialsEngine/presets/materials";
import {
    getRoomMaterialsFromMetadata, 
    getLobbyMaterials, 
    getStructuralConcreteMaterials 
} from "@/src/engine/MaterialParser";
import { textureLODHandler } from "@/src/features/materialsEngine/TextureLODHandler";
import roomMetadata from "@/src/entities/rooms/roomMetadata.json";

/**
 * ASSET_PRELOADER ARCHITECTURE:
 * 
 * To eliminate placement lag, we must:
 * 1. Pre-buffer 4K texture assets into System RAM.
 * 2. Pre-upload texture buffers to GPU VRAM.
 * 3. Pre-compile patched Triplanar Shaders for every UNIQUE variant.
 */

import { loadingGate } from "./LoadingGate";

export const preloadAllAssets = async (renderer: THREE.WebGLRenderer) => {
    console.log("🚀 [AssetPreloader]: Starting architectural asset warming sequence...");
    
    // Dynamic Texture Extraction & Shader Deduplication
    const textureSet = new Set<string>();
    const visualSignatureSet = new Set<string>();
    const rooms = (roomMetadata as any).rooms || [];

    rooms.forEach((room: any) => {
        const meta = room.metadata || {};
        const wall = meta.wallTexture || "beige_wall_1";
        const floor = meta.floorTexture || "wood_floor_1";
        const ceiling = meta.ceilingTexture || "beige_wall_1";

        // Collect all textures for RAM caching
        textureSet.add(wall);
        textureSet.add(floor);
        textureSet.add(ceiling);

        // Collect unique visual signatures for GPU warming
        // A signature represents a unique set of shaders to compile
        const signature = `${wall}|${floor}|${ceiling}`;
        visualSignatureSet.add(signature);
    });

    console.debug(`[AssetPreloader] Found ${visualSignatureSet.size} unique visual signatures across ${rooms.length} rooms.`);

    const TEXTURE_KEYS = Array.from(textureSet);
    
    // 1. Warm Texture Cache (System RAM)
    loadingGate.advance('fetching_textures');
    const bundles = await Promise.all(TEXTURE_KEYS.map(key => getTextureBundle(key)));
    
    // Bridge to runtime cache (Phase 1.5.5)
    TEXTURE_KEYS.forEach((key, index) => {
        textureLODHandler.injectBundle(key, bundles[index]);
    });

    // 2. Warm Material Cache & Shader Compilation (GPU)
    loadingGate.advance('warming_materials');
    
    let materialQueue: THREE.Material[] = [];
    
    // Compile materials for unique visual signatures only
    visualSignatureSet.forEach(signature => {
        const [wall, floor, ceiling] = signature.split('|');
        materialQueue.push(...getRoomMaterialsFromMetadata({
            wallTexture: wall,
            floorTexture: floor,
            ceilingTexture: ceiling
        }));
    });

    // Add static architectural foundations
    materialQueue.push(
        ...getLobbyMaterials(),
        ...Object.values(getStructuralConcreteMaterials())
    );

    // We create a dummy scene to force the renderer to compile and upload.
    const dummyScene = new THREE.Scene();
    const dummyCamera = new THREE.PerspectiveCamera();
    const dummyGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);

    materialQueue.forEach((mat) => {
        const mesh = new THREE.Mesh(dummyGeo, mat);
        dummyScene.add(mesh);
    });

    // 3. Forced GPU Compilation
    loadingGate.advance('compiling_shaders');
    
    // renderer.compile() forces the GPU to prepare shaders and texture bindings.
    // This phase is the ultimate defense against placement micro-stutter.
    renderer.compile(dummyScene, dummyCamera);
    
    loadingGate.advance('ready');
    console.log("✅ [AssetPreloader]: Pre-caching sequence complete. GPU is warmed.");
};
