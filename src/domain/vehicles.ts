import type { VehicleKind } from "./types";

export interface VehicleSpec {
  kind: VehicleKind;
  label: string;
  maxWeightKg: number;
  maxPositions: number;
}

/** 车型资料：小货车限 1800 公斤 / 8 位，厢式车限 3500 公斤 / 12 位 */
export const VEHICLES: Record<VehicleKind, VehicleSpec> = {
  small: { kind: "small", label: "小货车", maxWeightKg: 1800, maxPositions: 8 },
  box: { kind: "box", label: "厢式车", maxWeightKg: 3500, maxPositions: 12 },
};

export const VEHICLE_LIST: VehicleSpec[] = [VEHICLES.small, VEHICLES.box];
