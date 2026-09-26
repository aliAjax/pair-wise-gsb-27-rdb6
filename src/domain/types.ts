export type VehicleKind = "small" | "box";

export type QuoteStatus = "待调整" | "可配载" | "已确认";

/** 托盘货：每项记托盘数、每托重量和是否可叠放 */
export interface PalletItem {
  id: string;
  name: string;
  pallets: number;
  weightPerPalletKg: number;
  stackable: boolean;
}

/** 报价版本：改货另建版本，旧版本保留在 versions 里 */
export interface QuoteVersion {
  version: number;
  vehicle: VehicleKind;
  route: string;
  freight: number;
  items: PalletItem[];
  note: string;
  createdAt: string;
}

export interface Quote {
  id: string;
  customer: string;
  status: QuoteStatus;
  versions: QuoteVersion[];
  createdAt: string;
}

/** 表单提交的报价内容（新增与改货共用） */
export interface QuoteInput {
  customer: string;
  vehicle: VehicleKind;
  route: string;
  freight: number;
  items: PalletItem[];
  note: string;
}
