import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Sparkles, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Info, Image } from 'lucide-react'
import { clsx } from 'clsx'
import { api } from '@/lib/api'
import { useSearchStore } from '@/store/searchStore'
import type { PriceMode } from '@/store/searchStore'
import { useCostsStore } from '@/store/costsStore'
import type { PerfectProductResponse, MarketplaceAnalysis } from '@/lib/types'
import AppLayout from '@/components/layout/AppLayout'
import MarketplaceBadge from '@/components/ui/MarketplaceBadge'
import CostsPanel from '@/components/ui/CostsPanel'

const formatBRL = (v: number | null | undefined) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const PRICE_MODES: { key: PriceMode; label: string; desc: string }[] = [
  {
    key: 'iniciante',
    label: 'Iniciante',
    desc: 'Lucro mínimo (0%). Ideal para quem está começando e quer validar o mercado com o menor preço viável. Se o preço médio ficar 2% acima ou abaixo do custo, o markup é ajustado para 5%.',
  },
  {
    key: 'intermediario',
    label: 'Intermediário',
    desc: 'Preço médio de mercado (IQR). Posicionamento equilibrado entre competitividade e margem, recomendado para vendedores com alguma experiência.',
  },
  {
    key: 'avancado',
    label: 'Avançado',
    desc: 'Você define o markup desejado sobre os custos. Indicado para quem já domina o mercado e quer maximizar a margem de lucro.',
  },
]

export default function PerfectProductPage() {
  const {
    visibleResults, lastResponse, perfectProductResult,
    setPerfectProductResult, hiddenResults, pricingConfig, setPricingConfig,
  } = useSearchStore()
  const { getCosts } = useCostsStore()
  const [result, setResult] = useState<PerfectProductResponse | null>(perfectProductResult)
  const [costsOpen, setCostsOpen] = useState(false)
  const [reviewsPerStar, setReviewsPerStar] = useState(1)

  useEffect(() => {
    if (perfectProductResult && !result) {
      setResult(perfectProductResult)
    }
    if (perfectProductResult && visibleResults.length > 0) {
      const currentIds = visibleResults.map(r => r.id).sort().join(',')
      const cachedIds = perfectProductResult._resultIds ?? ''
      if (cachedIds && currentIds !== cachedIds) {
        setResult(null)
        setPerfectProductResult(null)
      }
    }
  }, [])

  const query = lastResponse?.search.query ?? ''
  const marketplaces = lastResponse
    ? lastResponse.search.marketplaces.split(',').filter(Boolean)
    : []

  const generateMutation = useMutation({
    mutationFn: async () => {
      const primaryMarket = marketplaces[0] ?? 'mercadolivre'
      const costs = getCosts(primaryMarket)
      const activeResults = visibleResults.filter(r => !hiddenResults.includes(r.id))

      const { data } = await api.post<PerfectProductResponse>('/produto-perfeito/', {
        query,
        marketplace: primaryMarket,
        results: activeResults,
        costs,
        purchase_price: pricingConfig.purchasePrice,
        reviews_per_star: reviewsPerStar,
        price_mode: pricingConfig.priceMode,
        custom_markup: pricingConfig.customMarkup,
      })
      return data
    },
    onSuccess: (data) => {
      const ids = visibleResults.filter(r => !hiddenResults.includes(r.id)).map(r => r.id).sort().join(',')
      const cached = { ...data, _resultIds: ids } as PerfectProductResponse & { _resultIds: string }
      setResult(cached)
      setPerfectProductResult(cached)
    },
  })

  const generateImageMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ image_url: string | null }>('/produto-perfeito/gerar-imagem', {
        query,
      })
      return data
    },
    onSuccess: (data) => {
      if (data.image_url) {
        const updated = { ...result!, ai_image_url: data.image_url }
        setResult(updated)
        setPerfectProductResult(updated)
      }
    },
  })

  const hasResults = visibleResults.length > 0
  const activeResults = visibleResults.filter(r => !hiddenResults.includes(r.id))
  const hasActiveResults = activeResults.length > 0

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Produto Perfeito</h1>
            <p className="text-xs text-gray-500">
              Análise completa com preços, avaliações e sugestões de IA
            </p>
          </div>
        </div>

        {/* No results warning */}
        {!hasResults && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-3">
            <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Nenhuma busca realizada</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Faça uma pesquisa na aba Pesquisas primeiro, depois volte aqui para gerar o Produto Perfeito.
              </p>
            </div>
          </div>
        )}

        {/* Hidden notice */}
        {hasResults && hiddenResults.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-2 flex items-center gap-2">
            <Info size={14} className="text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              {hiddenResults.length} produto(s) oculto(s) não serão incluídos na análise.
            </p>
          </div>
        )}

        {/* Current search info */}
        {hasResults && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Busca atual</p>
              <p className="font-semibold text-gray-800">"{query}"</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeResults.length} produto(s) ativo(s) · {marketplaces.join(', ')}
              </p>
            </div>
            {pricingConfig.purchasePrice != null && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Preço de compra</p>
                <p className="font-semibold text-gray-800">{formatBRL(pricingConfig.purchasePrice)}</p>
              </div>
            )}
          </div>
        )}

        {/* Global pricing config — outside marketplace costs */}
        {hasResults && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Configuração de Preço</h2>

            {/* Purchase price */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-600 whitespace-nowrap">Preço de compra</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
                <input
                  type="number" min={0} step={0.01}
                  placeholder="0,00"
                  value={pricingConfig.purchasePrice ?? ''}
                  onChange={(e) => setPricingConfig({ purchasePrice: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-32 pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>

            {/* Price mode selector */}
            <div className="space-y-2">
              <label className="text-xs text-gray-600 font-medium">Modo de precificação</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PRICE_MODES.map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setPricingConfig({ priceMode: mode.key })}
                    className={clsx(
                      'text-left p-3 rounded-xl border-2 transition-all',
                      pricingConfig.priceMode === mode.key
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    )}
                  >
                    <p className={clsx(
                      'text-xs font-semibold',
                      pricingConfig.priceMode === mode.key ? 'text-brand-700' : 'text-gray-700'
                    )}>
                      {mode.label}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{mode.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom markup for advanced mode */}
            {pricingConfig.priceMode === 'avancado' && (
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-600 whitespace-nowrap">Markup desejado</label>
                <input
                  type="number" min={0} max={500} step={1}
                  value={pricingConfig.customMarkup}
                  onChange={(e) => setPricingConfig({ customMarkup: parseFloat(e.target.value) || 0 })}
                  className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-center
                             focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
            )}
          </div>
        )}

        {/* Costs configuration */}
        {hasResults && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setCostsOpen((o) => !o)}
              className="w-full flex items-center justify-between px-5 py-3
                         hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-700">
                Configuração de Custos por Marketplace
              </span>
              {costsOpen
                ? <ChevronUp size={16} className="text-gray-400" />
                : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {costsOpen && (
              <div className="px-5 pb-5 pt-2 space-y-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Configure comissões, impostos e custos para cada marketplace.
                  As configurações são salvas automaticamente no seu navegador.
                </p>
                {marketplaces.map((mp) => (
                  <CostsPanel key={mp} marketplace={mp} />
                ))}
                {/* Reviews per star */}
                <div className="flex items-center gap-3 pt-2">
                  <label className="text-xs text-gray-600 flex-1">
                    Avaliações coletadas por estrela (1–20)
                  </label>
                  <input
                    type="number" min={1} max={20}
                    value={reviewsPerStar}
                    onChange={(e) => setReviewsPerStar(Number(e.target.value))}
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-brand-400 text-center"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generate button */}
        {hasResults && !result && (
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || !hasActiveResults}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                       bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold
                       hover:from-brand-700 hover:to-brand-600 disabled:opacity-50
                       transition-all shadow-sm text-sm"
          >
            <Sparkles size={16} />
            {generateMutation.isPending ? 'Gerando análise completa…' : 'Gerar Produto Perfeito'}
          </button>
        )}

        {generateMutation.isError && (
          <p className="text-red-500 text-sm text-center">
            Erro ao gerar. Verifique se o servidor está rodando.
          </p>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">

            {/* Regenerate button */}
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="w-full py-2.5 rounded-xl border border-brand-300 text-brand-600
                         text-sm font-medium hover:bg-brand-50 transition-colors"
            >
              {generateMutation.isPending ? 'Atualizando…' : '↻ Regenerar análise'}
            </button>

            {/* AI image placeholder */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Imagem do Produto</h2>
              {result.ai_image_url ? (
                <img src={result.ai_image_url} alt={result.query}
                  className="w-full max-w-sm mx-auto rounded-xl" />
              ) : (
                <div className="w-full h-40 rounded-xl bg-gray-100 flex flex-col items-center justify-center gap-3">
                  <p className="text-xs text-gray-400 text-center px-4">
                    {result.ai_ready
                      ? 'Geração de imagem não configurada'
                      : 'Configure a IA no arquivo .env para gerar imagens'}
                  </p>
                  <button
                    onClick={() => generateImageMutation.mutate()}
                    disabled={generateMutation.isPending || generateImageMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r
                               from-purple-600 to-pink-500 text-white text-xs font-semibold
                               hover:from-purple-700 hover:to-pink-600 disabled:opacity-50 transition-all"
                  >
                    <Image size={14} />
                    {generateImageMutation.isPending ? 'Gerando imagem…' : 'Gerar Imagem IA'}
                  </button>
                </div>
              )}
            </div>

            {/* Per-marketplace cards */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Análise por Marketplace</h2>
              {result.per_marketplace.map((mp) => (
                <MarketplaceCard key={mp.marketplace} data={mp} />
              ))}
            </div>

            {/* Overall card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-700">Visão Geral — Todos os Marketplaces</span>
              </div>
              <PriceGrid analysis={result.overall} />
            </div>

            {/* AI Description */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">Descrição Profissional</h2>
              {result.ai_description ? (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {result.ai_description}
                </p>
              ) : (
                <AiPlaceholder />
              )}
              {result.descriptions.length > 0 && !result.ai_description && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                    Ver descrições coletadas ({result.descriptions.length})
                  </summary>
                  <div className="mt-2 space-y-2">
                    {result.descriptions.map((d, i) => (
                      <p key={i} className="text-xs text-gray-500 bg-gray-50 rounded p-2 line-clamp-3">{d}</p>
                    ))}
                  </div>
                </details>
              )}
            </div>

            {/* Reviews + AI improvements */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Avaliações & Melhorias</h2>
                <div className="flex items-start gap-1.5 max-w-xs">
                  <Info size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-400">
                    A análise é gerada com base nas avaliações reais de clientes, agrupadas por nota (1 a 5 estrelas). A IA identifica padrões para sugerir melhorias objetivas.
                  </p>
                </div>
              </div>

              {/* Reviews by star */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const key = `star_${star}` as keyof typeof result.reviews
                  const texts = result.reviews[key]
                  return (
                    <div key={star} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-gray-600 mb-2">
                        {'★'.repeat(star)}{'☆'.repeat(5 - star)}
                      </p>
                      {texts.length > 0
                        ? texts.map((t, i) => (
                            <p key={i} className="text-xs text-gray-600 leading-relaxed">{t}</p>
                          ))
                        : <p className="text-xs text-gray-400 italic">Nenhuma avaliação coletada</p>
                      }
                    </div>
                  )
                })}
              </div>

              {/* AI improvements */}
              {result.ai_improvements ? (
                <div className="bg-brand-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-brand-700 mb-2">Sugestões de Melhoria (IA)</p>
                  <p className="text-sm text-brand-800 leading-relaxed whitespace-pre-wrap">
                    {result.ai_improvements}
                  </p>
                </div>
              ) : (
                <AiPlaceholder label="Sugestões de melhoria" />
              )}
            </div>

          </div>
        )}
      </div>
    </AppLayout>
  )
}


function MarketplaceCard({
  data,
}: {
  data: MarketplaceAnalysis
}) {
  const a = data.price_analysis
  const viable = a.is_viable

  return (
    <div className={clsx(
      'bg-white rounded-2xl border p-5 space-y-3',
      viable === false ? 'border-red-200' : viable === true ? 'border-green-200' : 'border-gray-200'
    )}>
      <div className="flex items-center justify-between">
        <MarketplaceBadge marketplace={data.marketplace} size="md" />
        {viable != null && (
          <div className={clsx(
            'flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full',
            viable
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          )}>
            {viable
              ? <><CheckCircle size={12} /> Viável</>
              : <><AlertCircle size={12} /> Inviável</>
            }
          </div>
        )}
      </div>

      <PriceGrid analysis={a} />

      {data.net_margin != null && (
        <div className="flex justify-between items-center pt-1 border-t border-gray-100">
          <span className="text-xs text-gray-500">Margem líquida estimada</span>
          <span className={clsx(
            'text-sm font-bold',
            data.net_margin >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {formatBRL(data.net_margin)}
          </span>
        </div>
      )}

      {viable === false && a.minimum_viable_price != null && (
        <div className="bg-red-50 rounded-lg px-3 py-2 text-xs text-red-700">
          Preço mínimo para viabilidade: <strong>{formatBRL(a.minimum_viable_price)}</strong>
        </div>
      )}
    </div>
  )
}


function PriceGrid({ analysis: a }: {
  analysis: { iqr_mean: number | null; min_price: number | null; max_price: number | null;
               median_price: number | null; competitive_floor: number | null;
               suggested_price_20pct: number | null }
}) {
  const items = [
    { label: 'Média IQR',        value: a.iqr_mean,              highlight: true },
    { label: 'Mínimo',           value: a.min_price              },
    { label: 'Máximo',           value: a.max_price              },
    { label: 'Mediana',          value: a.median_price           },
    { label: 'Piso competitivo', value: a.competitive_floor,     tooltip: 'Preço mínimo viável com lucro zero: custo total (preço de compra + taxas, comissões, frete e custos extras) dividido pelas deduções variáveis do marketplace.' },
    { label: 'Preço sugerido',   value: a.suggested_price_20pct, tooltip: 'Preço sugerido de venda calculado conforme o modo de precificação selecionado (Iniciante, Intermediário ou Avançado).' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map(({ label, value, highlight, tooltip }) => (
        <div key={label} className={clsx(
          'rounded-lg px-3 py-2 relative',
          highlight ? 'bg-brand-50' : 'bg-gray-50'
        )}>
          <div className="flex items-center gap-1">
            <p className="text-xs text-gray-400">{label}</p>
            {tooltip && (
              <span className="relative group inline-flex">
                <Info size={11} className="text-gray-400 cursor-help" />
                <span className="hidden group-hover:block absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
                                 w-56 px-3 py-2 bg-gray-900 text-white text-[10px] leading-relaxed rounded-lg shadow-lg
                                 pointer-events-none">
                  {tooltip}
                </span>
              </span>
            )}
          </div>
          <p className={clsx('text-sm font-bold', highlight ? 'text-brand-700' : 'text-gray-800')}>
            {formatBRL(value as number | null)}
          </p>
        </div>
      ))}
    </div>
  )
}


function AiPlaceholder({ label = 'Conteúdo gerado por IA' }: { label?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
      <Info size={15} className="text-gray-400 flex-shrink-0" />
      <p className="text-xs text-gray-400">
        {label} não disponível. Configure{' '}
        <code className="bg-gray-200 px-1 rounded text-gray-600">AI_API_KEY</code>,{' '}
        <code className="bg-gray-200 px-1 rounded text-gray-600">AI_MODEL</code> e{' '}
        <code className="bg-gray-200 px-1 rounded text-gray-600">AI_BASE_URL</code>{' '}
        no arquivo <code className="bg-gray-200 px-1 rounded text-gray-600">.env</code>.
      </p>
    </div>
  )
}
