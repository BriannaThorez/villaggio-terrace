import React, { useMemo } from "react";
import { Line } from "@react-three/drei";
import {
  type StructuralFace,
  type StructuralRoomMetadata,
} from "../graph";
import { buildCutoutOutlinePoints } from "./facePanels";

/**
 * StructuralCutoutOverlay: Renders dashed outline overlays for structural cutouts.
 * (Formerly RoomSkin, refactored to focus on outlines only as per Phase 2 audit C4).
 * 
 * This component provides critical visual feedback for architectural voids 
 * that have been processed by the CSG engine.
 */
export const StructuralCutoutOverlay: React.FC<{
  room: StructuralRoomMetadata;
  faceVisibility?: Partial<Record<StructuralFace, boolean>>;
}> = ({
  room,
  faceVisibility = { left: true, right: true, front: true, back: true },
}) => {
    const cutoutOutlines = useMemo(
      () =>
        room.cutouts
          .map((cutout) => ({
            cutout,
            points: buildCutoutOutlinePoints(room, cutout, 0.09),
          }))
          .filter(({ cutout }) => faceVisibility[cutout.face] !== false),
      [faceVisibility, room],
    );

    return (
      <group
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
