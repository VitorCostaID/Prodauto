import asyncio
from playwright.async_api import async_playwright, BrowserContext
#from seleniumbase import sb_cdp
from seleniumbase import cdp_driver
from bs4 import BeautifulSoup
import subprocess
import traceback

REFS = { 
    # Index Positions mapped to variables inside get_results():
    # [0]: Base URL
    # [1]: Search Bar Selector
    # [2]: Container Product Card Selector
    # [3]: Title Anchor Selector
    # [4]: Rating Element Selector
    # [5]: Price Image/Label Selector
    # [6]: Condition Tag Selector
    # [7]: Shipping Container Selector
    # [8]: Product Page: Description Selector
    # [9]: Product Page: Review Text Selector
    
    "mercadolivre": [
        "https://lista.mercadolivre.com.br/", 
        "#cb1-edit", 
        "li.ui-search-layout__item",
        "a.poly-component__title", 
        "span.polylabel-label", 
        ".poly-price__current span[role='img']", 
        "span.poly-component__item-condition", 
        ".poly-component__shipping-v2",
        "p.ui-pdp-description__content",                 # [8] Description
        "img.poly-component__picture"
    ],
    
    "amazon": [
        "https://www.amazon.com.br/", 
        "#twotabsearchtextbox",                      # Amazon search bar ID
        "div[data-component-type='s-search-result']", # Card principal
        "div[data-cy='title-recipe'] h2",          # Título
        "div[data-cy='reviews-block']",            # Avaliações / Bloco de Review [4]
        "span.a-price span.a-offscreen",           # Preço [5]
        "div[data-cy='price-recipe']",             # Condições adicionais/Pix [6]
        "div[data-cy='delivery-recipe']",          # Informações de Frete/Entrega [7]
        "#productDescription",                      # Descrição comum na página interna [8]
        "img.s-image",
        "a.a-link-normal s-no-outline"
    ],
    
    # Problema de bloqueio
    "magazineluiza": [
        "https://www.magazineluiza.com.br/",
        "#header-search-input",
        "a[data-testid='product-card-container']",  # Card principal
        "h2[data-testid='product-title']",          # Título
        "div[data-testid='review']",                # Avaliação / Estrelas [4]
        "p[data-testid='price-value']",             # Preço [5]
        "span[data-testid='in-cash']",              # Condição / Pix [6]
        "div[data-testid='productCard-shipping-tag']", # Frete / Envio [7]
        "div[data-testid='product-description']",     # Descrição (Página interna) [8]
        "img[data-testid='image']"
    ],

    # Problema de login
    "shopee": [
        "https://shopee.com.br/",
        "#header-search-input",
        "li[data-testid='product-card']",            
        "h3[data-testid='product-title']",
        "span.sc-eBMEME", 
        "p[data-testid='price-value']",
        "span.condition-placeholder",
        "div[data-testid='shipping-info']"
        "div[data-testid='product-description']",    
    ]
}

CAPTCHA_SELECTORS = [
        'iframe[src*="challenges.cloudflare.com"]',
        'iframe[title*="reCAPTCHA"]',
        '#challenge-running',
        '#challenge-stage'
    ]

STAR_OPTION_IDS = {
    5: "dropdown-option-rating-5",
    4: "dropdown-option-rating-4",
    3: "dropdown-option-rating-3",
    2: "dropdown-option-rating-2",
    1: "dropdown-option-rating-1",
}

async def initialize_browser():
    """
    Inicializa o Playwright e retorna o browser, o contexto camuflado e o próprio objeto playwright 
    para que possamos encerrá-lo corretamente depois.
    """
    p = await async_playwright().start()
    browser = await p.chromium.launch(
        headless=False,  
        args=[
            "--headless=new", 
            "--disable-gpu",
            "--blink-settings=imagesEnabled=false", 
            "--disable-blink-features=AutomationControlled", 
        ]
    )
    
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        viewport={"width": 1920, "height": 1080}
    )

    return p, browser, context

async def captcha_solver(driver, page, link, selector):
    # --- CHECAGEM DE CAPTCHA ---
    for captcha in CAPTCHA_SELECTORS:
        if await page.locator(captcha).is_visible():
            print(f" 🛑 [Bloqueio] CAPTCHA detectado em {link}. Interrompendo raspagem.")
            await driver.solve_captcha()
            await page.wait_for_timeout(2000)
            
    # --- CHECAGEM VIA TIMEOUT (Caso o captcha mude o seletor) ---
    try:
        # Tenta esperar pela barra de pesquisa por no máximo 8 segundos
        await page.wait_for_selector(selector, timeout=8000)
    except Exception:
        print(f" 🛑 [Erro/Captcha] Elemento '{selector}' não carregou. Página possivelmente bloqueada.")
        await driver.solve_captcha()
        await page.wait_for_timeout(2000)

async def fetch_deep_data(context, product_details: dict, references: list, semaphore: asyncio.Semaphore):
    """
    Helper function that visits the product page to grab descriptions and reviews.
    The semaphore ensures only 3 of these run at the exact same time.
    """
    # If the link is invalid, skip deep scraping
    if product_details["link"] == "#":
        product_details["description"] = "No link available"
        return product_details

    async with semaphore:
        page = await context.new_page()
        try:
            await page.goto(product_details["link"], wait_until="domcontentloaded")
            await page.wait_for_timeout(1000)
            
            html_content = await page.content()
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Extract Description [8]
            desc_el = soup.select_one(references[8])
            product_details["description"] = desc_el.get_text(separator="\n").strip() if desc_el else "Description unavailable"
        except Exception as e:
            product_details["description"] = "Failed to extract"
        finally:
            await page.close()
            
        return product_details
    
### ============ ESTEIRA REVIEWS + COMMENTS ============ ###

async def enrich_products_data(context, products_list: list, references: list, concurrency_limit: int = 3):
    """Função separada para buscar individualmente as descrições quando desejar."""
    semaphore = asyncio.Semaphore(concurrency_limit)
    tasks = [
        fetch_deep_data(context, product, references, semaphore)
        for product in products_list
    ]
    return await asyncio.gather(*tasks)

### ============ GET PRODUCTS INFOS ============ ###

async def get_results(driver, page, references: list, search: str, max_results: int):
    link = references[0]
    search_bar = references[1]
    await page.goto(link, wait_until="domcontentloaded")

    await captcha_solver(driver, page, link, search_bar)

    await page.click(search_bar)
    await page.fill(search_bar, search)
    await page.wait_for_timeout(500)
    await page.keyboard.press("Enter")

    await page.wait_for_selector(references[2])
    html_content = await page.content()
    
    soup = BeautifulSoup(html_content, 'html.parser')
    product_cards = soup.select(references[2])[:max_results]
    
    products_data_list = []
    for card in product_cards:
        title_el = card.select_one(references[3])
        rating_el = card.select_one(references[4])
        price_el = card.select_one(references[5])
        condition_el = card.select_one(references[6])
        shipping_el = card.select_one(references[7])
        img_el = card.select_one(references[9])

        # PEGAR LINK: Primeira tentativa: buscar o href no title_el
        product_link = title_el.get('href') if title_el else None

        # Proteção: se o link estiver vazio ou não for encontrado, tenta o elemento secundário (índice 10)
        if not product_link or product_link == "#":
            if len(references) > 10 and references[10]:
                link_el = card.select_one(references[10])
                if link_el:
                    product_link = link_el.get('href')

        # Terceira proteção: se ainda assim estiver nulo ou vazio, define como "#"
        if not product_link:
            product_link = "#"

        # Formatação segura: Só tenta concatenar se o link for válido e não for o caractere de escape "#"
        if product_link != "#" and product_link.startswith("/"):
            # Garante que não vai duplicar barras na URL
            base_url = link.rstrip('/')
            url_path = product_link.lstrip('/')
            product_link = f"{base_url}/{url_path}"
        
        product_details = {
            "title": title_el.get_text().strip() if title_el else "Unknown",
            "link": product_link,
            "rating": rating_el.get_text().strip() if rating_el else "No rating available",
            "price": price_el.get('aria-label').strip() if price_el and price_el.has_attr('aria-label') else (price_el.get_text().strip() if price_el else "Price unavailable"),
            "condition": condition_el.get_text().strip() if condition_el else "New",
            "shipping": shipping_el.get_text().strip() if shipping_el else "Not specified",
            "description": "",
            "image": img_el.get('src') if img_el else "No image available"
        }
        products_data_list.append(product_details)
        
    return products_data_list

### ============ MAIN SCRAPER ============ ###

async def run_scraper(
    query: str,
    marketplaces: list[str],
    max_results: int = 10,
) -> list[dict]:
    all_results = []

    try:
        p, browser, context = await initialize_browser()

        # Test if the marketplace is at dictionary
        for mp in marketplaces:
            mp_key = mp.lower()
            if mp_key not in REFS:
                print(f"  [!] Unknown marketplace: {mp_key}, skipping.")
                continue

            link = REFS[mp_key]
            
            # Gets the first tab
            page = await context.new_page()

            try:
                results = await get_results(context, page, link, query, max_results)
                print(f"  [{mp_key}] Collected {len(results)} valid listings")
                all_results.extend(results)
            except Exception as e:
                print(f"  [{mp_key}] Scraper failed: {e}")
                traceback.print_exc()
            finally:
                # Close the context window tab cleanly before moving to next site
                await page.close()

        await browser.close()
        await p.stop()
    finally:
        # Guarantee SeleniumBase disconnects cleanly from memory
        subprocess.run(["taskkill", "/f", "/im", "chrome.exe"])

    return all_results