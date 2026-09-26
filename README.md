# 零担配载核价台

- 行业：物流
- 技术栈：Vue3、Vite、TypeScript、Pinia、Element Plus
- 启动：`npm install && npm run dev`
- 构建：`npm run build`

按车型限制核价的零担报价工具：每笔报价选小货车（限 1800 公斤 / 8 托位）或厢式车（限 3500 公斤 / 12 托位），填线路、运费和托盘货明细（托盘数、每托重量、是否可叠放，可叠货两托占一位）。超重或缺位的报价标为待调整并写明超出数量；改货另建版本、旧报价保留，已确认的版本被修改时先退旧占位。

代码分层：

- `src/domain/quote.ts`：资料（车型限制、状态、数据结构）
- `src/domain/pricing.ts`：核价（装载试算与超限提示）
- `src/store/storage.ts`：保存（localStorage 持久化与种子数据）
- `src/App.vue`：页面（录单、实时核价、版本列表）

数据默认保存在浏览器 localStorage 中，方便后续扩展接口、权限、图表或地图能力。
