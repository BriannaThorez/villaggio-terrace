import * as THREE from "three";
import { getTextureBundle } from "@/src/features/materialsEngine/presets/materials";
import { 
    getResidentialMaterials, 
    getLobbyMaterials, 
    getEmptyFloorMaterials, 
    getStructuralConcreteMaterials 
} from "@/src/engine/MaterialParser";

/**
 * ASSET_PRELOADER ARCHITECTURE:
 * 
 * To eliminate placement lag, we must:
 * 1. Pre-buffer 4K texture assets into System RAM.
 * 2. Pre-upload texture buffers to GPU VRAM.
 * 3. Pre-compile patched Triplanar Shaders for every variant.
 */

const TEXTURE_KEYS = [
    "wood_floor_1",
    "beige_wall_1",
    "concrete_floor_1",
    "concrete_wall_1",
    "grey_cartago_tiles",
    "rocky_terrain_2"
];

export const preloadAllAssets = async (renderer: THREE.WebGLRenderer) => {
    console.log("🚀 [AssetPreloader]: Starting architectural asset warming sequence...");
    
    // 1. Warm Texture Cache (System RAM)
    const bundles = TEXTURE_KEYS.map(key => getTextureBundle(key));
    
    // 2. Warm Material Cache & Shader Compilation (GPU)
    // We create a dummy scene to force the renderer to compile and upload.
    const materialQueue: THREE.Material[] = [
        ...getResidentialMaterials(),
        ...getLobbyMaterials(),
        ...getEmptyFloorMaterials(),
        ...Object.values(getStructuralConcreteMaterials())
    ];

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
