# Structural Metadata Handoff

Status: ready for Nietzsche handoff
Contract state: final for RoomSkin + selection overlay integration

Contract version: `1.0.0`

Source modules:
- `src/features/rooms/structural/graph/contract.ts`
- `src/features/rooms/structural/graph/cellBeamGraph.ts`

## Stable contract

The deterministic structural contract now exposes:

- `StructuralCellBeamGraph`: global derived graph for all room shapes.
- `StructuralRoomMetadata`: per-room structural payload attached at render time as `shape.structuralRoom`.
- `StructuralCell`: canonical room cell atoms on the snapped `snapX`/`snapY` grid.
- `StructuralBeam`: reusable edge beams for `wall`, `floor`, and `ceiling` planes.
- `StructuralCanonicalFace`: canonical `front`/`back`/`left`/`right`/`ceiling`/`floor` face payloads.
- `StructuralRoomAdjacency`: adjacency contract keyed by neighboring room id with shared beam ids and cell pairs.
- Query helpers in `src/features/rooms/structural/graph/helpers.ts` for canonical-face and neighbor-adjacency lookups.

## ID conventions Nietzsche can rely on

- Cell id: ``${roomId}:cell:${x2},${y2}``
- Corner id: ``corner:${x2},${y2}``
- Beam id: ``beam:${plane}:${orderedCornerIdA}:${orderedCornerIdB}``
- Canonical face id: ``${roomId}:face:${face}``
- Adjacency id: ``adjacency:${sortedRoomIdA}:${sortedRoomIdB}``

These ids are deterministic and order-stable across rebuilds for the same snapped shapes array.

## Deterministic rules

- Room cells are derived from the shape array only; persisted store state is never mutated.
- Room footprints are snapped with `snapX`/`snapY` before cell derivation.
- Beams are keyed from ordered corner ids so adjacent cells and adjacent rooms reuse the same beam.
- Shared wall beams are tagged `interior-partition`; exposed wall beams are tagged `exterior-wall`.
- Canonical faces are computed from exposed room boundaries and stored for downstream consumers.
- Canonical face selection order is `front`, `right`, `back`, `left`, `ceiling`, `floor`.

## Nietzsche handoff targets

Nietzsche can now layer the following on top of `structuralRoom` without redefining room topology:

- framing/cutout metadata keyed by `beamIds`, `cellIds`, and `canonicalFaces[face].beamIds`
- `RoomSkin` surface generation from canonical face beam loops
- selection overlays anchored to `canonicalFace` and `canonicalFaces`
- opening validation against `adjacency[neighborId].sharedWallBeamIds`

For direct consumption:

- `room.canonicalFaces[face].beamIds` = boundary beam loop Nietzsche should treat as the legal skin span for that face.
- `room.canonicalFaces[face].adjacentRoomIds` = rooms touching that face; useful for suppressing facade skin or interior overlays.
- `room.adjacency[neighborId].sharedWallBeamIds` = exact beam ids to carve for passages/doors between adjacent rooms.
- `room.adjacency[neighborId].cellPairs` = deterministic per-cell wall contacts; useful for placing framed openings at specific shared cell seams.
- `room.beamIds` and `room.beams` = full room-local structural inventory for fallback or whole-room overlay rendering.

## Integration entry points

- Build graph: `buildCellBeamGraph(shapes)`
- Attach render metadata: `attachStructuralMetadataToShapes(shapes, graph?)`
- Export normalized payloads: `exportStructuralMetadata(graph)`
- Query helpers:
  - `getCanonicalFace(room, face?)`
  - `getCanonicalFaceBeamIds(room, face?)`
  - `getCanonicalFaceBeams(room, face)`
  - `getNeighborAdjacency(room, neighborRoomId)`
  - `getNeighborSharedWallBeamIds(room, neighborRoomId)`
  - `getNeighborSharedWallBeams(room, neighborRoomId)`
- Back-compat exports remain available under `src/entities/rooms/structural/*`

## Verification

- structural tests: `npm run test:structural`
- repo typecheck: `npm run lint`

## Blockers

- none in the structural metadata layer

## Remaining work outside the contract

- Adjacency metadata layer: optional convenience grouping for "all exterior faces" or "all interior partitions by face" if Nietzsche wants fewer per-room scans, but nothing required to finish framing/skin.
- Helper docs: fulfilled via `docs/orchestrator-cutout-sync.md`, which maps cutout inputs to canonical faces and shared wall beams.
- Framing extension: framing beam ids and cutout ids should compose on top of existing beam ids rather than replace them.

## Coordination note

If Nietzsche needs framing or skin-specific fields, extend the contract by composition rather than mutating beam ids, cell ids, or adjacency semantics. Those ids are now the stable structural spine.
