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
  diff: string;
  arm: string;
  nor: string;
  disp: string;
  spec?: string;
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

    if (fileName.includes("_diff")) registry[folderName].diff = url;
    else if (fileName.includes("_arm")) registry[folderName].arm = url;
    else if (fileName.includes("_nor")) registry[folderName].nor = url;
    else if (fileName.includes("_disp")) registry[folderName].disp = url;
    else if (fileName.includes("_spec")) registry[folderName].spec = url;
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

export const getTextureBundle = async (assetName: string): Promise<TextureBundle> => {
    const paths = ASSET_REGISTRY[assetName];
    if (!paths) throw new Error(`Asset ${assetName} not found in registry`);

    const diffuseMapLoad = loadTextureArgs(paths.diff, { name: `${assetName}-diff`, colorSpace: THREE.SRGBColorSpace });
    const armMapLoad = loadTextureArgs(paths.arm, { name: `${assetName}-arm`, colorSpace: THREE.NoColorSpace });
    const normalMapLoad = loadTextureArgs(paths.nor, { name: `${assetName}-normal`, colorSpace: THREE.NoColorSpace, flipY: false });
    const dispMapLoad = loadTextureArgs(paths.disp, { name: `${assetName}-disp`, colorSpace: THREE.NoColorSpace });

    const specMapLoad = paths.spec
      ? loadTextureArgs(paths.spec, {
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
