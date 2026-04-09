import * as THREE from 'three';

export const GlobalIlluminationShader = {
  uniforms: {
    tDiffuse: { value: null },
    tNormal: { value: null },
    tDepth: { value: null },
    tPrevAccum: { value: null },
    tBlueNoise: { value: null },
    cameraMatrixWorld: { value: new THREE.Matrix4() },
    projectionMatrix: { value: new THREE.Matrix4() },
    inverseProjectionMatrix: { value: new THREE.Matrix4() },
    uViewMatrix: { value: new THREE.Matrix4() },
    uTime: { value: 0 },
    uFrameIndex: { value: 0 },
    uSunDirection: { value: new THREE.Vector3(1, 1, 1).normalize() },
    uResolution: { value: new THREE.Vector2() },
    uBounceIntensity: { value: 0.85 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    #include <common>
    
    uniform sampler2D tDiffuse;
    uniform sampler2D tNormal;
    uniform sampler2D tDepth;
    uniform sampler2D tPrevAccum;
    uniform sampler2D tBlueNoise;
    
    uniform mat4 inverseProjectionMatrix;
    uniform mat4 cameraMatrixWorld;
    uniform mat4 uViewMatrix;
    uniform vec3 uSunDirection;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform int uFrameIndex;
    uniform float uBounceIntensity;
    
    varying vec2 vUv;

    float getDepth(vec2 uv) {
      return texture2D(tDepth, uv).r;
    }

    vec3 getViewPos(vec2 uv) {
      float depth = getDepth(uv);
      vec4 ndc = vec4(uv * 2.0 - 1.0, 1.0, 1.0); // Far plane
      vec4 farPos = inverseProjectionMatrix * ndc;
      return (farPos.xyz / farPos.w) * (depth / (farPos.z / farPos.w));
    }

    vec3 hash33(vec3 p3) {
      p3 = fract(p3 * vec3(.1031, .1030, .9731));
      p3 += dot(p3, p3.yxz+33.33);
      return fract((p3.xxy + p3.yxx)*p3.zyx);
    }

    void main() {
      float depth = getDepth(vUv);
      if (depth >= 1.0) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }

      vec3 normal = texture2D(tNormal, vUv).xyz * 2.0 - 1.0;
      vec3 viewPos = getViewPos(vUv);
      vec3 worldPos = (cameraMatrixWorld * vec4(viewPos, 1.0)).xyz;
      vec3 albedo = texture2D(tDiffuse, vUv).rgb;

      // Blue Noise Sample Distribution
      vec2 noiseUv = vUv * (uResolution / 64.0) + fract(float(uFrameIndex) * 0.1);
      vec3 blueNoise = texture2D(tBlueNoise, noiseUv).rgb;

      // SSPT: Screen-Space Path Tracing (Stochastic Bounce)
      vec3 indirect = vec3(0.0);
      
      // Multi-Bounce Feedback: Sample previous frame's accumulation
      // This effectively "spreads" light across the surfaces over time.
      vec3 prevLight = texture2D(tPrevAccum, vUv).rgb;
      
      // Simple Screen-Space Bounce approximation
      // In a full implementation, we would raymarch here.
      // For the first high-performance pass, we integrate surface irradiance.
      float skyVisibility = max(0.0, dot(normal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5);
      vec3 irradiance = skyVisibility * vec3(0.0, 0.4, 1.0); // BOLD BLUE FOR TESTING
      
      indirect = irradiance * albedo * uBounceIntensity;
      indirect = clamp(indirect, 0.0, 1.0);
      
      // Blend with previous frame (Multi-Bounce)
      vec3 finalColor = albedo + indirect + (prevLight * 0.15); 

      gl_FragColor = vec4(mix(prevLight, finalColor, 0.1), 1.0);
    }
  `
};
