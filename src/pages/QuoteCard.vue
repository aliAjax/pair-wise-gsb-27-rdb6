<script setup lang="ts">
import { computed, ref } from "vue";
import type { Quote, QuoteStatus, QuoteVersion } from "../domain/types";
import { VEHICLES } from "../domain/vehicles";
import { evaluateLoad, positionsFor } from "../pricing/loading";

const props = defineProps<{ quote: Quote }>();
const emit = defineEmits<{
  confirm: [];
  revise: [];
  remove: [];
}>();

const current = computed(() => props.quote.versions[props.quote.versions.length - 1]);
const result = computed(() => evaluateLoad(current.value));
const history = computed(() => props.quote.versions.slice(0, -1).reverse());
const showHistory = ref(false);

const STATUS_CLASS: Record<QuoteStatus, string> = {
  待调整: "warn",
  可配载: "ok",
  已确认: "done",
};

function timeText(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function versionSummary(version: QuoteVersion) {
  const load = evaluateLoad(version);
  return `${load.totalWeightKg} 公斤 · ${load.positionsUsed} 位`;
}
</script>

<template>
  <article class="record">
    <div class="record-head">
      <p class="record-title">{{ quote.customer }} / {{ current.route }}</p>
      <span class="status" :class="STATUS_CLASS[quote.status]">{{ quote.status }}</span>
    </div>
    <div class="details">
      <span>车型: {{ VEHICLES[current.vehicle].label }}</span>
      <span>运费: {{ current.freight }} 元</span>
      <span>总重: {{ result.totalWeightKg }} / {{ result.maxWeightKg }} 公斤</span>
      <span>托位: {{ result.positionsUsed }} / {{ result.maxPositions }} 位</span>
      <span>版本: v{{ current.version }}</span>
      <span>更新: {{ timeText(current.createdAt) }}</span>
    </div>

    <table class="items-table">
      <thead>
        <tr><th>货物</th><th>托盘数</th><th>每托公斤</th><th>叠放</th><th>占位</th></tr>
      </thead>
      <tbody>
        <tr v-for="item in current.items" :key="item.id">
          <td>{{ item.name }}</td>
          <td>{{ item.pallets }}</td>
          <td>{{ item.weightPerPalletKg }}</td>
          <td>{{ item.stackable ? "可叠" : "不可叠" }}</td>
          <td>{{ positionsFor(item) }} 位</td>
        </tr>
      </tbody>
    </table>

    <p v-if="result.fits" class="note ok">
      配载可行：{{ result.totalWeightKg }} 公斤、占 {{ result.positionsUsed }} 位，未超限。
    </p>
    <p v-else class="note warn">待调整：{{ result.problems.join("；") }}。</p>
    <p v-if="current.note" class="note">{{ current.note }}</p>

    <div class="actions">
      <button v-if="quote.status === '可配载'" type="button" @click="emit('confirm')">确认占位</button>
      <button type="button" class="secondary" @click="emit('revise')">改货（新版本）</button>
      <button v-if="history.length" type="button" class="secondary" @click="showHistory = !showHistory">
        {{ showHistory ? "收起旧报价" : `旧报价（${history.length}）` }}
      </button>
      <button type="button" class="danger" @click="emit('remove')">删除</button>
    </div>

    <div v-if="showHistory" class="history">
      <div v-for="version in history" :key="version.version" class="history-item">
        <strong>v{{ version.version }} · {{ timeText(version.createdAt) }}</strong>
        <span>
          {{ VEHICLES[version.vehicle].label }} · {{ version.route }} · 运费 {{ version.freight }} 元 ·
          {{ versionSummary(version) }}
        </span>
        <span v-if="version.note">{{ version.note }}</span>
      </div>
    </div>
  </article>
</template>
