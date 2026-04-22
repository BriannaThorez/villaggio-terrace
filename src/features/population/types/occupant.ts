export type TenantLifecycleState = 
  | 'sleeping'
  | 'waking_up'
  | 'commuting_out'
  | 'at_work'
  | 'commuting_home'
  | 'at_home'
  | 'visiting_amenity';

export type GuestLifecycleState =
  | 'spawning'
  | 'commuting_in'
  | 'visiting'
  | 'commuting_out'
  | 'despawned';

export interface BaseOccupantEntity {
  id: string;
  name: string;
  type: 'tenant' | 'guest';
}

export interface TenantEntity extends BaseOccupantEntity {
  type: 'tenant';
  age: number;
  occupation: string;
  homeRoomId: string;
  workplaceRoomId?: string;
  lifecycleState: TenantLifecycleState;
  satisfaction: number; // 0-100
}

export interface GuestEntity extends BaseOccupantEntity {
  type: 'guest';
  visitorType: string;
  originLabel: string;
  targetRoomId: string;
  purpose: string;
  lifecycleState: GuestLifecycleState;
  spawnTime: number;
  expectedDurationMs: number;
}

export type OccupantEntity = TenantEntity | GuestEntity;

export interface NavWaypoint {
  x: number;
  y: number;
  floorIndex: number;
  nodeId?: string;
}

export interface NavPath {
  waypoints: NavWaypoint[];
  currentIdx: number;
}
