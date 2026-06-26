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
    Coleta avaliações por estrela no Mercado Livre.

    Fluxo:
      1. Abre a página do produto
      2. Clica em "Mostrar todas as opiniões"
      3. Para cada estrela (5 a 1), filtra pelo dropdown e coleta N avaliações
    """
    if body.marketplace != "mercadolivre":
        # Outros marketplaces serão implementados futuramente
        return {"star_5": [], "star_4": [], "star_3": [], "star_2": [], "star_1": []}

    from playwright.async_api import async_playwright
    import subprocess, time

    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    chrome_process = subprocess.Popen([
        chrome_path,
        "--remote-debugging-port=9222",
        "--user-data-dir=C:\\chrome-debug-profile-reviews",
        "--no-first-run",
        "--no-default-browser-check",
    ])
    time.sleep(2)

    reviews: dict[str, list[str]] = {
        "star_5": [], "star_4": [], "star_3": [], "star_2": [], "star_1": []
    }

    star_option_ids = {
        5: "dropdown-option-rating-5",
        4: "dropdown-option-rating-4",
        3: "dropdown-option-rating-3",
        2: "dropdown-option-rating-2",
        1: "dropdown-option-rating-1",
    }

    try:
        async with async_playwright() as p:
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
            context = browser.contexts[0]
            page = await context.new_page()

            await page.goto(body.product_url, wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)

            # Clica em "Mostrar todas as opiniões"
            try:
                see_more = page.locator('"#see-more"')
                await see_more.wait_for(timeout=5000)
                await see_more.click()
                await page.wait_for_timeout(2000)
            except Exception:
                print("[reviews] Botão 'ver mais opiniões' não encontrado.")

            # Para cada estrela
            for star in [5, 4, 3, 2, 1]:
                key = f"star_{star}"
                try:
                    # Localiza o botão do dropdown
                    dropdown_btn = page.locator("#dropdown-button-rating")
                    await dropdown_btn.scroll_into_view_if_needed()
                    await dropdown_btn.wait_for(state="visible", timeout=5000)
                    
                    # CORREÇÃO: Usa force=True para ignorar overlays bloqueando o clique
                    await dropdown_btn.click(force=True)
                    await page.wait_for_timeout(1000)

                    # Clica na opção de estrela correspondente
                    option = page.locator(f"#dropdown-option-rating-{star}")
                    await option.wait_for(state="visible", timeout=3000)
                    await option.click(force=True) # Também forçado para garantir dentro do modal
                    
                    await page.wait_for_timeout(2000)

                    # Coleta N avaliações
                    review_els = page.locator("p.ui-review-capability-comments__comment__content")
                    count = await review_els.count()
                    collected = []
                    for i in range(min(body.reviews_per_star, count)):
                        text = await review_els.nth(i).inner_text()
                        if text.strip():
                            collected.append(text.strip())
                    reviews[key] = collected
                    print(f"[reviews] {star}★ — {len(collected)} avaliação(ões) coletada(s)")

                except Exception as e:
                    print(f"[reviews] Erro na estrela {star}: {e}")
                    # Tenta clicar fora ou dar um refresh leve se o menu travar aberto em caso de erro
                    try:
                        await page.mouse.click(0, 0)
                    except:
                        pass

            await page.close()
            await browser.close()

    except Exception as e:
        print(f"[reviews] Erro geral: {e}")
    finally:
        chrome_process.terminate()

    return reviews


@app.get("/health")
def health():
    return {"status": "ok", "servico": "scraper"}


if __name__ == "__main__":
    print("🔍 Servidor de scraping iniciando em http://localhost:8001")
    print("   Health check: http://localhost:8001/health")
    print("   Pressione Ctrl+C para parar\n")
    uvicorn.run(app, host="127.0.0.1", port=8001, loop="asyncio")
