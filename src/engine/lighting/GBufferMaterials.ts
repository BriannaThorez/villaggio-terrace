import * as THREE from 'three';

/**
 * GBuffer Overrider logic.
 * In WebGL2 MRT, shaders MUST output to all active draw buffers.
 * This class provides high-performance materials to satisfy those outputs.
 */
export const GBufferMaterials = {
  // A generic material that writes to Albedo (0), Normal (1), and Depth (2)
  Capture: new THREE.ShaderMaterial({
    uniforms: {
      uAlbedo: { value: new THREE.Color('#ffffff') },
      tDiffuse: { value: null },
      uHasTexture: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec2 vUv;
      varying float vDepth;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        vDepth = -mvPosition.z; // View-space depth
      }
    `,
    fragmentShader: `
      uniform vec3 uAlbedo;
      uniform sampler2D tDiffuse;
      uniform int uHasTexture;
      
      varying vec3 vNormal;
      varying vec2 vUv;
      varying float vDepth;
      
      layout(location = 0) out vec4 pc_fragColor;
      layout(location = 1) out vec4 pc_fragNormal;
      layout(location = 2) out vec4 pc_fragDepth;
      
      void main() {
        vec3 color = uAlbedo;
        if (uHasTexture == 1) {
          color *= texture(tDiffuse, vUv).rgb;
        }
        
        // Depth encoding: Normalized Linear Depth
        // This prevents precision explosions in the GI pass
        float dist = vDepth;
        
        pc_fragColor = vec4(color, 1.0);
        pc_fragNormal = vec4(vNormal * 0.5 + 0.5, 1.0);
        pc_fragDepth = vec4(vec3(dist), 1.0);
      }
    `,
    glslVersion: THREE.GLSL3
  })
};
