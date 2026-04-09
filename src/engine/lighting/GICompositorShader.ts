import * as THREE from 'three';

/**
 * GI Compositor Shader
 * Multiplies/Adds the high-fidelity bounced light onto the base scene.
 */
export const GICompositorShader = {
  uniforms: {
    tDiffuse: { value: null },      // Base scene (without GI)
    tGI: { value: null },           // GI Light Transport texture
    tNormal: { value: null },       // For debug
    tDepth: { value: null },        // For debug
    uIntensity: { value: 1.0 },
    uDebug: { value: 0 },           // 0: Result, 1: Albedo, 2: Normal, 3: Depth
    uEmissionMultiplier: { value: 2.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tGI;
    uniform sampler2D tNormal;
    uniform sampler2D tDepth;
    uniform float uIntensity;
    uniform int uDebug;
    
    varying vec2 vUv;
    
    void main() {
      if (uDebug == 1) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
      if (uDebug == 2) { gl_FragColor = vec4(texture2D(tNormal, vUv).rgb, 1.0); return; }
      if (uDebug == 3) { gl_FragColor = vec4(vec3(texture2D(tDepth, vUv).r * 0.01), 1.0); return; } // Scaled depth for visibility
      
      // vec4 light = texture2D(tGI, vUv);
      // vec3 indirect = clamp(light.rgb, 0.0, 1.0);
      // gl_FragColor = vec4(indirect, uIntensity);
      
      // DIAGNOSTIC RED TEST
      gl_FragColor = vec4(1.0, 0.0, 0.0, 0.8); 
    }
  `
};
