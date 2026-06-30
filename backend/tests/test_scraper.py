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
        print(f"Total Reviews Pulled: {len(item['reviews'])}")
"""