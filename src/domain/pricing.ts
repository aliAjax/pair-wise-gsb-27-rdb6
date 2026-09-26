/**
 * 核价层：根据车型限制和托盘货明细试算装载，
 * 超重或缺位时给出具体超出数量，供页面和保存层使用。
 */
import { VEHICLE_LIMITS, type PalletItem, type Quote, type VehicleType } from "./quote";

export type LoadCheck = Quote["check"];

/** 可叠放的货两托占一位，不可叠放的一托占一位 */
export function positionsFor(item: PalletItem): number {
  return item.stackable ? Math.ceil(item.pallets / 2) : item.pallets;
}

export function totalWeightOf(items: PalletItem[]): number {
  return items.reduce((sum, item) => sum + item.pallets * item.weightPerPalletKg, 0);
}

export function totalPositionsOf(items: PalletItem[]): number {
  return items.reduce((sum, item) => sum + positionsFor(item), 0);
}

/** 核价：算出总重与占位，对照车辆限制列出问题 */
export function checkLoad(vehicle: VehicleType, items: PalletItem[]): LoadCheck {
  const limit = VEHICLE_LIMITS[vehicle];
  const totalWeightKg = totalWeightOf(items);
  const usedPositions = totalPositionsOf(items);
  const overweightKg = Math.max(0, totalWeightKg - limit.maxWeightKg);
  const shortPositions = Math.max(0, usedPositions - limit.maxPositions);

  const problems: string[] = [];
  if (overweightKg > 0) {
    problems.push(`超重 ${overweightKg} 公斤（${vehicle}限重 ${limit.maxWeightKg} 公斤）`);
  }
  if (shortPositions > 0) {
    problems.push(`缺 ${shortPositions} 个托位（${vehicle}限 ${limit.maxPositions} 位）`);
  }

  return {
    totalWeightKg,
    usedPositions,
    maxWeightKg: limit.maxWeightKg,
    maxPositions: limit.maxPositions,
    overweightKg,
    shortPositions,
    ok: problems.length === 0,
    problems
  };
}

/** 核价通过才可进入待确认，否则待调整 */
export function statusFor(check: LoadCheck): "待调整" | "待确认" {
  return check.ok ? "待确认" : "待调整";
}
