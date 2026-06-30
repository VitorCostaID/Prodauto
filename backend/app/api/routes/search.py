from datetime import datetime, timezone
from fastapi import APIRouter, status
from app.schemas.schemas import (
    SearchRequest, SearchResponse, SearchOut, MarketplaceCosts
)
from app.services.analytics import compute_price_analysis, filter_by_query
from app.services.scraper_bridge import run_scraper

router = APIRouter(prefix="/search", tags=["pesquisa"])


@router.post("/", response_model=SearchResponse, status_code=status.HTTP_201_CREATED)
async def run_search(body: SearchRequest):
    """
    Executa scraping, aplica filtro estrito opcional,
    retorna resultados + análise de preços.
    """
    # 1. Scrape
    raw_results = await run_scraper(
        query=body.query,
        marketplaces=body.marketplaces,
        max_results=body.max_results,
    )

    original_count = len(raw_results)

    # 2. Strict title filter
    if body.strict_filter:
        raw_results = filter_by_query(raw_results, body.query)

    filtered_count = original_count - len(raw_results)

    # 3. Build result list
    result_list = []
    for i, item in enumerate(raw_results):
        result_list.append({
            "id": i,
            "marketplace": item.get("marketplace", body.marketplaces[0]),
            "title":       item.get("title", "Desconhecido"),
            "link":        item.get("link", "#"),
            "price_raw":   item.get("price_raw"),
            "price_brl":   item.get("price_brl"),
            "rating":      item.get("rating"),
            "condition":   item.get("condition", "Novo"),
            "shipping":    item.get("shipping", "Não especificado"),
            "image_url":   item.get("image_url"),
            "description": item.get("description"),
        })

    # 3.5 Price filter
    if body.min_price is not None:
        result_list = [r for r in result_list if r["price_brl"] is not None and r["price_brl"] >= body.min_price]
    if body.max_price is not None:
        result_list = [r for r in result_list if r["price_brl"] is not None and r["price_brl"] <= body.max_price]

    # 3.6 Sort
    if body.sort_by == "price_asc":
        result_list.sort(key=lambda r: r["price_brl"] if r["price_brl"] is not None else float('inf'))
    elif body.sort_by == "price_desc":
        result_list.sort(key=lambda r: r["price_brl"] if r["price_brl"] is not None else 0, reverse=True)
    elif body.sort_by == "rating_desc":
        def _rating_val(r):
            try:
                return float(r.get("rating") or 0)
            except (ValueError, TypeError):
                return 0
        result_list.sort(key=_rating_val, reverse=True)

    # 4. Price analysis — no costs here, costs are applied on Perfect Product page
    analysis = compute_price_analysis(
        price_brls=[r["price_brl"] for r in result_list],
        purchase_price=body.purchase_price,
    )

    search_out = SearchOut(
        id=0,
        query=body.query,
        marketplaces=",".join(body.marketplaces),
        max_results=body.max_results,
        result_count=len(result_list),
        created_at=datetime.now(timezone.utc),
        results=result_list,
    )

    return SearchResponse(
        search=search_out,
        analysis=analysis,
        filtered_count=filtered_count,
        strict_filter_applied=body.strict_filter,
    )
