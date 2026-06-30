// ── Auth ──────────────────────────────────────────────────────────────────

export interface User {
  id: number
  email: string
  full_name: string | null
  is_active: boolean
  created_at: string
}

// ── Marketplaces ──────────────────────────────────────────────────────────

export const SUPPORTED_MARKETPLACES = [
  {
    id: 'mercadolivre',
    label: 'Mercado Livre',
    logo: 'https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png',
    color: '#FFE600',
    textColor: '#333333',
  },
  // ── Para reativar: descomente os marketplaces abaixo ──────────────────
  // {
  //   id: 'shopee',
  //   label: 'Shopee',
  //   logo: 'https://i.pinimg.com/564x/a0/83/b6/a083b6c01e9cfe682b36ac2e9da7ff17.jpg',
  //   color: '#EE4D2D',
  //   textColor: '#ffffff',
  // },
  // {
  //   id: 'magazineluiza',
  //   label: 'Magazine Luiza',
  //   logo: 'https://mir-s3-cdn-cf.behance.net/project_modules/1400_webp/9c9d99132854451.61b12a70039ca.jpg',
  //   color: '#0086FF',
  //   textColor: '#ffffff',
  // },
  // ── Fim dos marketplaces desativados ──────────────────────────────────
  {
    id: 'amazon',
    label: 'Amazon',
    logo: 'https://images.icon-icons.com/2429/PNG/512/amazon_logo_icon_147320.png',
    color: '#FF9900',
    textColor: '#131921',
  },
] as const

export type MarketplaceId = (typeof SUPPORTED_MARKETPLACES)[number]['id']

export function getMarketplace(id: string) {
  return SUPPORTED_MARKETPLACES.find((m) => m.id === id)
}

// ── Costs ─────────────────────────────────────────────────────────────────

export interface MarketplaceCosts {
  marketplace: string
  commission_pct: number
  tax_pct: number
  fixed_fee: number
  shipping_cost: number
  extra_costs: number
  config_name: string
}

export function defaultCosts(marketplace: string): MarketplaceCosts {
  return {
    marketplace,
    commission_pct: 0,
    tax_pct: 0,
    fixed_fee: 0,
    shipping_cost: 0,
    extra_costs: 0,
    config_name: 'Padrão',
  }
}

// ── Search ────────────────────────────────────────────────────────────────

export interface ProductResult {
  id: number
  marketplace: string
  title: string
  link: string
  price_raw: string | null
  price_brl: number | null
  rating: string | null
  condition: string
  shipping: string
  image_url: string | null
  description: string | null
}

export interface PriceAnalysis {
  count: number
  min_price: number | null
  max_price: number | null
  mean_price: number | null
  median_price: number | null
  iqr_mean: number | null
  competitive_floor: number | null
  suggested_price_10pct: number | null
  suggested_price_20pct: number | null
  suggested_price_30pct: number | null
  purchase_price: number | null
  minimum_viable_price: number | null
  is_viable: boolean | null
  currency: string
}

export interface SearchRecord {
  id: number
  query: string
  marketplaces: string
  max_results: number
  result_count: number
  created_at: string
  results: ProductResult[]
}

export interface SearchResponse {
  search: SearchRecord
  analysis: PriceAnalysis
  filtered_count: number
  strict_filter_applied: boolean
}

// ── Perfect Product ───────────────────────────────────────────────────────

export interface ReviewsByStars {
  star_5: string[]
  star_4: string[]
  star_3: string[]
  star_2: string[]
  star_1: string[]
}

export interface MarketplaceAnalysis {
  marketplace: string
  price_analysis: PriceAnalysis
  net_margin: number | null
  viable_purchase_price: number | null
}

export interface PerfectProductResponse {
  query: string
  marketplace: string
  per_marketplace: MarketplaceAnalysis[]
  overall: PriceAnalysis
  descriptions: string[]
  reviews: ReviewsByStars
  ai_description: string | null
  ai_improvements: string | null
  ai_image_url: string | null
  ai_ready: boolean
}
