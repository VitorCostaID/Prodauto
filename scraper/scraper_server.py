"""
Scraper Server — roda independentemente na porta 8001.

Inicie com:
    python scraper_server.py

Este processo tem seu próprio event loop, sem interferência do FastAPI.
Playwright e SeleniumBase funcionam normalmente aqui.
"""
import asyncio
import sys
from pathlib import Path

# Windows event loop fix — DEVE ser antes de qualquer import asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import uvicorn

# Adiciona src/ ao path para importar scraper.py
SRC_PATH = Path(__file__).parent / "src"
sys.path.insert(0, str(SRC_PATH))

try:
    from scraper import run_scraper as _run_scraper
    from scraper import scrape_reviews as _scrape_reviews
except ImportError as e:
    print(f"\n❌ Não foi possível importar scraper.py de {SRC_PATH}")
    print(f"   Erro: {e}\n")
    sys.exit(1)

app = FastAPI(title="Servidor de Scraping", version="0.1.0")


# ── Schemas locais ────────────────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    query: str
    marketplaces: list[str]
    max_results: int = 10


class ScrapeResponse(BaseModel):
    results: list[dict]
    count: int


class ReviewScrapeRequest(BaseModel):
    product_url: str
    marketplace: str
    reviews_per_star: int = Field(default=1, ge=1, le=20)


# ── Rotas ─────────────────────────────────────────────────────────────────

@app.post("/scrape", response_model=ScrapeResponse)
async def scrape(body: ScrapeRequest):
    try:
        results = await _run_scraper(
            query=body.query,
            marketplaces=body.marketplaces,
            max_results=body.max_results,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no scraper: {str(e)}")
    return ScrapeResponse(results=results, count=len(results))


@app.post("/scrape-reviews")
async def scrape_reviews(body: ReviewScrapeRequest):
    """
    Coleta avaliações por estrela.
    Delega para scraper.py (headless via initialize_browser).
    """
    reviews = await _scrape_reviews(
        product_url=body.product_url,
        marketplace=body.marketplace,
   )
    return reviews


@app.get("/health")
def health():
    return {"status": "ok", "servico": "scraper"}


if __name__ == "__main__":
    print("🔍 Servidor de scraping iniciando em http://localhost:8001")
    print("   Health check: http://localhost:8001/health")
    print("   Pressione Ctrl+C para parar\n")
    uvicorn.run(app, host="0.0.0.0", port=8001, loop="asyncio")
