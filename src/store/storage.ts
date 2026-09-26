/**
 * 保存层：报价记录的本地持久化（localStorage）与初始种子数据。
 */
import type { PalletItem, Quote, QuoteStatus, VehicleType } from "../domain/quote";
import { checkLoad, statusFor } from "../domain/pricing";

const STORAGE_KEY = "hxwlfront-13-load-quotes";

function seedItem(name: string, pallets: number, weightPerPalletKg: number, stackable: boolean): PalletItem {
  return { id: crypto.randomUUID(), name, pallets, weightPerPalletKg, stackable };
}

function seedQuote(
  groupId: string,
  version: number,
  vehicle: VehicleType,
  route: string,
  freightYuan: number,
  items: PalletItem[],
  note: string,
  daysAgo: number,
  statusOverride?: QuoteStatus
): Quote {
  const check = checkLoad(vehicle, items);
  return {
    id: crypto.randomUUID(),
    groupId,
    version,
    vehicle,
    route,
    freightYuan,
    items,
    status: statusOverride ?? statusFor(check),
    check,
    note,
    createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString()
  };
}

function seedQuotes(): Quote[] {
  const shanghaiNanjing = "seed-group-1";
  return [
    // 同一笔报价的两个版本：V1 确认后改货退占位，V2 为当前已确认版本
    seedQuote(
      shanghaiNanjing,
      2,
      "厢式车",
      "上海-南京",
      3200,
      [seedItem("饮料整托", 8, 340, true), seedItem("纸箱杂货", 3, 250, false)],
      "V2：换厢式车、饮料改可叠放后核价通过",
      0,
      "已确认"
    ),
    seedQuote(
      shanghaiNanjing,
      1,
      "小货车",
      "上海-南京",
      2400,
      [seedItem("饮料整托", 8, 340, false)],
      "V1：小货车超重，已换厢式车",
      1,
      "已退占位"
    ),
    // 超重缺位、待调整的一笔
    seedQuote(
      "seed-group-2",
      1,
      "小货车",
      "杭州-合肥",
      1500,
      [seedItem("桶装原料", 6, 380, false), seedItem("袋装辅料", 4, 120, true)],
      "客户坚持小货车，待调整",
      2
    )
  ];
}

export function loadQuotes(): Quote[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedQuotes();
  try {
    return JSON.parse(raw) as Quote[];
  } catch {
    return [];
  }
}

export function saveQuotes(quotes: Quote[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
}
