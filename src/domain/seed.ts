import type { Quote } from "./types";

/** 首次打开时的示例资料 */
export function seedQuotes(): Quote[] {
  const now = Date.now();
  return [
    {
      id: "seed-1",
      customer: "海沃商贸",
      status: "已确认",
      createdAt: new Date(now - 2 * 86400000).toISOString(),
      versions: [
        {
          version: 1,
          vehicle: "small",
          route: "上海-南京",
          freight: 1260,
          items: [
            { id: "seed-1-a", name: "五金配件", pallets: 4, weightPerPalletKg: 320, stackable: false },
          ],
          note: "首版报价",
          createdAt: new Date(now - 2 * 86400000).toISOString(),
        },
        {
          version: 2,
          vehicle: "small",
          route: "上海-南京",
          freight: 1380,
          items: [
            { id: "seed-1-b", name: "五金配件", pallets: 4, weightPerPalletKg: 300, stackable: true },
          ],
          note: "改货：改为可叠放，两托占一位",
          createdAt: new Date(now - 86400000).toISOString(),
        },
      ],
    },
    {
      id: "seed-2",
      customer: "云仓食品",
      status: "待调整",
      createdAt: new Date(now - 86400000).toISOString(),
      versions: [
        {
          version: 1,
          vehicle: "small",
          route: "杭州-合肥",
          freight: 980,
          items: [
            { id: "seed-2-a", name: "冷冻点心", pallets: 6, weightPerPalletKg: 350, stackable: false },
          ],
          note: "装车前发现超重，待调整",
          createdAt: new Date(now - 86400000).toISOString(),
        },
      ],
    },
  ];
}
