<script setup lang="ts">
import { computed, ref } from "vue";
import type { QuoteInput, QuoteStatus } from "./domain/types";
import { useQuoteStore } from "./stores/quoteStore";
import QuoteForm, { type EditingTarget } from "./pages/QuoteForm.vue";
import QuoteCard from "./pages/QuoteCard.vue";
import VehicleBoard from "./pages/VehicleBoard.vue";

const project = {
  title: "零担配载核价台",
  subtitle:
    "按车型限重与托位核价：小货车限 1800 公斤 / 8 位，厢式车限 3500 公斤 / 12 位，可叠放货物两托占一位。超重或缺位的报价标记待调整，改货另建版本、旧报价保留。",
  industry: "物流",
  stack: ["Vue3", "Vite", "TypeScript", "Pinia", "Element Plus"],
} as const;

const STATUSES: QuoteStatus[] = ["待调整", "可配载", "已确认"];

const store = useQuoteStore();
const editing = ref<EditingTarget | null>(null);
const statusFilter = ref<"全部" | QuoteStatus>("全部");

const metrics = computed(() => [
  { label: "报价单数", value: store.quotes.length },
  { label: "待调整", value: store.quotes.filter((quote) => quote.status === "待调整").length },
  { label: "已确认", value: store.quotes.filter((quote) => quote.status === "已确认").length },
]);

const filteredQuotes = computed(() =>
  statusFilter.value === "全部"
    ? store.quotes
    : store.quotes.filter((quote) => quote.status === statusFilter.value)
);

const chartRows = computed(() =>
  STATUSES.map((status) => ({
    status,
    value: store.quotes.filter((quote) => quote.status === status).length,
  }))
);

const maxChart = computed(() => Math.max(1, ...chartRows.value.map((row) => row.value)));

function submit(input: QuoteInput) {
  if (editing.value) {
    // 改货另建版本；已确认的报价先退旧占位，再按新货重新核价
    store.reviseQuote(editing.value.quoteId, input);
    editing.value = null;
  } else {
    store.addQuote(input);
  }
}

function startRevise(quoteId: string) {
  const quote = store.quotes.find((item) => item.id === quoteId);
  if (!quote) return;
  editing.value = {
    quoteId: quote.id,
    customer: quote.customer,
    willRelease: quote.status === "已确认",
    initial: store.currentVersion(quote),
  };
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
        <article v-for="metric in metrics" :key="metric.label" class="metric">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </article>
      </section>

      <section class="workspace">
        <QuoteForm :editing="editing" @submit="submit" @cancel="editing = null" />

        <section class="list-panel">
          <div class="toolbar">
            <h2>报价列表</h2>
            <select v-model="statusFilter">
              <option>全部</option>
              <option v-for="status in STATUSES" :key="status">{{ status }}</option>
            </select>
          </div>

          <VehicleBoard />

          <div class="record-grid">
            <div v-if="filteredQuotes.length === 0" class="empty">暂无匹配报价</div>
            <QuoteCard
              v-for="quote in filteredQuotes"
              :key="quote.id"
              :quote="quote"
              @confirm="store.confirmQuote(quote.id)"
              @revise="startRevise(quote.id)"
              @remove="store.removeQuote(quote.id)"
            />
          </div>

          <div class="mini-chart">
            <div v-for="row in chartRows" :key="row.status" class="bar">
              <span>{{ row.status }}</span>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: `${(row.value / maxChart) * 100}%` }" />
              </div>
              <strong>{{ row.value }}</strong>
            </div>
          </div>
        </section>
      </section>
    </div>
  </main>
</template>
