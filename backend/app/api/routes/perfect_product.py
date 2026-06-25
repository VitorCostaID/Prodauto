"""
Perfect Product route.

Receives already-collected search results + costs config,
runs review scraping, calls AI (when configured), returns full analysis.
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.constants import AI_API_KEY, AI_MODEL, DESCRIPTIONS_FOR_AI
from app.schemas.schemas import (
    MarketplaceCosts, MarketplaceAnalysis,
    PerfectProductRequest, PerfectProductResponse,
    PriceAnalysis, ReviewsByStars,
)
from app.services.ai_service import (
    generate_description, generate_improvements, generate_image_prompt
)
from app.services.analytics import (
    compute_price_analysis, minimum_viable_price, apply_costs
)
from app.services.review_scraper import scrape_reviews

router = APIRouter(prefix="/produto-perfeito", tags=["produto perfeito"])


def _safe_rating(r: dict) -> float:
    """Parse rating safely — return 0.0 if broken or missing."""
    val = r.get("rating")
    if val is None:
        return 0.0
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def _compute_suggested_price(
    iqr_mean: float | None,
    costs: MarketplaceCosts | None,
    purchase_price: float | None,
    price_mode: str,
    custom_markup: float,
) -> float | None:
    """Calculate suggested selling price based on the selected mode."""
    if iqr_mean is None:
        return None

    if price_mode == "iniciante":
        if costs is None or purchase_price is None:
            return round(iqr_mean, 2)
        mvp = minimum_viable_price(purchase_price, costs)
        diff_pct = ((iqr_mean - mvp) / mvp * 100) if mvp > 0 else 0
        if abs(diff_pct) <= 2:
            return round(mvp * 1.05, 2)
        return round(mvp, 2)

    elif price_mode == "intermediario":
        return round(iqr_mean, 2)

    elif price_mode == "avancado":
        if costs is None or purchase_price is None:
            return round(iqr_mean * (1 + custom_markup / 100), 2)
        mvp = minimum_viable_price(purchase_price, costs)
        return round(mvp * (1 + custom_markup / 100), 2)

    return round(iqr_mean, 2)


@router.post("/", response_model=PerfectProductResponse)
async def generate_perfect_product(body: PerfectProductRequest):
    results = body.results
    if not results:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum resultado fornecido. Execute uma busca primeiro."
        )

    # 1. Group results by marketplace
    by_marketplace: dict[str, list[dict]] = {}
    for r in results:
        mp = r.get("marketplace", body.marketplace)
        by_marketplace.setdefault(mp, []).append(r)

    # 2. Per-marketplace analysis with costs applied
    per_marketplace: list[MarketplaceAnalysis] = []
    for mp, mp_results in by_marketplace.items():
        prices = [r.get("price_brl") for r in mp_results]
        analysis = compute_price_analysis(
            price_brls=prices,
            purchase_price=body.purchase_price,
            costs=body.costs,
        )

        # Override suggested price based on mode
        analysis.suggested_price_20pct = _compute_suggested_price(
            analysis.iqr_mean, body.costs, body.purchase_price,
            body.price_mode, body.custom_markup,
        )

        # Override competitive_floor = MVP with 0 profit (purchase + all costs)
        if body.purchase_price is not None and body.costs is not None:
            analysis.competitive_floor = minimum_viable_price(body.purchase_price, body.costs)

        # Net margin: suggested_price - (purchase_price + all costs)
        net_margin = None
        if analysis.suggested_price_20pct is not None and body.purchase_price is not None:
            total_cost = body.purchase_price
            if body.costs:
                total_cost += (
                    body.costs.fixed_fee + body.costs.shipping_cost + body.costs.extra_costs
                    + (analysis.suggested_price_20pct * (body.costs.commission_pct + body.costs.tax_pct) / 100)
                )
            net_margin = round(analysis.suggested_price_20pct - total_cost, 2)

        per_marketplace.append(MarketplaceAnalysis(
            marketplace=mp,
            price_analysis=analysis,
            net_margin=net_margin,
            viable_purchase_price=None,
        ))

    # 3. Overall analysis across all marketplaces
    all_prices = [r.get("price_brl") for r in results]
    overall = compute_price_analysis(
        price_brls=all_prices,
        purchase_price=body.purchase_price,
        costs=body.costs,
    )
    overall.suggested_price_20pct = _compute_suggested_price(
        overall.iqr_mean, body.costs, body.purchase_price,
        body.price_mode, body.custom_markup,
    )
    if body.purchase_price is not None and body.costs is not None:
        overall.competitive_floor = minimum_viable_price(body.purchase_price, body.costs)

    # 4. Collect descriptions for AI
    descriptions = [
        r.get("description", "")
        for r in results
        if r.get("description")
    ][:DESCRIPTIONS_FOR_AI]

    # 5. Scrape reviews from the top-rated product (safe rating parse)
    reviews = ReviewsByStars()
    top_product = next(
        (r for r in sorted(results, key=_safe_rating, reverse=True)
         if r.get("link") and r.get("link") != "#"),
        None
    )
    if top_product:
        try:
            reviews = await scrape_reviews(
                product_url=top_product["link"],
                marketplace=body.marketplace,
                reviews_per_star=body.reviews_per_star,
            )
        except Exception as e:
            print(f"[reviews] Erro ao coletar avaliações: {e}")

    # 6. AI generation (only if configured)
    ai_description = None
    ai_improvements = None
    ai_image_url = None
    ai_ready = bool(AI_API_KEY and AI_MODEL)

    if ai_ready:
        ai_description = await generate_description(body.query, descriptions)
        ai_improvements = await generate_improvements(
            body.query, reviews.model_dump()
        )
        ai_image_url = await generate_image_prompt(body.query)

    return PerfectProductResponse(
        query=body.query,
        marketplace=body.marketplace,
        per_marketplace=per_marketplace,
        overall=overall,
        descriptions=descriptions,
        reviews=reviews,
        ai_description=ai_description,
        ai_improvements=ai_improvements,
        ai_image_url=ai_image_url,
        ai_ready=ai_ready,
    )


class ImageRequest(BaseModel):
    query: str


class ImageResponse(BaseModel):
    image_url: str | None = None


@router.post("/gerar-imagem", response_model=ImageResponse)
async def generate_image(body: ImageRequest):
    ai_ready = bool(AI_API_KEY and AI_MODEL)
    if not ai_ready:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="IA não configurada. Preencha AI_API_KEY e AI_MODEL no arquivo .env."
        )
    image_url = await generate_image_prompt(body.query)
    return ImageResponse(image_url=image_url)
