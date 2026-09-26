/**
 * 资料层：车型限制、报价状态、数据结构定义。
 * 不涉及核价计算（见 pricing.ts）与持久化（见 store/storage.ts）。
 */

export type VehicleType = "小货车" | "厢式车";

export const VEHICLE_TYPES: readonly VehicleType[] = ["小货车", "厢式车"];

/** 车辆装载限制：小货车 1800 公斤 / 8 托位，厢式车 3500 公斤 / 12 托位 */
export const VEHICLE_LIMITS: Record<VehicleType, { maxWeightKg: number; maxPositions: number }> = {
  小货车: { maxWeightKg: 1800, maxPositions: 8 },
  厢式车: { maxWeightKg: 3500, maxPositions: 12 }
};

/**
 * 报价状态流转：
 * 待调整（核价未过）→ 改货建版本；
 * 待确认（核价通过）→ 已确认（占车位）；
 * 已确认的报价被改货时，旧版本先退占位 → 已退占位。
 */
export const STATUSES = ["待调整", "待确认", "已确认", "已退占位"] as const;
export type QuoteStatus = (typeof STATUSES)[number];

/** 一项托盘货：托盘数、每托重量、是否可叠放（可叠货两托占一位） */
export interface PalletItem {
  id: string;
  name: string;
  pallets: number;
  weightPerPalletKg: number;
  stackable: boolean;
}

/** 一笔报价的一个版本；同一笔报价用 groupId 串起版本链 */
export interface Quote {
  id: string;
  groupId: string;
  version: number;
  vehicle: VehicleType;
  route: string;
  freightYuan: number;
  items: PalletItem[];
  status: QuoteStatus;
  /** 保存时的核价结果快照（结构见 pricing.ts 的 LoadCheck） */
  check: {
    totalWeightKg: number;
    usedPositions: number;
    maxWeightKg: number;
    maxPositions: number;
    overweightKg: number;
    shortPositions: number;
    ok: boolean;
    problems: string[];
  };
  note: string;
  createdAt: string;
}

export function createPalletItem(): PalletItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    pallets: 1,
    weightPerPalletKg: 0,
    stackable: false
  };
}
