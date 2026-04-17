/**
 * GrassField — Ultra high-performance instanced grass.
 *
 * Architecture:
 *   - Single draw call for all blades via InstancedBufferGeometry
 *   - GPU-driven wind via simplex noise in vertex shader
 *   - Zero textures — fully procedural coloring
 *   - Flat ground mesh underneath
 *
 * Performance budget for tower simulator:
 *   - 15,000 blades at small scale = imperceptible GPU cost
 *   - Single draw call, ~90k triangles total
 *
 * World scale: 1 foot = 5 world units. Grass area spans the
 * tower's ground level footprint.
 */

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import "./GrassMaterial";

// ── Inline simplex noise (no external dependency) ──
class SimplexNoise2D {
  private perm: Uint8Array;

  constructor(seed = Math.random()) {
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Fisher-Yates seeded shuffle
    let s = seed * 2147483647;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  noise2D(x: number, z: number): number {
    // Simple hash-based noise — good enough for terrain
    const X = Math.floor(x) & 255;
    const Z = Math.floor(z) & 255;
    const xf = x - Math.floor(x);
    const zf = z - Math.floor(z);
    const u = xf * xf * (3 - 2 * xf);
    const v = zf * zf * (3 - 2 * zf);
    const a = this.perm[X] + Z;
    const b = this.perm[X + 1] + Z;
    const aa = this.perm[a & 511] / 255;
    const ab = this.perm[(a + 1) & 511] / 255;
    const ba = this.perm[b & 511] / 255;
    const bb = this.perm[(b + 1) & 511] / 255;
    return (
      (aa * (1 - u) + ba * u) * (1 - v) + (ab * (1 - u) + bb * u) * v - 0.5
    );
  }
}

const simplex = new SimplexNoise2D();

function getYPosition(_x: number, _z: number): number {
  return 0; // Strictly flat to match the floor/ground pane
}

// ── Attribute data generator ──
function getAttributeData(instances: number, width: number) {
  const offsets = new Float32Array(instances * 3);
  const orientations = new Float32Array(instances * 4);
  const stretches = new Float32Array(instances);
  const halfRootAngleSin = new Float32Array(instances);
  const halfRootAngleCos = new Float32Array(instances);

  const q0 = new THREE.Vector4();
  const q1 = new THREE.Vector4();
  const minAngle = -0.25;
  const maxAngle = 0.25;

  for (let i = 0; i < instances; i++) {
    const ox = Math.random() * width - width / 2;
    const oz = Math.random() * width - width / 2;
    const oy = getYPosition(ox, oz);
    offsets[i * 3] = ox;
    offsets[i * 3 + 1] = oy;
    offsets[i * 3 + 2] = oz;

    // Y rotation
    let angle = Math.PI - Math.random() * (2 * Math.PI);
    halfRootAngleSin[i] = Math.sin(0.5 * angle);
    halfRootAngleCos[i] = Math.cos(0.5 * angle);

    q0.set(0, Math.sin(angle / 2), 0, Math.cos(angle / 2)).normalize();

    // X rotation
    angle = Math.random() * (maxAngle - minAngle) + minAngle;
    q1.set(Math.sin(angle / 2), 0, 0, Math.cos(angle / 2)).normalize();
    multiplyQuat(q0, q1);

    // Z rotation
    angle = Math.random() * (maxAngle - minAngle) + minAngle;
    q1.set(0, 0, Math.sin(angle / 2), Math.cos(angle / 2)).normalize();
    multiplyQuat(q0, q1);

    orientations[i * 4] = q0.x;
    orientations[i * 4 + 1] = q0.y;
    orientations[i * 4 + 2] = q0.z;
    orientations[i * 4 + 3] = q0.w;

    stretches[i] = i < instances / 3 ? Math.random() * 1.8 : Math.random();
  }

  return {
    offsets,
    orientations,
    stretches,
    halfRootAngleSin,
    halfRootAngleCos,
  };
}

function multiplyQuat(a: THREE.Vector4, b: THREE.Vector4) {
  const x = a.x * b.w + a.y * b.z - a.z * b.y + a.w * b.x;
  const y = -a.x * b.z + a.y * b.w + a.z * b.x + a.w * b.y;
  const z = a.x * b.y - a.y * b.x + a.z * b.w + a.w * b.z;
  const w = -a.x * b.x - a.y * b.y - a.z * b.z + a.w * b.w;
  a.set(x, y, z, w);
}

// ── Ground mesh (BufferGeometry, no deprecated Geometry) ──
function createGroundGeometry(
  width: number,
  segments = 32,
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, width, segments, segments);
  geo.rotateX(-Math.PI / 2); // face up

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, getYPosition(x, z));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// ── React component ──
interface GrassFieldProps {
  width?: number;
  instances?: number;
  bladeWidth?: number;
  bladeHeight?: number;
  joints?: number;
  position?: [number, number, number];
  renderOrder?: number;
  uMaxDistance?: number;
}

import { useSimulationStore, getFloorIndex } from "../../../shared/utils/store";

// ... SimplexNoise2D and helper functions ...

export const GrassField: React.FC<GrassFieldProps> = ({
  width = 100,
  instances = 1500,
  bladeWidth = 0.15,
  bladeHeight = 1.0,
  joints = 5,
  position = [0, 0, 0],
  renderOrder = 20,
  uMaxDistance = 850,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<any>(null);
  const shapes = useSimulationStore((state) => state.shapes);

  const cullData = useMemo(() => {
    const rects: THREE.Vector4[] = [];
    const groundRooms = shapes.filter(
      (s) =>
        getFloorIndex(s.position[1]) === 0 &&
        s.type !== "empty_floor" &&
        s.type !== "text",
    );

    for (let i = 0; i < Math.min(64, groundRooms.length); i++) {
      const s = groundRooms[i];
      const halfW = s.size[0] / 2;
      const minX = s.position[0] - halfW;
      const maxX = s.position[0] + halfW;
      const minZ = -40.5;
      const maxZ = 0.5;
      rects.push(new THREE.Vector4(minX, minZ, maxX, maxZ));
    }

    while (rects.length < 64) {
      rects.push(new THREE.Vector4(0, 0, 0, 0));
    }
    return { rects, count: Math.min(64, groundRooms.length) };
  }, [shapes]);

  const attributeData = useMemo(
    () => getAttributeData(instances, width),
    [instances, width],
  );

  const baseGeom = useMemo(
    () =>
      new THREE.PlaneGeometry(bladeWidth, bladeHeight, 1, joints).translate(
        0,
        bladeHeight / 2,
        0,
      ),
    [bladeWidth, bladeHeight, joints],
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime / 4;
      materialRef.current.uniforms.cullRects.value = cullData.rects;
      materialRef.current.uniforms.cullCount.value = cullData.count;
      materialRef.current.uniforms.uMaxDistance.value = uMaxDistance;
      materialRef.current.uniforms.uPoolSize.value = width;
      // Anchor the grass pool to the camera's focal point (orbit target), not the eye position.
      // This ensures blades tile around the visual centre of the scene, not the camera rig.
      const orbitTarget = (state.controls as any)?.target as THREE.Vector3 | undefined;
      if (orbitTarget) {
        materialRef.current.uniforms.uCameraTarget.value.copy(orbitTarget);
      }
    }
  });

  return (
    <group position={position}>
      {/* Instanced grass blades — single draw call with dynamic shadows */}
      <mesh
        frustumCulled={false}
        renderOrder={renderOrder}
        castShadow
        receiveShadow
      >
        <instancedBufferGeometry
          index={baseGeom.index}
          attributes-position={baseGeom.attributes.position}
          attributes-normal={baseGeom.attributes.normal}
          attributes-uv={baseGeom.attributes.uv}
        >
          <instancedBufferAttribute
            attach="attributes-offset"
            args={[attributeData.offsets, 3]}
          />
          <instancedBufferAttribute
            attach="attributes-orientation"
            args={[attributeData.orientations, 4]}
          />
          <instancedBufferAttribute
            attach="attributes-stretch"
            args={[attributeData.stretches, 1]}
          />
          <instancedBufferAttribute
            attach="attributes-halfRootAngleSin"
            args={[attributeData.halfRootAngleSin, 1]}
          />
          <instancedBufferAttribute
            attach="attributes-halfRootAngleCos"
            args={[attributeData.halfRootAngleCos, 1]}
          />
        </instancedBufferGeometry>
        {/* @ts-ignore — custom shader material registered via extend() */}
        <grassMaterial
          ref={materialRef}
          bladeHeight={bladeHeight}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};
