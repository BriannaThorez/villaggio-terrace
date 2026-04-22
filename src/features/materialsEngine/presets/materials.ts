import * as THREE from "three";

const textureLoader = new THREE.TextureLoader();

interface TextureOptions {
  name: string;
  colorSpace: THREE.ColorSpace;
  flipY?: boolean;
}

const configureTexture = (
  texture: THREE.Texture,
  options: TextureOptions,
): THREE.Texture => {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 4;
  texture.colorSpace = options.colorSpace;
  if (options.flipY !== undefined) {
    texture.flipY = options.flipY;
  }
  texture.name = options.name;
  return texture;
};

const loadTextureArgs = (
  url: string,
  options: TextureOptions,
): Promise<THREE.Texture> => {
  return new Promise((resolve, reject) => {
    const texture = textureLoader.load(
      url,
      (loadedTexture) => {
        loadedTexture.needsUpdate = true;
        resolve(configureTexture(loadedTexture, options));
      },
      undefined,
      (err) => {
        console.warn(`Failed to load texture ${url}`, err);
        reject(err);
      },
    );
  });
};

export interface TextureBundle {
  albedoMap: THREE.Texture | null;
  aoMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  metalnessMap: THREE.Texture;
  normalMap: THREE.Texture;
  displacementMap: THREE.Texture;
  isPlaceholder?: boolean;
}

interface AssetPaths {
  /** Albedo/Diffuse variants */
  diff: string;
  diff_512?: string;
  diff_1k?: string;
  diff_2k?: string;
  /** ARM (AO, Roughness, Metalness) variants */
  arm: string;
  arm_512?: string;
  arm_1k?: string;
  arm_2k?: string;
  /** Normal variants */
  nor: string;
  nor_512?: string;
  nor_1k?: string;
  nor_2k?: string;
  /** Displacement variants */
  disp: string;
  disp_512?: string;
  disp_1k?: string;
  disp_2k?: string;
  /** Specular variants (optional) */
  spec?: string;
  spec_512?: string;
  spec_1k?: string;
  spec_2k?: string;
}

// AUTO-DISCOVERY ENGINE (import.meta.glob)
// Scans assets/textures/**/* at build time. 
// Zero manual entry required for new textures.
const _textureGlob = import.meta.glob(
  "../../../assets/textures/**/*.png",
  { query: "?url", import: "default", eager: true }
) as Record<string, string>;

const buildRegistryFromGlob = (glob: Record<string, string>): Record<string, AssetPaths> => {
  const registry: Record<string, AssetPaths> = {};

  Object.keys(glob).forEach((path) => {
    const url = glob[path];
    // Path looks like: "../../../assets/textures/wood_floor_1/wood_floor_diff_4k.png"
    const parts = path.split("/");
    const texturesIndex = parts.indexOf("textures");
    if (texturesIndex === -1 || texturesIndex + 1 >= parts.length) return;

    const folderName = parts[texturesIndex + 1];
    const fileName = parts[parts.length - 1].toLowerCase();

    if (!registry[folderName]) {
      registry[folderName] = { diff: "", arm: "", nor: "", disp: "" };
    }

    // MAP TYPE & QUALITY PARSING:
    // Pattern: [name]_[type]_[resolution].png or [name]_[type].png
    const match = fileName.match(/_([a-z_]+)_(512|1k|2k|4k)\.png$/);
    if (match) {
      let [, type, res] = match;
      if (type === "nor_gl") type = "nor"; // Normalize gl variant to standard nor key
      
      const key = (res === "4k") ? type : `${type}_${res}`;
      (registry[folderName] as any)[key] = url;
    } else {
      // Fallback for files without resolution suffix (legacy/PBR)
      if (fileName.includes("_diff")) registry[folderName].diff = url;
      else if (fileName.includes("_arm"))  registry[folderName].arm  = url;
      else if (fileName.includes("_nor"))  registry[folderName].nor  = url;
      else if (fileName.includes("_disp")) registry[folderName].disp = url;
      else if (fileName.includes("_spec")) registry[folderName].spec = url;
    }
  });

  return registry;
};

const ASSET_REGISTRY = buildRegistryFromGlob(_textureGlob);

// Pipeline Audit Utility
// Lists discovered textures and warns about missing maps.
export const printTextureRegistryAudit = () => {
  console.group("%c 🎨 [TexturePipeline]: Architectural Registry Audit ", "background: #222; color: #bada55; padding: 4px;");
  
  const entries = Object.entries(ASSET_REGISTRY);
  console.log(`Discovered ${entries.length} texture sets.`);
  
  entries.forEach(([name, paths]) => {
    const missing = [];
    if (!paths.diff) missing.push("diff");
    if (!paths.arm) missing.push("arm");
    if (!paths.nor) missing.push("nor");
    if (!paths.disp) missing.push("disp");

    if (missing.length > 0) {
      console.warn(`[${name}] Missing maps: ${missing.join(", ")}`);
    } else {
      console.log(`%c[${name}] %cComplete`, "font-weight: bold", "color: #4caf50");
    }
  });
  
  console.groupEnd();
};

// Auto-run audit in DEV mode
if (import.meta.env.DEV) {
  printTextureRegistryAudit();
}

import type { TextureQuality } from "../../settings/store/settingsStore";

/**
 * Selects the correct diff path for the requested quality tier.
 * Falls back to the next available tier if the requested one wasn't generated.
 */
/**
 * Selects the correct path for the requested map type and quality tier.
 * Falls back to the next available tier if the requested one wasn't generated.
 */
const selectMapPath = (paths: AssetPaths, type: keyof AssetPaths, quality: TextureQuality): string => {
  const p = paths as any;
  const t = type as string;

  switch (quality) {
    case "low":    return p[`${t}_512`] ?? p[`${t}_1k`]  ?? p[`${t}_2k`] ?? p[t];
    case "medium": return p[`${t}_1k`]  ?? p[`${t}_512`] ?? p[`${t}_2k`] ?? p[t];
    case "high":   return p[`${t}_2k`]  ?? p[`${t}_1k`]  ?? p[t];
    case "ultra":  return p[t];
    default:       return p[t];
  }
};

export const getTextureBundle = async (assetName: string, quality?: TextureQuality): Promise<TextureBundle> => {
    const paths = ASSET_REGISTRY[assetName];
    if (!paths) throw new Error(`Asset ${assetName} not found in registry`);

    // Resolve quality from settingsStore if not explicitly provided
    let resolvedQuality: TextureQuality = quality ?? "ultra";
    if (!quality) {
      try {
        // Dynamic import to avoid circular dependency at module init time
        const { useSettingsStore } = await import("../../settings/store/settingsStore");
        resolvedQuality = useSettingsStore.getState().textureQuality;
      } catch {
        resolvedQuality = "ultra";
      }
    }

    const diffPath = selectMapPath(paths, "diff", resolvedQuality);
    const armPath  = selectMapPath(paths, "arm",  resolvedQuality);
    const norPath  = selectMapPath(paths, "nor",  resolvedQuality);
    const dispPath = selectMapPath(paths, "disp", resolvedQuality);

    const diffuseMapLoad = loadTextureArgs(diffPath, { name: `${assetName}-diff`, colorSpace: THREE.SRGBColorSpace });
    const armMapLoad     = loadTextureArgs(armPath,  { name: `${assetName}-arm`,  colorSpace: THREE.NoColorSpace });
    const normalMapLoad  = loadTextureArgs(norPath,  { name: `${assetName}-normal`, colorSpace: THREE.NoColorSpace, flipY: false });
    const dispMapLoad    = loadTextureArgs(dispPath, { name: `${assetName}-disp`, colorSpace: THREE.NoColorSpace });

    const specPath = paths.spec ? selectMapPath(paths, "spec", resolvedQuality) : null;
    const specMapLoad = specPath
      ? loadTextureArgs(specPath, {
          name: `${assetName}-spec`,
          colorSpace: THREE.NoColorSpace,
        })
      : armMapLoad;

    const [diffuseMap, armMap, normalMap, dispMap, specMap] = await Promise.all([
      diffuseMapLoad, armMapLoad, normalMapLoad, dispMapLoad, specMapLoad
    ]);

    const bundle: TextureBundle = {
      albedoMap: diffuseMap,
      aoMap: armMap,
      roughnessMap: specMap,
      metalnessMap: specMap,
      normalMap: normalMap,
      displacementMap: dispMap,
    };

    return bundle;
};
