import asyncio
from playwright.async_api import async_playwright
#from seleniumbase import sb_cdp
from seleniumbase import cdp_driver
from bs4 import BeautifulSoup
import subprocess

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
        'div[data-component-type="s-search-result"]', # Amazon individual card wrapper
        'a.a-text-normal',                            # Title anchor nested inside h2
        'span.a-a-size-small',                        # Text holding rating star counts
        'span.a-price span.a-offscreen',              # Clean hidden text price string
        'span.a-badge-text',                          # Fallback tag wrapper
        "span[aria-label*='frete']"                   # Target element mentioning shipping
        "#productDescription",                       # [8] Description
    ],
    
    "magalu": [
        "https://www.magazineluiza.com.br/",
        "#header-search-input",
        "li[data-testid='product-card']",            # Magalu card structural attribute
        "h3[data-testid='product-title']",
        "span.sc-eBMEME", 
        "p[data-testid='price-value']",
        "span.condition-placeholder",
        "div[data-testid='shipping-info']"
        "div[data-testid='product-description']",    # [8] Description (Example)
    ]
}

CAPTCHA_SELECTORS = [
        'iframe[src*="challenges.cloudflare.com"]',
        'iframe[title*="reCAPTCHA"]',
        '#challenge-running',
        '#challenge-stage'
    ]

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

async def enrich_products_data(context, products_list: list, references: list, concurrency_limit: int = 3):
    """Função separada para buscar individualmente as descrições quando desejar."""
    semaphore = asyncio.Semaphore(concurrency_limit)
    tasks = [
        fetch_deep_data(context, product, references, semaphore)
        for product in products_list
    ]
    return await asyncio.gather(*tasks)

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

        product_link = title_el.get('href') if title_el else "#"
        if product_link.startswith("/"):
            product_link = f"{link}{product_link}"
        
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

async def run_scraper(
    query: str,
    marketplaces: list[str],
    max_results: int = 10,
) -> list[dict]:
    """
    Scrape the given marketplaces for `query`.
    Returns a flat list of product dicts, each with:
        marketplace, title, price (float, BRL), url
    """

    driver = await cdp_driver.start_async()
    endpoint_url = driver.get_endpoint_url()
    
    all_results = []

    try:
        async with async_playwright() as p:
            browser = await p.chromium.connect_over_cdp(endpoint_url)

            # Test if the marketplace is at dictionary
            for mp in marketplaces:
                mp_key = mp.lower()
                if mp_key not in REFS:
                    print(f"  [!] Unknown marketplace: {mp_key}, skipping.")
                    continue

                link = REFS[mp_key]
                
                # Gets the first tab
                page = browser.contexts[0].pages[0]

                try:
                    results = await get_results(driver, page, link, query, max_results)
                    print(f"  [{mp_key}] Collected {len(results)} valid listings")
                    all_results.extend(results)
                except Exception as e:
                    print(f"  [{mp_key}] Scraper failed: {e}")
                finally:
                    # Close the context window tab cleanly before moving to next site
                    await page.close()

            await browser.close()
    finally:
        # Guarantee SeleniumBase disconnects cleanly from memory
        subprocess.run(["taskkill", "/f", "/im", "chrome.exe"])

    return all_results


# ---------------------------------------------------------------------------
# Quick test
# ---------------------------------------------------------------------------

"""
listed = ["mercadolivre", "amazon", "magalu"]
check = [True, False, False]
marketplaces = []

for index, value in enumerate(check):
    if value == True:
        marketplaces.append(listed[index])

if __name__ == "__main__":
    query = "Samsung Galaxy A15"
    print(f"\nSearching for: '{query}'")
    print(f"Marketplaces : {', '.join(marketplaces)}\n")

    final_data = asyncio.run(run_scraper(query, marketplaces, max_results=5))

    # Print the final enriched payload
    for item in final_data:
        print(f"\nTitle: {item['title']}")
        print(f"Price: {item['price']}")
        print(f"Description Snippet: {item['description'][:100]}...")
        print(f"Total Reviews Pulled: {len(item['reviews'])}")"""