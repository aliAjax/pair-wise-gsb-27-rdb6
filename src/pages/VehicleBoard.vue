<script setup lang="ts">
import { computed } from "vue";
import { useQuoteStore } from "../stores/quoteStore";

const store = useQuoteStore();
const board = computed(() => Object.values(store.occupancy));

function percent(used: number, limit: number) {
  return Math.min(100, Math.round((used / limit) * 100));
}
</script>

<template>
  <section class="board">
    <article v-for="slot in board" :key="slot.spec.kind" class="vehicle">
      <div class="vehicle-head">
        <strong>{{ slot.spec.label }}</strong>
        <span>{{ slot.quotes }} 笔已确认</span>
      </div>
      <div class="usage">
        <span>托位 {{ slot.positions }} / {{ slot.spec.maxPositions }}</span>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: `${percent(slot.positions, slot.spec.maxPositions)}%` }" />
        </div>
      </div>
      <div class="usage">
        <span>重量 {{ slot.weightKg }} / {{ slot.spec.maxWeightKg }} 公斤</span>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: `${percent(slot.weightKg, slot.spec.maxWeightKg)}%` }" />
        </div>
      </div>
    </article>
  </section>
</template>
