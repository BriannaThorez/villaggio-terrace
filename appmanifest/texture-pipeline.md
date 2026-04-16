//IMPORTANT DO NOT DELETE
assets/textures/<name>/            ← raw PNG files on disk (4K, ~65-86MB each)
       ↓ (Vite import.meta.glob at build time)
materials.ts :: ASSET_REGISTRY     ← AUTO-DISCOVERED map name → paths
       ↓ (called explicitly)
materials.ts :: getTextureBundle() ← loads PNGs via THREE.TextureLoader → TextureBundle
       ↓ (Phase 1.5.5: Injected into cache)
TextureLODHandler :: memoryCache   ← SHARED PERSISTENT RAM CACHE 
       ↓ (called on room placement/spawn)
TextureLODHandler :: getBundleProgressiveSync() ← Pulls from pre-warmed memoryCache (O(1) hit)
       ↓
MaterialParser :: createRoomSurfaceMaterial()  ← builds MeshPhysicalMaterial + Triplanar shader
       ↓ (caches by key)
MaterialParser :: parseRoomMaterial()  ← roomMaterialCache keyed on (albedo|wall|floor|ceil)
       ↓
getRoomMaterialsFromMetadata() ← reads {wall, floor, ceil} from roomMetadata
       ↓
preload.ts (CURRENT) ← iterates unique signatures (O(U) unique shaders)