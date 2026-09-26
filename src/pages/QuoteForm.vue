<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { PalletItem, QuoteInput, QuoteVersion, VehicleKind } from "../domain/types";
import { VEHICLE_LIST, VEHICLES } from "../domain/vehicles";
import { evaluateLoad } from "../pricing/loading";

export interface EditingTarget {
  quoteId: string;
  customer: string;
  /** 已确认的报价改货时提示：保存新版本将先退旧占位 */
  willRelease: boolean;
  initial: QuoteVersion;
}

const props = defineProps<{ editing: EditingTarget | null }>();
const emit = defineEmits<{
  submit: [input: QuoteInput];
  cancel: [];
}>();

function blankItem(): PalletItem {
  return { id: crypto.randomUUID(), name: "", pallets: 1, weightPerPalletKg: 0, stackable: false };
}

const customer = ref("");
const vehicle = ref<VehicleKind>("small");
const route = ref("");
const freight = ref(0);
const note = ref("");
const items = ref<PalletItem[]>([blankItem()]);

watch(
  () => props.editing,
  (editing) => {
    if (editing) {
      customer.value = editing.customer;
      vehicle.value = editing.initial.vehicle;
      route.value = editing.initial.route;
      freight.value = editing.initial.freight;
      note.value = "";
      items.value = editing.initial.items.map((item) => ({ ...item, id: crypto.randomUUID() }));
    } else {
      customer.value = "";
      vehicle.value = "small";
      route.value = "";
      freight.value = 0;
      note.value = "";
      items.value = [blankItem()];
    }
  },
  { immediate: true }
);

const preview = computed(() =>
  evaluateLoad({
    version: 0,
    vehicle: vehicle.value,
    route: route.value,
    freight: Number(freight.value) || 0,
    items: items.value,
    note: "",
    createdAt: "",
  })
);

function addItem() {
  items.value.push(blankItem());
}

function removeItem(id: string) {
  if (items.value.length === 1) return;
  items.value = items.value.filter((item) => item.id !== id);
}

function submit() {
  emit("submit", {
    customer: customer.value.trim(),
    vehicle: vehicle.value,
    route: route.value.trim(),
    freight: Number(freight.value) || 0,
    items: items.value.map((item) => ({
      ...item,
      pallets: Number(item.pallets) || 0,
      weightPerPalletKg: Number(item.weightPerPalletKg) || 0,
    })),
    note: note.value.trim(),
  });
  if (!props.editing) {
    customer.value = "";
    route.value = "";
    freight.value = 0;
    note.value = "";
    items.value = [blankItem()];
  }
}
</script>

<template>
  <form class="panel" @submit.prevent="submit">
    <h2>{{ editing ? `改货 · ${editing.customer}` : "新增报价" }}</h2>
    <p v-if="editing?.willRelease" class="hint warn">
      该报价已确认，保存新版本将先退旧占位，再按新货重新核价。
    </p>
    <div class="form-grid">
      <label v-if="!editing">
        客户名称
        <input v-model="customer" required placeholder="客户名称" />
      </label>
      <label>
        车型
        <select v-model="vehicle">
          <option v-for="spec in VEHICLE_LIST" :key="spec.kind" :value="spec.kind">
            {{ spec.label }}（限 {{ spec.maxWeightKg }} 公斤 / {{ spec.maxPositions }} 位）
          </option>
        </select>
      </label>
      <label>
        运输线路
        <input v-model="route" required placeholder="如 上海-南京" />
      </label>
      <label>
        运费（元）
        <input v-model.number="freight" type="number" min="0" step="1" required />
      </label>

      <fieldset class="items">
        <legend>托盘货</legend>
        <div v-for="item in items" :key="item.id" class="item-row">
          <input v-model="item.name" required placeholder="货物名称" />
          <div class="item-grid">
            <label>
              托盘数
              <input v-model.number="item.pallets" type="number" min="1" step="1" required />
            </label>
            <label>
              每托重量（公斤）
              <input v-model.number="item.weightPerPalletKg" type="number" min="1" step="1" required />
            </label>
          </div>
          <div class="item-foot">
            <label class="check">
              <input v-model="item.stackable" type="checkbox" />
              可叠放（两托占一位）
            </label>
            <button type="button" class="secondary" :disabled="items.length === 1" @click="removeItem(item.id)">
              移除
            </button>
          </div>
        </div>
        <button type="button" class="secondary" @click="addItem">添加托盘货</button>
      </fieldset>

      <div class="preview" :class="preview.fits ? 'ok' : 'bad'">
        <strong>
          核价预览 · {{ VEHICLES[vehicle].label }}：{{ preview.totalWeightKg }} / {{ preview.maxWeightKg }} 公斤，
          {{ preview.positionsUsed }} / {{ preview.maxPositions }} 位
        </strong>
        <span v-if="preview.fits">配载可行，保存后为「可配载」。</span>
        <span v-else>{{ preview.problems.join("；") }}，保存后为「待调整」。</span>
      </div>

      <label>
        备注
        <textarea v-model="note" placeholder="填写处理说明或现场备注" />
      </label>
      <button type="submit">{{ editing ? "保存新版本" : "核价并保存" }}</button>
      <button v-if="editing" type="button" class="secondary" @click="emit('cancel')">取消改货</button>
    </div>
  </form>
</template>
