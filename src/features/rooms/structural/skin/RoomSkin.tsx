/// <reference path="../../../../types.d.ts" />
import React, { useEffect, useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { parseMaterial } from "../../../../engine/MaterialParser";
import {
  createReusableDrywallTextureBundle,
  releaseReusableDrywallTextureBundle,
  type DrywallTextureDescriptor,
} from "../../../textures/api";
import type { StructuralFace, StructuralRoomMetadata } from "../graph";
import { buildCutoutOutlinePoints } from "./facePanels";

interface RoomSkinProps {
  room: StructuralRoomMetadata;
  color: string;
  material?: "plastic" | "glass";
  faceVisibility?: Partial<Record<StructuralFace, boolean>>;
  frontFaceVisibility?: "solid" | "transparent" | "hidden";
}

const SKIN_EPSILON = 0.06;
const FRONT_FACE_Z = 0;
const BACK_FACE_Z = -1;
const FACE_ORDER: StructuralFace[] = [
  "front",
  "back",
  "left",
  "right",
  "ceiling",
  "floor",
];

const facePosition = (
  room: StructuralRoomMetadata,
  face: StructuralFace,
): [number, number, number] => {
  const halfWidth = room.dimensions.width / 2;
  const floorY = 0;
  const ceilingY = room.dimensions.height;
  const frontZ = FRONT_FACE_Z;
  const backZ = room.dimensions.depth * BACK_FACE_Z;

  switch (face) {
    case "front":
      return [0, room.dimensions.height / 2, frontZ + SKIN_EPSILON];
    case "back":
      return [0, room.dimensions.height / 2, backZ - SKIN_EPSILON];
    case "left":
      return [
        -halfWidth - SKIN_EPSILON,
        room.dimensions.height / 2,
        -room.dimensions.depth / 2,
      ];
    case "right":
      return [
        halfWidth + SKIN_EPSILON,
        room.dimensions.height / 2,
        -room.dimensions.depth / 2,
      ];
    case "ceiling":
      return [0, ceilingY + SKIN_EPSILON, -room.dimensions.depth / 2];
    case "floor":
      return [0, floorY + SKIN_EPSILON, -room.dimensions.depth / 2];
  }
};

const faceRotation = (face: StructuralFace): [number, number, number] => {
  switch (face) {
    case "front":
      return [0, 0, 0];
    case "back":
      return [0, Math.PI, 0];
    case "left":
      return [0, Math.PI / 2, 0];
    case "right":
      return [0, -Math.PI / 2, 0];
    case "ceiling":
      return [Math.PI / 2, 0, 0];
    case "floor":
      return [-Math.PI / 2, 0, 0];
  }
};

const buildDrywallDescriptor = (
  room: StructuralRoomMetadata,
): DrywallTextureDescriptor => ({
  kind: "drywall",
  size: 512,
  seed: room.roomId.length,
  variant: "fine",
  tint: "#f2f0eb",
  repeat: 1,
  cacheScope: "room-skin",
});

export const RoomSkin: React.FC<RoomSkinProps> = ({
  room,
  color,
  material = "plastic",
  faceVisibility,
  frontFaceVisibility = "solid",
}) => {
  const drywallDescriptor = useMemo(() => buildDrywallDescriptor(room), [room]);

  const drywallTexture = useMemo(
    () => createReusableDrywallTextureBundle(drywallDescriptor),
    [drywallDescriptor],
  );

  const drywallPanelMaterial = useMemo(() => {
    const drywall = parseMaterial({
      albedo: color,
      roughness: 0.96,
      metalness: 0.0,
      normalMapIntensity: 0.08,
    });
    drywall.side = THREE.DoubleSide;
    drywall.transparent = false;
    drywall.opacity = 1;
    drywall.normalScale = new THREE.Vector2(0.08, 0.08);
    drywall.needsUpdate = true;
    return drywall;
  }, [color, drywallTexture]);

  const frontFaceMaterial = useMemo(() => {
    const front = parseMaterial({
      albedo: color,
      roughness: 0.96,
      metalness: 0.0,
      normalMapIntensity: 0.08,
    });
    front.side = THREE.DoubleSide;
    front.transparent = frontFaceVisibility === "transparent";
    front.opacity = frontFaceVisibility === "transparent" ? 0.08 : 1;
    front.normalScale = new THREE.Vector2(0.08, 0.08);
    front.needsUpdate = true;
    return front;
  }, [color, drywallTexture, frontFaceVisibility]);

  const visibleFaces = useMemo(
    () => FACE_ORDER.filter((face) => faceVisibility?.[face] !== false),
    [faceVisibility],
  );

  useEffect(() => {
    return () => {
      releaseReusableDrywallTextureBundle(drywallDescriptor);
      drywallPanelMaterial.dispose();
      frontFaceMaterial.dispose();
    };
  }, [drywallDescriptor, drywallPanelMaterial, frontFaceMaterial]);

  const cutoutOutlines = useMemo(
    () =>
      room.cutouts
        .map((cutout) => ({
          cutout,
          points: buildCutoutOutlinePoints(room, cutout, SKIN_EPSILON * 1.5),
        }))
        .filter(({ cutout }) => faceVisibility?.[cutout.face] !== false),
    [faceVisibility, room],
  );

  return (
    <group
      position={[0, 0, 0]}
      userData={{
        structural: {
          roomId: room.roomId,
          canonicalFace: room.canonicalFace,
          neighboringRoomIds: room.neighboringRoomIds,
          adjacencyGapIds: room.adjacencyGapIds,
          cutoutIds: room.cutoutIds,
        },
      }}
    >
      {visibleFaces.map((face) => {
        const isFrontFace = face === "front";
        const materialForFace =
          isFrontFace && frontFaceVisibility !== "solid"
            ? frontFaceMaterial
            : drywallPanelMaterial;

        if (isFrontFace && frontFaceVisibility === "hidden") {
          return null;
        }

        return (
          <mesh
            key={face}
            position={facePosition(room, face)}
            rotation={faceRotation(face)}
            material={materialForFace}
            userData={{
              structural: {
                roomId: room.roomId,
                face,
                panelId: `${room.roomId}:${face}:shell-face`,
                adjacentRoomIds: room.canonicalFaces[face].adjacentRoomIds,
                cutoutIds: room.canonicalFaces[face].cutoutIds,
                adjacencyGapIds: room.canonicalFaces[face].adjacencyGapIds,
              },
            }}
          >
            <planeGeometry
              args={[
                face === "left" || face === "right"
                  ? room.dimensions.depth
                  : room.dimensions.width,
                face === "ceiling" || face === "floor"
                  ? room.dimensions.depth
                  : room.dimensions.height,
              ]}
            />
          </mesh>
        );
      })}

      {cutoutOutlines.map(({ cutout, points }) => (
        <Line
          key={cutout.id}
          points={points}
          color="#94a3b8"
          lineWidth={1.25}
          dashed
          dashSize={0.35}
          gapSize={0.2}
          userData={{
            structural: {
              roomId: room.roomId,
              face: cutout.face,
              cutoutId: cutout.id,
              openingId: cutout.openingId,
              adjacencyGapId: cutout.adjacencyGapId,
            },
          }}
        />
      ))}
    </group>
  );
};
