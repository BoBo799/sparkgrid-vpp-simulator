
export enum AssetType {
  SOLAR = 'SOLAR',
  WIND = 'WIND',
  BATTERY = 'BATTERY',
  BUILDING = 'BUILDING',
  FACTORY = 'FACTORY',
  EV_STATION = 'EV_STATION'
}

export interface GridAsset {
  id: string;
  name: string;
  type: AssetType;
  capacity: number; // Max output/input in MW
  currentOutput: number; // Current generation/consumption in MW
  status: 'active' | 'offline' | 'warning';
  x: number;
  y: number;
}

export interface GridStats {
  totalGeneration: number;
  totalConsumption: number;
  netLoad: number;
  storageLevel: number;
  gridFrequency: number;
}

export interface SimulationScenario {
  name: string;
  description: string;
  effect: (assets: GridAsset[]) => GridAsset[];
}
