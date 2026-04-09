import * as THREE from 'three';
import { Effect } from 'postprocessing';

const fragmentShader = `
uniform sampler2D tDiffuse;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform mat4 inverseProjectionMatrix;
uniform mat4 cameraMatrixWorld;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform float uIntensity;
uniform float uTime;
uniform vec3 sunPos;

// AAA SSGI Constants (Calibrated for Tower Site)
#define MAX_STEPS 64
#define STEP_SIZE 12.0
#define THICKNESS 15.0
#define BIAS 2.0

// High-fidelity View-Space Position Reconstruction (Ortho Optimized)
vec3 getViewPos(vec2 uv, float depth) {
    // In many post-processing setups, depth is 0 to 1
    // For Ortho, we reconstruct Z by scaling the linear depth
    vec4 ndc = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec4 viewPos = inverseProjectionMatrix * ndc;
    return viewPos.xyz;
}

// High-fidelity Raymarcher
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 sceneColor = inputColor.rgb;
    float depth = texture(tDepth, uv).r;
    
    // Sky detection
    if(depth >= 0.9999) {
        outputColor = vec4(sceneColor, 1.0);
        return;
    }
    
    vec3 vPos = getViewPos(uv, depth);
    
    float visibility = 1.0;
    
    // Transform Sun to View Space
    // AAA: sunPos is a world-space direction.
    vec3 nSunPos = normalize(sunPos);
    vec3 vRayDir = normalize((viewMatrix * vec4(nSunPos, 0.0)).xyz);
    
    // AAA: Site-Scale Raymarch
    // Based on the diagnostic gradient, building clusters are ~100-500 units wide.
    for(int i = 1; i <= 64; i++) {
        // Step out from fragment towards the sun
        vec3 marchPos = vPos + vRayDir * (float(i) * 5.0); 
        
        vec4 projected = projectionMatrix * vec4(marchPos, 1.0);
        vec2 screenUV = (projected.xy / projected.w) * 0.5 + 0.5;
        
        if(screenUV.x < 0.0 || screenUV.x > 1.0 || screenUV.y < 0.0 || screenUV.y > 1.0) break;
        
        float sampledDepth = texture(tDepth, screenUV).r;
        vec3 sampledVPos = getViewPos(screenUV, sampledDepth);
        
        // Depth-based occlusion for Ortho Site Scale
        if(marchPos.z < sampledVPos.z + 5.0 && marchPos.z > sampledVPos.z - 20.0) {
            visibility = 0.0;
            break;
        }
    }
    
    // Final Physical Color Integration (AAA Aesthetic)
    vec3 solarColor = vec3(1.1, 1.02, 0.88); // Warm Solar
    vec3 shadowColor = vec3(0.06, 0.1, 0.18); // Deep Cool GI
    
    vec3 finalLight = mix(sceneColor * shadowColor, sceneColor * solarColor, visibility);
    
    outputColor = vec4(finalLight * uIntensity, 1.0);
}
`;

export class ScreenSpaceGIEffect extends Effect {
    private camera: THREE.Camera | null = null;

    constructor(options: { intensity?: number, sunPos?: [number, number, number], camera?: THREE.Camera } = {}) {
        const uniforms = new Map<string, THREE.Uniform>([
            ['uIntensity', new THREE.Uniform(options.intensity ?? 1.0)],
            ['uTime', new THREE.Uniform(0.0)],
            ['sunPos', new THREE.Uniform(new THREE.Vector3(...(options.sunPos ?? [1, 1, 1])))],
            ['inverseProjectionMatrix', new THREE.Uniform(new THREE.Matrix4())],
            ['cameraMatrixWorld', new THREE.Uniform(new THREE.Matrix4())],
            ['viewMatrix', new THREE.Uniform(new THREE.Matrix4())]
        ]);
        super('ScreenSpaceGIEffect', fragmentShader, {
            uniforms
        });
        this.camera = options.camera || null;
    }

    update(renderer: any, inputBuffer: any, deltaTime: any) {
        this.uniforms.get('uTime')!.value += deltaTime;
        if (this.camera) {
            this.uniforms.get('inverseProjectionMatrix')!.value.copy(this.camera.projectionMatrixInverse);
            this.uniforms.get('cameraMatrixWorld')!.value.copy(this.camera.matrixWorld);
            this.uniforms.get('viewMatrix')!.value.copy(this.camera.matrixWorldInverse);
        }
    }

    setSunPos(pos: [number, number, number]) {
        this.uniforms.get('sunPos')!.value.set(...pos);
    }
}
