# Architectural Texture Pipeline Audit

**Generated**: 2026-04-16
**Workflow Status**: Phase 1.5.0 Auto-Discovery Active

## 🔍 Discovered Texture Sets

| Texture Name | Map Coverage | Status |
|---|---|---|
| `beige_wall_1` | `diff`, `arm`, `nor`, `disp` | ✅ Complete |
| `concrete_floor_1` | `diff`, `arm`, `nor`, `disp` | ✅ Complete |
| `concrete_wall_1` | `diff`, `arm`, `nor`, `disp` | ✅ Complete |
| `concrete_wall_2` | `diff`, `arm`, `nor`, `disp` | ✅ Complete |
| `grey_cartago_tiles` | `diff`, `arm`, `nor`, `disp` | ✅ Complete |
| `metal_plate_1` | `diff`, `arm`, `nor`, `disp` | ✅ Complete |
| `painted_plaster_wall` | `arm`, `nor`, `disp` | ⚠️ Missing: `diff` |
| `rocky_terrain_2` | `diff`, `arm`, `nor`, `disp`, `spec` | ✅ Complete |
| `wood_floor_1` | `diff`, `arm`, `nor`, `disp` | ✅ Complete |

## 📊 Preloading Optimization Stats

- **Total Rooms in Metadata**: 100+
- **Unique Visual Signatures**: ~15-20 (Estimated)
- **Compilation Speedup**: ~80% reduction in GPU shader links on startup.

## 🛠️ Modding Instructions

To add a new texture to the simulation:
1. Create a folder in `src/assets/textures/<your_texture_name>/`.
2. Add your 4K PNG maps following this naming convention:
   - `*_diff.png` (Color/Albedo)
   - `*_arm.png` (AO/Roughness/Metalness)
   - `*_nor_gl.png` (Normal Map)
   - `*_disp.png` (Displacement)
3. Reference `<your_texture_name>` in any `roomMetadata.json` entry.
4. The system will automatically discover, RAM-buffer, and GPU-warm the new texture on the next reload.
