/**
 * Global search store — keeps last search results in memory
 * so the Perfect Product page can access them without re-fetching.
 */
import { create } from 'zustand'
import type { ProductResult, SearchResponse, PerfectProductResponse } from '@/lib/types'

export type PriceMode = 'iniciante' | 'intermediario' | 'avancado'

interface PricingConfig {
  purchasePrice: number | null
  priceMode: PriceMode
  customMarkup: number
}

interface SearchState {
  lastResponse: SearchResponse | null
  visibleResults: ProductResult[]
  hiddenResults: number[]
  purchasePrice: number | null
  pricingConfig: PricingConfig
  perfectProductResult: (PerfectProductResponse & { _resultIds?: string }) | null
  setResponse: (r: SearchResponse) => void
  removeResult: (id: number) => void
  hideResult: (id: number) => void
  unhideResult: (id: number) => void
  setPurchasePrice: (p: number | null) => void
  setPricingConfig: (c: Partial<PricingConfig>) => void
  setPerfectProductResult: (r: (PerfectProductResponse & { _resultIds?: string }) | null) => void
  clear: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  lastResponse: null,
  visibleResults: [],
  hiddenResults: [],
  purchasePrice: null,
  pricingConfig: {
    purchasePrice: null,
    priceMode: 'iniciante',
    customMarkup: 20,
  },
  perfectProductResult: null,

  setResponse: (r) =>
    set({ lastResponse: r, visibleResults: r.search.results, hiddenResults: [] }),

  removeResult: (id) =>
    set((s) => ({
      visibleResults: s.visibleResults.filter((r) => r.id !== id),
      hiddenResults: s.hiddenResults.filter((hid) => hid !== id),
    })),

  hideResult: (id) =>
    set((s) => {
      if (s.hiddenResults.includes(id)) return s
      return { hiddenResults: [...s.hiddenResults, id] }
    }),

  unhideResult: (id) =>
    set((s) => ({ hiddenResults: s.hiddenResults.filter((hid) => hid !== id) })),

  setPurchasePrice: (p) => set({ purchasePrice: p }),

  setPricingConfig: (c) =>
    set((s) => ({ pricingConfig: { ...s.pricingConfig, ...c } })),

  setPerfectProductResult: (r) => set({ perfectProductResult: r }),

  clear: () => set({
    lastResponse: null,
    visibleResults: [],
    hiddenResults: [],
    purchasePrice: null,
    pricingConfig: { purchasePrice: null, priceMode: 'iniciante', customMarkup: 20 },
    perfectProductResult: null,
  }),
}))
