import type { PalletItem, QuoteStatus, QuoteVersion } from "../domain/types";
import { VEHICLES } from "../domain/vehicles";

export interface LoadResult {
  totalWeightKg: number;
  positionsUsed: number;
  maxWeightKg: number;
  maxPositions: number;
  /** 超出的公斤数，未超重为 0 */
  overweightKg: number;
  /** 缺少的托位数，未缺位为 0 */
  missingPositions: number;
  fits: boolean;
  /** 超限说明，写清超出几公斤或几位 */
  problems: string[];
}

/** 可叠放货物两托占一位，不可叠放一托占一位 */
export function positionsFor(item: PalletItem): number {
  return item.stackable ? Math.ceil(item.pallets / 2) : item.pallets;
}

/** 核价：按车型限重与托位核算一个版本是否装得下 */
export function evaluateLoad(version: QuoteVersion): LoadResult {
  const spec = VEHICLES[version.vehicle];
  const totalWeightKg = version.items.reduce(
    (sum, item) => sum + item.pallets * item.weightPerPalletKg,
    0
  );
  const positionsUsed = version.items.reduce((sum, item) => sum + positionsFor(item), 0);
  const overweightKg = Math.max(0, totalWeightKg - spec.maxWeightKg);
  const missingPositions = Math.max(0, positionsUsed - spec.maxPositions);
  const problems: string[] = [];
  if (overweightKg > 0) problems.push(`超重 ${overweightKg} 公斤`);
  if (missingPositions > 0) problems.push(`缺 ${missingPositions} 个托位`);
  return {
    totalWeightKg,
    positionsUsed,
    maxWeightKg: spec.maxWeightKg,
    maxPositions: spec.maxPositions,
    overweightKg,
    missingPositions,
    fits: problems.length === 0,
    problems,
  };
}

/** 核价定状态：装得下为可配载，否则待调整 */
export function statusFor(version: QuoteVersion): QuoteStatus {
  return evaluateLoad(version).fits ? "可配载" : "待调整";
}
