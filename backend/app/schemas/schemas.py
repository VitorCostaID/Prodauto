"""
Pydantic v2 schemas — request/response contracts for all routes.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.constants import MAX_SEARCH_RESULTS, MAX_REVIEWS_PER_STAR


# ── Auth ──────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: Optional[str] = Field(default=None, max_length=120)

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str


# ── Marketplace costs ─────────────────────────────────────────────────────

class MarketplaceCosts(BaseModel):
    """
    Cost configuration the user fills in on the Perfect Product page.
    All percentages are 0-100 (e.g. 12.5 means 12.5%).
    Stored in the browser for now; will move to DB with auth.
    """
    marketplace: str
    commission_pct: float = Field(default=0.0, ge=0, le=100,
        description="Comissão da plataforma (%)")
    tax_pct: float = Field(default=0.0, ge=0, le=100,
        description="Impostos (%)")
    fixed_fee: float = Field(default=0.0, ge=0,
        description="Taxa fixa por venda (R$)")
    shipping_cost: float = Field(default=0.0, ge=0,
        description="Custo de envio médio (R$)")
    extra_costs: float = Field(default=0.0, ge=0,
        description="Outros custos fixos por venda (R$)")
    config_name: str = Field(default="Padrão",
        description="Nome da configuração (ex: Padrão, Promoção)")


# ── Search ────────────────────────────────────────────────────────────────

SUPPORTED_MARKETPLACES = [
    "mercadolivre",
    "shopee",
    "magazineluiza",
    "amazon",
]

class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=500)
    marketplaces: list[str] = Field(default_factory=lambda: ["mercadolivre"])
    max_results: int = Field(default=10, ge=1, le=MAX_SEARCH_RESULTS)
    purchase_price: Optional[float] = Field(default=None, ge=0,
        description="Preço de compra do produto (R$)")
    strict_filter: bool = Field(default=True,
        description="Filtrar apenas produtos que contenham todas as palavras da busca")
    sort_by: Optional[str] = Field(default=None,
        description="Ordenação: 'price_asc', 'price_desc', 'rating_desc'")
    min_price: Optional[float] = Field(default=None, ge=0,
        description="Preço mínimo do filtro (R$)")
    max_price: Optional[float] = Field(default=None, ge=0,
        description="Preço máximo do filtro (R$)")

    @field_validator("marketplaces")
    @classmethod
    def validate_marketplaces(cls, v: list[str]) -> list[str]:
        invalid = set(v) - set(SUPPORTED_MARKETPLACES)
        if invalid:
            raise ValueError(f"Marketplaces não suportados: {invalid}")
        return v


class ResultOut(BaseModel):
    id: int
    marketplace: str
    title: str
    link: str
    price_raw: Optional[str]
    price_brl: Optional[float]
    rating: Optional[str]
    condition: str
    shipping: str
    image_url: Optional[str]
    description: Optional[str] = None
    model_config = {"from_attributes": True}


class SearchOut(BaseModel):
    id: int
    query: str
    marketplaces: str
    max_results: int
    result_count: int
    created_at: datetime
    results: list[ResultOut] = []
    model_config = {"from_attributes": True}


# ── Price analytics ───────────────────────────────────────────────────────

class PriceAnalysis(BaseModel):
    count: int
    min_price: Optional[float]
    max_price: Optional[float]
    mean_price: Optional[float]
    median_price: Optional[float]
    iqr_mean: Optional[float]
    competitive_floor: Optional[float]
    suggested_price_10pct: Optional[float]
    suggested_price_20pct: Optional[float]
    suggested_price_30pct: Optional[float]
    purchase_price: Optional[float] = None
    minimum_viable_price: Optional[float] = None
    is_viable: Optional[bool] = None
    currency: str = "BRL"


class SearchResponse(BaseModel):
    search: SearchOut
    analysis: PriceAnalysis
    filtered_count: int = 0       # how many were removed by strict filter
    strict_filter_applied: bool = False


# ── Perfect Product ───────────────────────────────────────────────────────

class ReviewsByStars(BaseModel):
    star_5: list[str] = []
    star_4: list[str] = []
    star_3: list[str] = []
    star_2: list[str] = []
    star_1: list[str] = []


class PerfectProductRequest(BaseModel):
    query: str
    marketplace: str
    results: list[dict]           # the search results already collected
    costs: Optional[MarketplaceCosts] = None
    purchase_price: Optional[float] = None
    reviews_per_star: int = Field(default=1, ge=1, le=MAX_REVIEWS_PER_STAR)
    price_mode: str = Field(default="iniciante",
        description="Modo de precificação: 'iniciante', 'intermediario', 'avancado'")
    custom_markup: float = Field(default=20.0, ge=0,
        description="Markup personalizado (%) — usado apenas no modo 'avancado'")


class MarketplaceAnalysis(BaseModel):
    """Price analysis for one specific marketplace, costs applied."""
    marketplace: str
    price_analysis: PriceAnalysis
    net_margin: Optional[float] = None    # what seller pockets at IQR mean
    viable_purchase_price: Optional[float] = None  # max purchase price to still be viable


class PerfectProductResponse(BaseModel):
    query: str
    marketplace: str
    per_marketplace: list[MarketplaceAnalysis]
    overall: PriceAnalysis
    descriptions: list[str]       # first N descriptions collected
    reviews: ReviewsByStars
    # AI fields — populated when AI key is configured
    ai_description: Optional[str] = None
    ai_improvements: Optional[str] = None
    ai_image_url: Optional[str] = None
    ai_ready: bool = False        # True when AI_API_KEY is set in constants.py


# ── Reviews ───────────────────────────────────────────────────────────────

class ReviewScrapeRequest(BaseModel):
    product_url: str
    reviews_per_star: int = Field(default=1, ge=1, le=MAX_REVIEWS_PER_STAR)
