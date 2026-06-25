import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Search, X, ExternalLink, TrendingUp, Sparkles, Info, ArrowUpDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { api } from '@/lib/api'
import { useSearchStore } from '@/store/searchStore'
import { SUPPORTED_MARKETPLACES } from '@/lib/types'
import type { ProductResult, SearchResponse } from '@/lib/types'
import AppLayout from '@/components/layout/AppLayout'

const formatBRL = (v: number | null) =>
  v == null
    ? '—'
    : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function SearchPage() {
  const navigate = useNavigate()
  const { setResponse, removeResult, visibleResults, lastResponse, setPurchasePrice } =
    useSearchStore()

  const [query, setQuery] = useState('')
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(['mercadolivre'])
  const [maxResults, setMaxResults] = useState(10)
  const [strictFilter, setStrictFilter] = useState(true)
  const [purchaseInput, setPurchaseInput] = useState('')
  const [sortBy, setSortBy] = useState<string>('price_asc')
  const [minPriceInput, setMinPriceInput] = useState('')
  const [maxPriceInput, setMaxPriceInput] = useState('')

  const analysis = lastResponse?.analysis

  const searchMutation = useMutation({
    mutationFn: async () => {
      const pp = purchaseInput ? parseFloat(purchaseInput) : null
      setPurchasePrice(pp)
      const { data } = await api.post<SearchResponse>('/search/', {
        query,
        marketplaces: selectedMarkets,
        max_results: maxResults,
        purchase_price: pp,
        strict_filter: strictFilter,
        sort_by: sortBy || null,
        min_price: minPriceInput ? parseFloat(minPriceInput) : null,
        max_price: maxPriceInput ? parseFloat(maxPriceInput) : null,
      })
      return data
    },
    onSuccess: (data) => {
      setResponse(data)
      try {
        localStorage.setItem('last-search', JSON.stringify({
          response: data,
          visibleResults: data.search.results,
          purchasePrice: purchaseInput ? parseFloat(purchaseInput) : null,
          sortBy,
          minPrice: minPriceInput,
          maxPrice: maxPriceInput,
        }))
      } catch {}
    },
  })

  const toggleMarket = (id: string) =>
    setSelectedMarkets((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )

  useEffect(() => {
    try {
      const saved = localStorage.getItem('last-search')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.response) setResponse(parsed.response)
        if (parsed.purchasePrice != null) {
          setPurchasePrice(parsed.purchasePrice)
          setPurchaseInput(String(parsed.purchasePrice))
        }
        if (parsed.sortBy) setSortBy(parsed.sortBy)
        if (parsed.minPrice) setMinPriceInput(parsed.minPrice)
        if (parsed.maxPrice) setMaxPriceInput(parsed.maxPrice)
      }
    } catch {}
  }, [])

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Search card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">

          {/* Search bar row */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Ex: Samsung Galaxy A15 128GB"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchMutation.mutate()}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300
                           focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm"
              />
            </div>
            <input
              type="number" min={1} max={20}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-16 px-2 py-2.5 rounded-xl border border-gray-300 text-sm
                         text-center focus:outline-none focus:ring-2 focus:ring-brand-400"
              title="Máx. resultados"
            />
            <button
              onClick={() => searchMutation.mutate()}
              disabled={!query || selectedMarkets.length === 0 || searchMutation.isPending}
              className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold
                         hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {searchMutation.isPending ? 'Buscando…' : 'Buscar'}
            </button>
          </div>

          {/* Marketplace pills */}
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_MARKETPLACES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => toggleMarket(id)}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                  selectedMarkets.includes(id)
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Options row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Price range */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">Preço</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
                <input
                  type="number" min={0} step={0.01}
                  placeholder="Mín"
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                  className="w-24 pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <span className="text-xs text-gray-400">—</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
                <input
                  type="number" min={0} step={0.01}
                  placeholder="Máx"
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                  className="w-24 pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>

            {/* Purchase price */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">Custo</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
                <input
                  type="number" min={0} step={0.01}
                  placeholder="0,00"
                  value={purchaseInput}
                  onChange={(e) => setPurchaseInput(e.target.value)}
                  className="w-28 pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={14} className="text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1.5
                           focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
              >
                <option value="price_asc">Menor preço</option>
                <option value="price_desc">Maior preço</option>
                <option value="rating_desc">Melhor avaliação</option>
              </select>
            </div>

            {/* Strict filter toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setStrictFilter((v) => !v)}
                className={clsx(
                  'w-9 h-5 rounded-full transition-colors relative',
                  strictFilter ? 'bg-brand-600' : 'bg-gray-300'
                )}
              >
                <span className={clsx(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  strictFilter ? 'translate-x-4' : 'translate-x-0.5'
                )} />
              </div>
              <span className="text-xs text-gray-600">Filtro estrito</span>
            </label>
          </div>

          {/* Strict filter tip */}
          {strictFilter && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <Info size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Buscas mais específicas geram melhores resultados. Com o filtro ativo, apenas produtos que contenham todas as palavras da busca serão exibidos.
              </p>
            </div>
          )}

          {searchMutation.isError && (
            <p className="text-red-500 text-sm">Erro na busca. Verifique o servidor.</p>
          )}
        </div>

        {/* Filtered notice */}
        {lastResponse && lastResponse.filtered_count > 0 && (
          <p className="text-xs text-gray-400 text-center">
            {lastResponse.filtered_count} resultado(s) removido(s) pelo filtro estrito.
          </p>
        )}

        {lastResponse && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Results list */}
            <div className="lg:col-span-2 space-y-3">
              <p className="text-sm text-gray-500">
                {visibleResults.length} resultado(s) — clique no ✕ para remover
              </p>

              {(() => {
                const minP = minPriceInput ? parseFloat(minPriceInput) : null
                const maxP = maxPriceInput ? parseFloat(maxPriceInput) : null
                let filtered = visibleResults
                if (minP != null) filtered = filtered.filter(r => r.price_brl != null && r.price_brl >= minP)
                if (maxP != null) filtered = filtered.filter(r => r.price_brl != null && r.price_brl <= maxP)
                const sorted = [...filtered].sort((a, b) => {
                  if (sortBy === 'price_asc') return (a.price_brl ?? Infinity) - (b.price_brl ?? Infinity)
                  if (sortBy === 'price_desc') return (b.price_brl ?? 0) - (a.price_brl ?? 0)
                  if (sortBy === 'rating_desc') return parseFloat(b.rating || '0') - parseFloat(a.rating || '0')
                  return 0
                })
                return sorted.map((item) => (
                  <ResultCard key={item.id} item={item} onRemove={removeResult} />
                ))
              })()}

              {/* Generate Perfect Product button */}
              {visibleResults.length > 0 && (
                <button
                  onClick={() => navigate('/produto-perfeito')}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl
                             bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold
                             text-sm hover:from-brand-700 hover:to-brand-600 transition-all shadow-sm"
                >
                  <Sparkles size={16} />
                  Gerar Produto Perfeito
                </button>
              )}
            </div>

            {/* Price analysis panel */}
            {analysis && analysis.count > 0 && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={15} className="text-brand-600" />
                    <h2 className="text-sm font-semibold text-gray-800">Análise de Preços</h2>
                  </div>

                  <StatRow label="Mínimo"    value={formatBRL(analysis.min_price)} />
                  <StatRow label="Máximo"    value={formatBRL(analysis.max_price)} />
                  <StatRow label="Média"     value={formatBRL(analysis.mean_price)} />
                  <StatRow label="Mediana"   value={formatBRL(analysis.median_price)} />
                  <StatRow label="Média IQR" value={formatBRL(analysis.iqr_mean)} highlight />
                  <StatRow label="Piso competitivo" value={formatBRL(analysis.competitive_floor)} />

                  <hr className="border-gray-100" />

                  {/* Viability indicator */}
                  {analysis.purchase_price != null && (
                    <>
                      <hr className="border-gray-100" />
                      <StatRow
                        label="Preço de compra"
                        value={formatBRL(analysis.purchase_price)}
                      />
                      {analysis.minimum_viable_price != null && (
                        <StatRow
                          label="Preço mínimo viável"
                          value={formatBRL(analysis.minimum_viable_price)}
                        />
                      )}
                      {analysis.is_viable != null && (
                        <div className={clsx(
                          'rounded-lg px-3 py-2 text-xs font-semibold text-center',
                          analysis.is_viable
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        )}>
                          {analysis.is_viable
                            ? '✓ Venda viável neste marketplace'
                            : '✗ Venda inviável — preço de mercado abaixo do mínimo'}
                        </div>
                      )}
                    </>
                  )}

                  <p className="text-xs text-gray-400">
                    Baseado em {analysis.count} produto(s) com preço válido.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function ResultCard({
  item, onRemove,
}: {
  item: ProductResult
  onRemove: (id: number) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4
                    items-start shadow-sm hover:shadow-md transition-shadow">
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.title}
          className="w-14 h-14 object-contain rounded-lg border border-gray-100 flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          <span className="text-brand-600 font-bold text-sm">
            {item.price_brl != null
              ? item.price_brl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : item.price_raw ?? '—'}
          </span>
          <span className="text-xs text-gray-400">{item.marketplace}</span>
          <span className="text-xs text-gray-400">{item.condition}</span>
          {item.rating && <span className="text-xs text-gray-400">★ {item.rating}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-300 hover:text-brand-600 transition-colors"
        >
          <ExternalLink size={14} />
        </a>
        <button
          onClick={() => onRemove(item.id)}
          className="text-gray-300 hover:text-red-500 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

function StatRow({
  label, value, highlight,
}: {
  label: string; value: string; highlight?: boolean
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={clsx(
        'text-sm font-semibold',
        highlight ? 'text-brand-600' : 'text-gray-800'
      )}>
        {value}
      </span>
    </div>
  )
}
