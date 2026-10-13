import json
import time
import os
from core.scraper import KupiScraper
from core.analytics import analyze_price_history
from core.database import save_product_to_db

def run_scraper_pipeline():
    scraper = KupiScraper()
    
    # Načtení kategorií ze souboru (pokud existuje)
    categories = []
    cat_file = os.path.join(os.path.dirname(__file__), 'categories.json')
    if os.path.exists(cat_file):
        with open(cat_file, 'r') as f:
            categories = json.load(f)
    else:
        # Fallback, pokud soubor chybí
        categories = ["pecivo", "ovoce-a-zelenina", "mlecne-vyrobky-a-vejce"]

    print(f"🚀 Začínám scraping pro {len(categories)} kategorií.")

    for category in categories:
        print(f"\n📂 Zpracovávám kategorii: {category}")
        
        # 1. Stáhnout seznam produktů (výchozí 1, v GH Actions nebo produkci lze nastavit např. 3 nebo 0 = vše)
        max_pages = int(os.environ.get("SCRAPER_MAX_PAGES", "1"))
        products_json = scraper.get_discounts_by_category(category, max_pages=max_pages)
        products = json.loads(products_json)
        
        print(f"   -> Nalezeno {len(products)} produktů.")

        for i, product in enumerate(products):
            url = product.get('product_url')
            if not url:
                continue

            # 2. Stáhnout historii cen (detail produktu)
            # print(f"   [{i+1}/{len(products)}] Stahuji detail: {product['name']}")
            history = scraper.get_price_history(url)
            
            if history:
                # Přidáme ID produktu k informacím (získáno z detailu)
                product['id'] = history.get('id')
                
                # 3. Analýza cen
                metrics = analyze_price_history(history)
                
                # 4. Uložení do Supabase
                if metrics:
                    save_product_to_db(product, metrics)
            
            # Zpomalení proti zablokování (buď hodný robot)
            time.sleep(1.5)

if __name__ == "__main__":
    run_scraper_pipeline()