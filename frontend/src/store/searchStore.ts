/**
 * Global search store — keeps last search results in memory
 * so the Perfect Product page can access them without re-fetching.
 */
import { create } from 'zustand'
import type { ProductResult, SearchResponse, PerfectProductResponse } from '@/lib/types'

interface SearchState {
  lastResponse: SearchResponse | null
  visibleResults: ProductResult[]
  purchasePrice: number | null
  perfectProductResult: (PerfectProductResponse & { _resultIds?: string }) | null
  setResponse: (r: SearchResponse) => void
  removeResult: (id: number) => void
  setPurchasePrice: (p: number | null) => void
  setPerfectProductResult: (r: (PerfectProductResponse & { _resultIds?: string }) | null) => void
  clear: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  lastResponse: null,
  visibleResults: [],
  purchasePrice: null,
  perfectProductResult: null,

  setResponse: (r) =>
    set({ lastResponse: r, visibleResults: r.search.results }),

  removeResult: (id) =>
    set((s) => ({ visibleResults: s.visibleResults.filter((r) => r.id !== id) })),

  setPurchasePrice: (p) => set({ purchasePrice: p }),

  setPerfectProductResult: (r) => set({ perfectProductResult: r }),

  clear: () => set({ lastResponse: null, visibleResults: [], purchasePrice: null, perfectProductResult: null }),
}))
