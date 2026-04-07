/**
 * GrassMaterial — GPU-driven grass blade shader.
 *
 * Based on "Realistic real-time grass rendering" (Eddie Lee, 2010)
 * and the drcmda R3F implementation. Modernized for three@0.183 / R3F v9.
 *
 * Features:
 *   - Simplex noise wind animation (GPU-side)
 *   - Quaternion SLERP for smooth blade bending
 *   - Procedural tip→root color gradient (no textures needed)
 *   - DoubleSide rendering for correct silhouettes
 */

import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

const GrassMaterial = shaderMaterial(
  {
    bladeHeight: 1,
    time: 0,
    tipColor: new THREE.Color(0.11, 0.34, 0.24), // Darker forest green with blue hint
    bottomColor: new THREE.Color(0.02, 0.08, 0.11), // Deep shadow with blue hint
    uMaxDistance: 350.0,
    uPoolSize: 1000.0,
    cullRects: new Array(64).fill(new THREE.Vector4(0, 0, 0, 0)),
    cullCount: 0,
  },
  /* ──── Vertex Shader ──── */
  `precision mediump float;

  attribute vec3 offset;
  attribute vec4 orientation;
  attribute float halfRootAngleSin;
  attribute float halfRootAngleCos;
  attribute float stretch;

  uniform float time;
  uniform float bladeHeight;
  uniform float uMaxDistance;
  uniform float uPoolSize;
  uniform vec4 cullRects[64];
  uniform int cullCount;

  varying vec2 vUv;
  varying float frc;

  // ── Simplex 2D noise (Ashima Arts, MIT) ──
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x_) - 0.5;
    vec3 ox = floor(x_ + 0.5);
    vec3 a0 = x_ - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // ── Quaternion rotation ──
  vec3 rotateVectorByQuaternion(vec3 v, vec4 q) {
    return 2.0 * cross(q.xyz, v * q.w + cross(q.xyz, v)) + v;
  }

  // ── Spherical linear interpolation ──
  vec4 slerp(vec4 v0, vec4 v1, float t) {
    v0 = normalize(v0);
    v1 = normalize(v1);
    float d = dot(v0, v1);
    if (d < 0.0) { v1 = -v1; d = -d; }
    if (d > 0.9995) {
      return normalize(t * (v1 - v0) + v0);
    }
    float theta_0 = acos(d);
    float theta = theta_0 * t;
    float sin_theta = sin(theta);
    float sin_theta_0 = sin(theta_0);
    float s0 = cos(theta) - d * sin_theta / sin_theta_0;
    float s1 = sin_theta / sin_theta_0;
    return (s0 * v0) + (s1 * v1);
  }

  void main() {
    frc = position.y / float(bladeHeight);

    // ── Infinite Camera Wrapping (No-Slide Logic) ──
    // Snaps 'offset' to the world-grid cell nearest the camera.
    // uPoolSize must match the bounds of the 'offset' attribute (e.g. 1000).
    vec3 worldRoot = offset;
    
    // Account for the Group's world position (modelMatrix translation)
    vec3 origin = vec3(modelMatrix[3][0], modelMatrix[3][1], modelMatrix[3][2]);
    worldRoot.x = floor((cameraPosition.x - (offset.x + origin.x)) / uPoolSize + 0.5) * uPoolSize + offset.x + origin.x;
    worldRoot.z = floor((cameraPosition.z - (offset.z + origin.z)) / uPoolSize + 0.5) * uPoolSize + offset.z + origin.z;
    worldRoot.y = offset.y + origin.y;

    // ── Per-Instance Frustum Culling ──
    vec4 clipPos = projectionMatrix * viewMatrix * vec4(worldRoot + position, 1.0);
    vec3 ndc = clipPos.xyz / clipPos.w;
    
    if (abs(ndc.x) > 1.2 || abs(ndc.y) > 1.2 || clipPos.z < -clipPos.w) {
        gl_Position = vec4(0.0);
        return;
    }

    // ── Distant Culling ──
    float dist = distance(cameraPosition, worldRoot + position);
    if (dist > uMaxDistance) {
        gl_Position = vec4(0.0);
        return;
    }

    // ── Room Footprint Culling (using worldRoot) ──
    bool culled = false;
    for (int i = 0; i < 64; i++) {
        if (i >= cullCount) break;
        vec4 rect = cullRects[i];
        if (worldRoot.x >= rect.x && worldRoot.x <= rect.z && 
            worldRoot.z >= rect.y && worldRoot.z <= rect.w) {
            culled = true;
            break;
        }
    }

    if (culled) {
        gl_Position = vec4(0.0);
        return;
    }

    float distScale = clamp(1.0 - (dist - (uMaxDistance * 0.8)) / (uMaxDistance * 0.2), 0.0, 1.0);

    float noise = 1.0 - snoise(vec2(
      time - worldRoot.x / 50.0,
      time - worldRoot.z / 50.0
    ));

    vec4 direction = vec4(0.0, halfRootAngleSin, 0.0, halfRootAngleCos);
    direction = slerp(direction, orientation, frc);

    vec3 vPosition = vec3(position.x, position.y + position.y * stretch, position.z);
    vPosition *= distScale; 
    vPosition = rotateVectorByQuaternion(vPosition, direction);

    float halfAngle = noise * 0.15;
    vPosition = rotateVectorByQuaternion(
      vPosition,
      normalize(vec4(sin(halfAngle), 0.0, -sin(halfAngle), cos(halfAngle)))
    );

    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * vec4(worldRoot + vPosition, 1.0);
  }`,

  /* ──── Fragment Shader ──── */
  `precision mediump float;

  uniform vec3 tipColor;
  uniform vec3 bottomColor;

  varying vec2 vUv;
  varying float frc;

  void main() {
    // Procedural alpha — narrow blade shape from UV
    float alpha = smoothstep(0.0, 0.1, vUv.x) * (1.0 - smoothstep(0.9, 1.0, vUv.x));
    if (alpha < 0.15) discard;

    // Gradient: dark root → bright tip
    vec3 col = mix(bottomColor, tipColor, frc);

    // Subtle AO darkening at root
    col *= 0.4 + 0.6 * frc;

    gl_FragColor = vec4(col, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,

  (self) => {
    self.side = THREE.DoubleSide;
  },
);

extend({ GrassMaterial });

export { GrassMaterial };
