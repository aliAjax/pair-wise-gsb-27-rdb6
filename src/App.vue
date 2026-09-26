<script setup lang="ts">
/**
 * 页面层：配载核价台界面。
 * 资料见 domain/quote.ts，核价见 domain/pricing.ts，保存见 store/storage.ts。
 */
import { computed, reactive, ref } from "vue";
import {
  STATUSES,
  VEHICLE_LIMITS,
  VEHICLE_TYPES,
  createPalletItem,
  type PalletItem,
  type Quote,
  type QuoteStatus,
  type VehicleType
} from "./domain/quote";
import { checkLoad, statusFor } from "./domain/pricing";
import { loadQuotes, saveQuotes } from "./store/storage";

const project = {
  title: "零担配载核价台",
  subtitle: "按车型限制核价：小货车限 1800 公斤 / 8 托位，厢式车限 3500 公斤 / 12 托位，可叠货两托占一位。超重或缺位的报价先待调整，改货另建版本，旧报价保留。",
  industry: "物流",
  stack: ["Vue3", "Vite", "TypeScript", "Pinia", "Element Plus"],
  metricLabels: ["报价笔数", "已确认占位", "待调整"]
} as const;

const quotes = ref<Quote[]>(loadQuotes());

// ---------- 表单（新增 / 改货建版本共用） ----------
const form = reactive({
  vehicle: "小货车" as VehicleType,
  route: "",
  freightYuan: 0,
  items: [createPalletItem()] as PalletItem[],
  note: ""
});

/** 改货模式：记录正在修改的报价组与基准版本号 */
const editing = ref<{ groupId: string; baseVersion: number } | null>(null);

const vehicleLimit = computed(() => VEHICLE_LIMITS[form.vehicle]);

/** 表单内容实时核价，装车前就发现超重缺位 */
const liveCheck = computed(() => checkLoad(form.vehicle, form.items));

const canSubmit = computed(() => {
  if (!form.route.trim()) return false;
  if (form.freightYuan < 0) return false;
  if (form.items.length === 0) return false;
  return form.items.every((item) => item.pallets >= 1 && item.weightPerPalletKg > 0);
});

const submitText = computed(() =>
  editing.value ? `保存为 V${editing.value.baseVersion + 1} 新版本` : "核价并保存"
);

function addItem() {
  form.items.push(createPalletItem());
}

function removeItem(id: string) {
  form.items = form.items.filter((item) => item.id !== id);
}

function resetForm() {
  form.vehicle = "小货车";
  form.route = "";
  form.freightYuan = 0;
  form.items = [createPalletItem()];
  form.note = "";
  editing.value = null;
}

function persist() {
  saveQuotes(quotes.value);
}

function submit() {
  if (!canSubmit.value) return;
  const items = form.items.map((item) => ({ ...item, id: crypto.randomUUID() }));
  const check = checkLoad(form.vehicle, items);
  const base = {
    vehicle: form.vehicle,
    route: form.route.trim(),
    freightYuan: form.freightYuan,
    items,
    check,
    status: statusFor(check),
    note: form.note.trim() || "暂无备注",
    createdAt: new Date().toISOString()
  };

  if (editing.value) {
    // 改货：确认过的旧版本先退占位，再另建新版本，旧报价保留
    const { groupId, baseVersion } = editing.value;
    quotes.value = quotes.value.map((quote) =>
      quote.groupId === groupId && quote.status === "已确认"
        ? { ...quote, status: "已退占位" as QuoteStatus }
        : quote
    );
    quotes.value = [
      { ...base, id: crypto.randomUUID(), groupId, version: baseVersion + 1 },
      ...quotes.value
    ];
  } else {
    quotes.value = [
      { ...base, id: crypto.randomUUID(), groupId: crypto.randomUUID(), version: 1 },
      ...quotes.value
    ];
  }
  persist();
  resetForm();
}

// ---------- 版本分组 ----------
type QuoteGroup = { groupId: string; latest: Quote; history: Quote[] };

const groups = computed<QuoteGroup[]>(() => {
  const byGroup = new Map<string, Quote[]>();
  for (const quote of quotes.value) {
    const list = byGroup.get(quote.groupId) ?? [];
    list.push(quote);
    byGroup.set(quote.groupId, list);
  }
  return [...byGroup.entries()]
    .map(([groupId, versions]) => {
      const sorted = [...versions].sort((a, b) => b.version - a.version);
      return { groupId, latest: sorted[0], history: sorted.slice(1) };
    })
    .sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt));
});

const filter = ref<(typeof STATUSES)[number] | "全部状态">("全部状态");

const filteredGroups = computed(() => {
  if (filter.value === "全部状态") return groups.value;
  return groups.value.filter((group) => group.latest.status === filter.value);
});

const metrics = computed(() => {
  const confirmed = groups.value.filter((group) => group.latest.status === "已确认").length;
  const adjusting = groups.value.filter((group) => group.latest.status === "待调整").length;
  return [groups.value.length, confirmed, adjusting];
});

const chartRows = computed(() =>
  STATUSES.map((status) => ({
    status,
    value: groups.value.filter((group) => group.latest.status === status).length
  }))
);

const maxChart = computed(() => Math.max(1, ...chartRows.value.map((row) => row.value)));

// ---------- 列表操作 ----------
function confirmQuote(quote: Quote) {
  if (quote.status !== "待确认" || !quote.check.ok) return;
  quote.status = "已确认";
  persist();
}

function startEdit(group: QuoteGroup) {
  const { latest } = group;
  form.vehicle = latest.vehicle;
  form.route = latest.route;
  form.freightYuan = latest.freightYuan;
  form.items = latest.items.map((item) => ({ ...item, id: crypto.randomUUID() }));
  form.note = latest.note === "暂无备注" ? "" : latest.note;
  editing.value = { groupId: group.groupId, baseVersion: latest.version };
}

function removeGroup(groupId: string) {
  quotes.value = quotes.value.filter((quote) => quote.groupId !== groupId);
  if (editing.value?.groupId === groupId) resetForm();
  persist();
}

function statusClass(status: QuoteStatus) {
  return {
    待调整: "status status-warn",
    待确认: "status status-info",
    已确认: "status status-ok",
    已退占位: "status status-muted"
  }[status];
}

function itemSummary(quote: Quote) {
  return quote.items
    .map((item) => `${item.name || "未命名"} ${item.pallets}托×${item.weightPerPalletKg}公斤${item.stackable ? "（可叠）" : ""}`)
    .join("；");
}
</script>

<template>
  <main class="app">
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">{{ project.industry }}行业前端最小闭环</p>
          <h1>{{ project.title }}</h1>
          <p class="subtitle">{{ project.subtitle }}</p>
        </div>
        <div class="stack">
          <span v-for="item in project.stack" :key="item" class="tag">{{ item }}</span>
        </div>
      </header>

      <section class="metrics">
        <article v-for="(label, index) in project.metricLabels" :key="label" class="metric">
          <span>{{ label }}</span>
          <strong>{{ metrics[index] }}</strong>
        </article>
      </section>

      <section class="workspace">
        <form class="panel" @submit.prevent="submit">
          <h2>{{ editing ? `改货（基于 V${editing.baseVersion}）` : "新增报价" }}</h2>
          <div class="form-grid">
            <label>
              车型
              <select v-model="form.vehicle">
                <option v-for="type in VEHICLE_TYPES" :key="type" :value="type">{{ type }}</option>
              </select>
            </label>
            <p class="limit-hint">
              {{ form.vehicle }}限重 {{ vehicleLimit.maxWeightKg }} 公斤、{{ vehicleLimit.maxPositions }} 个托位，可叠货两托占一位
            </p>
            <label>
              运输线路
              <input v-model="form.route" type="text" placeholder="如：上海-南京" required />
            </label>
            <label>
              运费（元）
              <input v-model.number="form.freightYuan" type="number" min="0" step="1" required />
            </label>

            <div class="items-editor">
              <div class="items-head">
                <span>托盘货明细</span>
                <button type="button" class="secondary" @click="addItem">添加托盘货</button>
              </div>
              <div v-for="(item, index) in form.items" :key="item.id" class="item-row">
                <label>
                  货物名称
                  <input v-model="item.name" type="text" placeholder="如：饮料整托" />
                </label>
                <label>
                  托盘数
                  <input v-model.number="item.pallets" type="number" min="1" step="1" required />
                </label>
                <label>
                  每托重量（公斤）
                  <input v-model.number="item.weightPerPalletKg" type="number" min="1" step="1" required />
                </label>
                <label class="checkbox">
                  <input v-model="item.stackable" type="checkbox" />
                  可叠放
                </label>
                <button
                  type="button"
                  class="danger"
                  :disabled="form.items.length <= 1"
                  @click="removeItem(item.id)"
                >
                  移除
                </button>
                <span class="item-index">第 {{ index + 1 }} 项</span>
              </div>
            </div>

            <div class="check-box" :class="liveCheck.ok ? 'check-ok' : 'check-bad'">
              <p>
                实时核价：总重 {{ liveCheck.totalWeightKg }} / {{ liveCheck.maxWeightKg }} 公斤，
                占位 {{ liveCheck.usedPositions }} / {{ liveCheck.maxPositions }} 位
              </p>
              <p v-if="liveCheck.ok" class="check-ok-text">装载可行，可保存为待确认报价</p>
              <ul v-else class="problems">
                <li v-for="problem in liveCheck.problems" :key="problem">{{ problem }}，保存后为待调整</li>
              </ul>
            </div>

            <label>
              备注
              <textarea v-model="form.note" placeholder="填写处理说明或现场备注" />
            </label>
            <div class="form-actions">
              <button type="submit" :disabled="!canSubmit">{{ submitText }}</button>
              <button v-if="editing" type="button" class="secondary" @click="resetForm">取消改货</button>
            </div>
          </div>
        </form>

        <section class="list-panel">
          <div class="toolbar">
            <h2>报价列表</h2>
            <select v-model="filter">
              <option>全部状态</option>
              <option v-for="status in STATUSES" :key="status">{{ status }}</option>
            </select>
          </div>

          <div class="record-grid">
            <div v-if="filteredGroups.length === 0" class="empty">暂无匹配数据</div>
            <article v-for="group in filteredGroups" :key="group.groupId" class="record">
              <div class="record-head">
                <p class="record-title">
                  {{ group.latest.route }} / {{ group.latest.vehicle }}
                  <span class="version">V{{ group.latest.version }}</span>
                </p>
                <span :class="statusClass(group.latest.status)">{{ group.latest.status }}</span>
              </div>
              <div class="details">
                <span>运费: {{ group.latest.freightYuan }} 元</span>
                <span>总重: {{ group.latest.check.totalWeightKg }} / {{ group.latest.check.maxWeightKg }} 公斤</span>
                <span>占位: {{ group.latest.check.usedPositions }} / {{ group.latest.check.maxPositions }} 位</span>
                <span>托盘货: {{ group.latest.items.length }} 项</span>
              </div>
              <ul v-if="group.latest.check.problems.length" class="problems">
                <li v-for="problem in group.latest.check.problems" :key="problem">{{ problem }}</li>
              </ul>
              <p class="items-summary">{{ itemSummary(group.latest) }}</p>
              <p class="note">{{ group.latest.note }}</p>

              <details v-if="group.history.length" class="history">
                <summary>历史版本（{{ group.history.length }}）</summary>
                <div v-for="old in group.history" :key="old.id" class="history-row">
                  <span class="version">V{{ old.version }}</span>
                  <span :class="statusClass(old.status)">{{ old.status }}</span>
                  <span>{{ old.vehicle }} · {{ old.check.totalWeightKg }} 公斤 · {{ old.check.usedPositions }} 位 · {{ old.freightYuan }} 元</span>
                </div>
              </details>

              <div class="actions">
                <button
                  type="button"
                  :disabled="group.latest.status !== '待确认'"
                  @click="confirmQuote(group.latest)"
                >
                  确认占位
                </button>
                <button type="button" class="secondary" @click="startEdit(group)">改货（新版本）</button>
                <button type="button" class="danger" @click="removeGroup(group.groupId)">删除整笔</button>
              </div>
            </article>
          </div>

          <div class="mini-chart">
            <div v-for="row in chartRows" :key="row.status" class="bar">
              <span>{{ row.status }}</span>
              <div class="bar-track"><div class="bar-fill" :style="{ width: `${(row.value / maxChart) * 100}%` }" /></div>
              <strong>{{ row.value }}</strong>
            </div>
          </div>
        </section>
      </section>
    </div>
  </main>
</template>
