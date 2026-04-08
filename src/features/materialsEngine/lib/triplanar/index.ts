import * as THREE from "three";

export interface TriplanarOptions {
  scale?: number;
  detailTexture?: THREE.Texture;
  detailScale?: number;
  detailIntensity?: number;
}

const DETAIL_TEXTURE_SIZE = 128;
let cachedDetailTexture: THREE.Texture | null = null;

const createDetailNoiseTexture = (): THREE.Texture => {
  let canvas: HTMLCanvasElement | OffscreenCanvas | undefined;
  if (typeof document !== "undefined") {
    canvas = document.createElement("canvas");
  } else if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(DETAIL_TEXTURE_SIZE, DETAIL_TEXTURE_SIZE);
  }

  if (canvas) {
    canvas.width = DETAIL_TEXTURE_SIZE;
    canvas.height = DETAIL_TEXTURE_SIZE;
    const context = (canvas as HTMLCanvasElement).getContext("2d");
    if (context) {
      const imageData = context.createImageData(DETAIL_TEXTURE_SIZE, DETAIL_TEXTURE_SIZE);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const value = Math.floor(Math.random() * 255);
        imageData.data[i] = value;
        imageData.data[i + 1] = value;
        imageData.data[i + 2] = value;
        imageData.data[i + 3] = 255;
      }
      context.putImageData(imageData, 0, 0);
      const texture = new THREE.CanvasTexture(canvas as HTMLCanvasElement);
      texture.name = "triplanar-detail-noise";
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = 2;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      return texture;
    }
  }

  const fallback = new THREE.DataTexture(
    new Uint8Array([128, 128, 128, 255]),
    1,
    1,
  );
  fallback.name = "triplanar-detail-noise-fallback";
  fallback.needsUpdate = true;
  return fallback;
};

const getDetailNoiseTexture = (): THREE.Texture => {
  if (!cachedDetailTexture) {
    cachedDetailTexture = createDetailNoiseTexture();
  }
  return cachedDetailTexture;
};

const TRIPLANAR_VERTEX_DECLARATIONS = `
varying vec3 vTriplanarWorldPosition;
varying vec3 vTriplanarWorldNormal;
`;

type TriplanarShader = {
  uniforms: Record<string, THREE.IUniform>;
  vertexShader: string;
  fragmentShader: string;
};

const TRIPLANAR_FRAGMENT_HELPERS = `
varying vec3 vTriplanarWorldPosition;
varying vec3 vTriplanarWorldNormal;
uniform float triplanarScale;
uniform sampler2D triplanarDetailTexture;
uniform float triplanarDetailScale;
uniform float triplanarDetailIntensity;

vec3 triplanarBlendWeights(vec3 normal) {
	vec3 blend = abs(normal);
	blend = smoothstep(vec3(0.0), vec3(0.1), blend);
	float total = blend.x + blend.y + blend.z;
	return blend / max(total, 1e-5);
}

vec4 sampleTriplanarTexture(sampler2D textureSampler, vec3 worldPosition, vec3 normal, float scale) {
	vec3 weights = triplanarBlendWeights(normal);
	vec2 yz = worldPosition.yz * scale;
	vec2 zx = worldPosition.zx * scale;
	vec2 xy = worldPosition.xy * scale;
	vec4 xSample = texture2D(textureSampler, yz);
	vec4 ySample = texture2D(textureSampler, zx);
	vec4 zSample = texture2D(textureSampler, xy);
	return xSample * weights.x + ySample * weights.y + zSample * weights.z;
}

float sampleTriplanarGray(sampler2D textureSampler, vec3 worldPosition, vec3 normal, float scale) {
	return sampleTriplanarTexture(textureSampler, worldPosition, normal, scale).r;
}

vec3 applyTriplanarDetail(vec3 color) {
	vec3 detail = sampleTriplanarTexture(
		triplanarDetailTexture,
		vTriplanarWorldPosition,
		normalize(vTriplanarWorldNormal),
		triplanarDetailScale
	).rgb;
	// Industry-leading Overlay blend: preserves luminance while adding textural grit
	return color * (1.0 + (detail - 0.5) * triplanarDetailIntensity);
}
`;

const MAP_FRAGMENT_TRIPLANAR = `
#ifdef USE_MAP
	vec4 sampledDiffuseColor = sampleTriplanarTexture(map, vTriplanarWorldPosition, normalize(vTriplanarWorldNormal), triplanarScale);
	sampledDiffuseColor.rgb = applyTriplanarDetail(sampledDiffuseColor.rgb);
	diffuseColor *= sampledDiffuseColor;
#endif
`;

const ROUGHNESS_FRAGMENT_TRIPLANAR = `
float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 triplanarRoughness = sampleTriplanarTexture(roughnessMap, vTriplanarWorldPosition, normalize(vTriplanarWorldNormal), triplanarScale);
	roughnessFactor *= triplanarRoughness.g;
#endif
`;

const METALNESS_FRAGMENT_TRIPLANAR = `
float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 triplanarMetalness = sampleTriplanarTexture(metalnessMap, vTriplanarWorldPosition, normalize(vTriplanarWorldNormal), triplanarScale);
	metalnessFactor *= triplanarMetalness.b;
#endif
`;

const DETAIL_FRAGMENT_ONLY_TRIPLANAR = `
	diffuseColor.rgb = applyTriplanarDetail(diffuseColor.rgb);
`;

const AOMAP_FRAGMENT_TRIPLANAR = `
#ifdef USE_AOMAP
	float ambientOcclusion = (sampleTriplanarGray(aoMap, vTriplanarWorldPosition, normalize(vTriplanarWorldNormal), triplanarScale) - 1.0) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT )
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN )
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate(dot(geometryNormal, geometryViewDir));
		reflectedLight.indirectSpecular *= computeSpecularOcclusion(dotNV, ambientOcclusion, roughnessFactor);
	#endif
#endif
`;

export const applyTriplanarProjection = (
  material: THREE.MeshPhysicalMaterial,
  options: TriplanarOptions = {},
): THREE.MeshPhysicalMaterial => {
  if (material.userData.__triplanarApplied) {
    return material;
  }

  material.userData.__triplanarApplied = true;

  const scale = options.scale ?? 0.08;
  const detailScale = options.detailScale ?? 8;
  const detailIntensity = options.detailIntensity ?? 0.28;
  const detailTexture = options.detailTexture ?? getDetailNoiseTexture();

  const uniforms = {
    triplanarScale: { value: scale },
    triplanarDetailScale: { value: detailScale },
    triplanarDetailIntensity: { value: detailIntensity },
    triplanarDetailTexture: { value: detailTexture },
  };

  const attachTriplanar = (shader: TriplanarShader) => {
    shader.uniforms = {
      ...shader.uniforms,
      ...uniforms,
    };

    const hasMap = Boolean(material.map);
    const hasRoughnessMap = Boolean(material.roughnessMap);
    const hasMetalnessMap = Boolean(material.metalnessMap);
    const hasAoMap = Boolean(material.aoMap);

    // Removed manual injection of USE_MAP, USE_AOMAP, etc. because Three.js WebGLProgram natively 
    // defines these macros organically without values (e.g. `#define USE_AOMAP`). 
    // Manually setting `defines.USE_AOMAP = 1` triggered a fatal `macro redefined` GLSL compilation crash.

    const replaceFragment = (search: string, replacement: string) => {
      if (shader.fragmentShader.includes(search)) {
        shader.fragmentShader = shader.fragmentShader.replace(search, replacement);
      }
    };

    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>\n${TRIPLANAR_VERTEX_DECLARATIONS}`
    );

    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      "#include <project_vertex>\n    vTriplanarWorldNormal = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz);\n    vTriplanarWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;\n"
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>\n${TRIPLANAR_FRAGMENT_HELPERS}`
    );

    if (hasMap) {
      replaceFragment("#include <map_fragment>", MAP_FRAGMENT_TRIPLANAR);
    } else {
      replaceFragment("#include <color_fragment>", `#include <color_fragment>\n${DETAIL_FRAGMENT_ONLY_TRIPLANAR}`);
    }

    if (hasRoughnessMap) {
      replaceFragment("#include <roughnessmap_fragment>", ROUGHNESS_FRAGMENT_TRIPLANAR);
    }
    if (hasMetalnessMap) {
      replaceFragment("#include <metalnessmap_fragment>", METALNESS_FRAGMENT_TRIPLANAR);
    }
    if (hasAoMap) {
      replaceFragment("#include <aomap_fragment>", AOMAP_FRAGMENT_TRIPLANAR);
    }
  };

  const originalOnBeforeCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    originalOnBeforeCompile?.(shader, renderer);
    attachTriplanar(shader as TriplanarShader);
  };

  material.needsUpdate = true;

  return material;
};
