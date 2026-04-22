import * as THREE from "three";
import { getTextureBundle } from "@/src/features/materialsEngine/presets/materials";
import {
    getRoomMaterialsFromMetadata, 
    getLobbyMaterials, 
    getEmptyFloorMaterials,
    getEmptyRoomMaterials,
    getStructuralConcreteMaterials,
    getGlassMaterial,
} from "@/src/engine/MaterialParser";


import { textureLODHandler } from "@/src/features/materialsEngine/TextureLODHandler";
import roomMetadata from "@/src/entities/rooms/roomMetadata.json";
import { useSimulationStore } from "@/src/shared/utils/store";
import { loadingGate } from "./LoadingGate";
import { getAllStructuralTextureNames } from "@/src/entities/rooms/structuralTextures";

let _storedRenderer: THREE.WebGLRenderer | null = null;


// 1.2 — Three-level fallback matching ResidentialRoom.tsx lookup logic exactly.
const resolveTexturesForMetadataId = (metadataId: string): string[] => {
    const rooms = (roomMetadata as any).rooms || [];
    const generic = (roomMetadata as any).residence || {};
    const normalize = (name: string): string => name === "painted_plaster_wall" ? "beige_wall_1" : name;

    const roomEntry = rooms.find((r: any) => r.id === metadataId);
    const roomMeta = roomEntry?.metadata || {};
    const roomClass = roomEntry?.class;
    const classMeta = roomClass
        ? (roomMetadata as any).classLibrary?.[roomClass]?.defaultTextures || {}
        : {};

    return [
        normalize(roomMeta.wallTexture || classMeta.wallTexture || generic.wallTexture || "beige_wall_1"),
        normalize(roomMeta.floorTexture || classMeta.floorTexture || generic.floorTexture || "wood_floor_1"),
        normalize(roomMeta.ceilingTexture || classMeta.ceilingTexture || generic.ceilingTexture || "beige_wall_1"),
    ];
};

export const preloadAllAssets = async (renderer: THREE.WebGLRenderer) => {
    _storedRenderer = renderer;
    console.log("🚀 [Program-Initialization Prewarmer]: Starting architectural asset warming sequence...");
    
    // Dynamic Texture Extraction & Shader Deduplication
    const textureSet = new Set<string>();
    const visualSignatureSet = new Set<string>();
    const rooms = (roomMetadata as any).rooms || [];
    const generic = (roomMetadata as any).residence || {};

    const normalize = (name: string): string => 
        name === "painted_plaster_wall" ? "beige_wall_1" : name;

    // --- PHASE 1.1: Hardcoded room textures — read from structural-texture-sources.json (SOT) ---
    // getAllStructuralTextureNames() derives the list directly from the JSON file so that
    // editing that file propagates here automatically — zero string drift possible.
    const hardcodedTextures = getAllStructuralTextureNames();
    hardcodedTextures.forEach(n => textureSet.add(n));
    console.debug(`[Program-Initialization Prewarmer] SOT-derived hardcoded textures: [${hardcodedTextures.join(", ")}]`);

    // --- PHASE 1.2 (A): Manifest sweep ---
    rooms.forEach((room: any) => {
        const meta = room.metadata || {};
        const roomClass = room.class;
        const classMeta = roomClass
            ? (roomMetadata as any).classLibrary?.[roomClass]?.defaultTextures || {}
            : {};

        // Aligned with ResidentialRoom.tsx three-level fallback
        const wall = normalize(meta.wallTexture || classMeta.wallTexture || generic.wallTexture || "beige_wall_1");
        const floor = normalize(meta.floorTexture || classMeta.floorTexture || generic.floorTexture || "wood_floor_1");
        const ceiling = normalize(meta.ceilingTexture || classMeta.ceilingTexture || generic.ceilingTexture || "beige_wall_1");

        textureSet.add(wall);
        textureSet.add(floor);
        textureSet.add(ceiling);

        const signature = `${wall}|${floor}|${ceiling}`;
        visualSignatureSet.add(signature);
    });

    // --- PHASE 1.2 (B): Simulation state sweep (save-state warmup) ---
    // If a saved tower is loaded, these rooms aren't in the boot sequence — warm them proactively.
    const placedShapes = useSimulationStore.getState().shapes || [];
    const placedIds = placedShapes
        .map((s: any) => s.metadataId)
        .filter((id: string | undefined): id is string => !!id);
    
    let additionalFromState = 0;
    placedIds.forEach((id: string) => {
        const textures = resolveTexturesForMetadataId(id);
        textures.forEach(t => {
            if (!textureSet.has(t)) {
                textureSet.add(t);
                additionalFromState++;
            }
        });
    });

    if (placedIds.length > 0) {
        console.debug(`[Program-Initialization Prewarmer] Simulation state sweep: Found ${placedIds.length} placed rooms, ${additionalFromState} additional unique textures.`);
    }

    console.debug(`[Program-Initialization Prewarmer] Found ${visualSignatureSet.size} unique manifest signatures across ${rooms.length} rooms. Total unique textures to buffer: ${textureSet.size}.`);

    // --- PHASE 1.3: Deduplication gate — skip textures already in LOD cache ---
    const TEXTURE_KEYS = Array.from(textureSet);
    const keysToFetch = TEXTURE_KEYS.filter(key => {
        if (textureLODHandler.hasCachedBundle(key)) {
            console.debug(`[Program-Initialization Prewarmer] Cache hit (skip fetch): "${key}"`);
            return false;
        }
        return true;
    });
    
    // 1. Warm Texture Cache (System RAM) — only for un-cached textures
    loadingGate.advance('fetching_textures');
    const bundles = await Promise.all(keysToFetch.map(key => getTextureBundle(key)));
    
    // Bridge to runtime LOD cache
    keysToFetch.forEach((key, index) => {
        console.debug(`[Program-Initialization Prewarmer] Injecting warm bundle → ${key}`);
        textureLODHandler.injectBundle(key, bundles[index]);
    });

    // 2. Warm Material Cache & Shader Compilation (GPU)
    // CRITICAL: Build material queue AFTER all bundles are injected into memoryCache.
    // parseRoomMaterial → createRoomSurfaceMaterial → getBundleProgressiveSync must see
    // ALL cache entries populated, or it will return a placeholder and GPU will compile
    // the wrong (placeholder) shader — causing a recompile stall on first placement.
    loadingGate.advance('warming_materials');
    
    let materialQueue: THREE.Material[] = [];
    
    // Compile materials for unique visual signatures from the manifest
    visualSignatureSet.forEach(signature => {
        const [wall, floor, ceiling] = signature.split('|');
        materialQueue.push(...getRoomMaterialsFromMetadata({
            wallTexture: wall,
            floorTexture: floor,
            ceilingTexture: ceiling
        }));
    });

    // Add static architectural foundations — ALL hardcoded room types must be compiled here
    // to prevent first-placement shader stall (GPU must see each unique shader variant).
    {
        const structural = getStructuralConcreteMaterials();
        const emptyRoom = getEmptyRoomMaterials();
        materialQueue.push(
            ...getLobbyMaterials(),
            ...getEmptyFloorMaterials(),
            emptyRoom.frameMaterial,
            emptyRoom.wallMaterial,
            emptyRoom.floorMaterial,
            // Glass singleton: transmission materials need their own GPU render pass compiled separately
            getGlassMaterial(),
            ...Object.values(structural).filter(v => v instanceof THREE.Material) as THREE.Material[]
        );
    }


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
    console.log(`✅ [Program-Initialization Prewarmer]: Pre-caching complete. ${TEXTURE_KEYS.length} textures in System RAM. ${materialQueue.length} shader variants compiled to GPU.`);
};

/**
 * Triggers a fresh background pre-warm of all architectural assets.
 * Usually called after a quality shift to ensure new resolution tiers are 
 * cached and GPU-warmed before the user interacts with the scene.
 */
export const triggerQualityShiftPrewarm = async () => {
    if (!_storedRenderer) {
        console.warn("[AssetPreloader] Cannot trigger quality shift pre-warm: Renderer not yet registered.");
        return;
    }
    console.log("🔄 [AssetPreloader] Quality shift detected. Initiating background pre-warm...");
    await preloadAllAssets(_storedRenderer);
};
