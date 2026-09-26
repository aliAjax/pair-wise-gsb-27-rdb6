import type { Quote } from "../domain/types";
import { seedQuotes } from "../domain/seed";

const STORAGE_KEY = "hxwlfront-13-load-quotes";

export function loadQuotes(): Quote[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedQuotes();
  try {
    return JSON.parse(raw) as Quote[];
  } catch {
    return seedQuotes();
  }
}

export function saveQuotes(quotes: Quote[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
}
