import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { Quote, QuoteInput, QuoteVersion, VehicleKind } from "../domain/types";
import { VEHICLES, type VehicleSpec } from "../domain/vehicles";
import { evaluateLoad, statusFor } from "../pricing/loading";
import { loadQuotes, saveQuotes } from "../storage/repository";

export interface OccupancySlot {
  spec: VehicleSpec;
  weightKg: number;
  positions: number;
  quotes: number;
}

export const useQuoteStore = defineStore("quotes", () => {
  const quotes = ref<Quote[]>(loadQuotes());

  function persist() {
    saveQuotes(quotes.value);
  }

  function currentVersion(quote: Quote): QuoteVersion {
    return quote.versions[quote.versions.length - 1];
  }

  /** 车辆占位看板：已确认报价占用的托位与重量 */
  const occupancy = computed<Record<VehicleKind, OccupancySlot>>(() => {
    const board: Record<VehicleKind, OccupancySlot> = {
      small: { spec: VEHICLES.small, weightKg: 0, positions: 0, quotes: 0 },
      box: { spec: VEHICLES.box, weightKg: 0, positions: 0, quotes: 0 },
    };
    for (const quote of quotes.value) {
      if (quote.status !== "已确认") continue;
      const version = currentVersion(quote);
      const result = evaluateLoad(version);
      const slot = board[version.vehicle];
      slot.weightKg += result.totalWeightKg;
      slot.positions += result.positionsUsed;
      slot.quotes += 1;
    }
    return board;
  });

  function toVersion(input: QuoteInput, version: number): QuoteVersion {
    return {
      version,
      vehicle: input.vehicle,
      route: input.route,
      freight: input.freight,
      items: input.items,
      note: input.note,
      createdAt: new Date().toISOString(),
    };
  }

  function addQuote(input: QuoteInput) {
    const version = toVersion(input, 1);
    quotes.value = [
      {
        id: crypto.randomUUID(),
        customer: input.customer,
        status: statusFor(version),
        versions: [version],
        createdAt: version.createdAt,
      },
      ...quotes.value,
    ];
    persist();
  }

  /** 改货另建版本，旧报价保留；确认过的修改先退旧占位，再按新货重新核价 */
  function reviseQuote(quoteId: string, input: QuoteInput) {
    const quote = quotes.value.find((item) => item.id === quoteId);
    if (!quote) return;
    const version = toVersion(input, quote.versions.length + 1);
    quote.versions.push(version);
    // 已确认的旧版本随状态重核自动退占位，等待新版本重新确认
    quote.status = statusFor(version);
    persist();
  }

  /** 确认占位：仅核价通过（可配载）的报价可确认 */
  function confirmQuote(quoteId: string) {
    const quote = quotes.value.find((item) => item.id === quoteId);
    if (!quote || quote.status !== "可配载") return;
    quote.status = "已确认";
    persist();
  }

  function removeQuote(quoteId: string) {
    quotes.value = quotes.value.filter((item) => item.id !== quoteId);
    persist();
  }

  return {
    quotes,
    occupancy,
    currentVersion,
    addQuote,
    reviseQuote,
    confirmQuote,
    removeQuote,
  };
});
