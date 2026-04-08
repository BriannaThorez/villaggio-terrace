import * as THREE from "three";
import { createTextureCache } from "../api";

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
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 4;
    texture.colorSpace = options.colorSpace;
    if (options.flipY !== undefined) {
        texture.flipY = options.flipY;
    }
    texture.name = options.name;
    return texture;
};

const loadTextureArgs = (url: string, options: TextureOptions): THREE.Texture => {
    const texture = textureLoader.load(
        url,
        () => { texture.needsUpdate = true; },
        undefined,
        (err) => console.warn(`Failed to load texture ${url}`, err)
    );
    return configureTexture(texture, options);
};

export interface TextureBundle {
    albedoMap: THREE.Texture | null;
    aoMap: THREE.Texture;
    roughnessMap: THREE.Texture;
    metalnessMap: THREE.Texture;
    normalMap: THREE.Texture;
    displacementMap: THREE.Texture;
}

// Global cache
const bundleCache = createTextureCache<TextureBundle>();

import woodFloorDiff from "../../../assets/textures/wood_floor_1/wood_floor_diff_4k.png";
import woodFloorArm from "../../../assets/textures/wood_floor_1/wood_floor_arm_4k.png";
import woodFloorNor from "../../../assets/textures/wood_floor_1/wood_floor_nor_gl_4k.png";
import woodFloorDisp from "../../../assets/textures/wood_floor_1/wood_floor_disp_4k.png";

import beigeWallDiff from "../../../assets/textures/beige_wall_1/beige_wall_001_diff_4k.png";
import beigeWallArm from "../../../assets/textures/beige_wall_1/beige_wall_001_arm_4k.png";
import beigeWallNor from "../../../assets/textures/beige_wall_1/beige_wall_001_nor_gl_4k.png";
import beigeWallDisp from "../../../assets/textures/beige_wall_1/beige_wall_001_disp_4k.png";

import paintedConcreteFloorDiff from "../../../assets/textures/concrete_floor_1/concrete_floor_worn_001_diff_4k.png";
import paintedConcreteFloorArm from "../../../assets/textures/concrete_floor_1/concrete_floor_worn_001_arm_4k.png";
import paintedConcreteFloorNor from "../../../assets/textures/concrete_floor_1/concrete_floor_worn_001_nor_gl_4k.png";
import paintedConcreteFloorDisp from "../../../assets/textures/concrete_floor_1/concrete_floor_worn_001_disp_4k.png";

import concreteWallDiff from "../../../assets/textures/concrete_wall_1/concrete_wall_1_diff_4k.png";
import concreteWallArm from "../../../assets/textures/concrete_wall_1/concrete_wall_1_arm_4k.png";
import concreteWallNor from "../../../assets/textures/concrete_wall_1/concrete_wall_1_nor_gl_4k.png";
import concreteWallDisp from "../../../assets/textures/concrete_wall_1/concrete_wall_1_disp_4k.png";

const ASSET_REGISTRY: Record<string, { diff: string, arm: string, nor: string, disp: string }> = {
    "wood_floor_1": { diff: woodFloorDiff, arm: woodFloorArm, nor: woodFloorNor, disp: woodFloorDisp },
    "beige_wall_1": { diff: beigeWallDiff, arm: beigeWallArm, nor: beigeWallNor, disp: beigeWallDisp },
    "painted_concrete_floor": { diff: paintedConcreteFloorDiff, arm: paintedConcreteFloorArm, nor: paintedConcreteFloorNor, disp: paintedConcreteFloorDisp },
    "concrete_wall_1": { diff: concreteWallDiff, arm: concreteWallArm, nor: concreteWallNor, disp: concreteWallDisp },
};

export const getTextureBundle = (assetName: string): TextureBundle => {
    if (bundleCache.get(assetName)) return bundleCache.get(assetName)!;

    const paths = ASSET_REGISTRY[assetName];
    if (!paths) throw new Error(`Asset ${assetName} not found in registry`);

    const diffuseMap = loadTextureArgs(paths.diff, { name: `${assetName}-diff`, colorSpace: THREE.SRGBColorSpace });
    const armMap = loadTextureArgs(paths.arm, { name: `${assetName}-arm`, colorSpace: THREE.NoColorSpace });
    const normalMap = loadTextureArgs(paths.nor, { name: `${assetName}-normal`, colorSpace: THREE.NoColorSpace, flipY: false });
    const dispMap = loadTextureArgs(paths.disp, { name: `${assetName}-disp`, colorSpace: THREE.NoColorSpace });

    const bundle: TextureBundle = {
        albedoMap: diffuseMap,
        aoMap: armMap,
        roughnessMap: armMap,
        metalnessMap: armMap,
        normalMap: normalMap,
        displacementMap: dispMap,
    };

    bundleCache.set(assetName, bundle);
    return bundle;
};
