import { supabase } from '../pages/supabaseClient';
import { type DbProdukt, type SupabaseProductRow } from '../types/types';

const CACHE_KEY = 'chytry_nakup_products_cache';
const CACHE_TIME_KEY = 'chytry_nakup_products_cache_time';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minut mezipaměť

let inMemoryCache: DbProdukt[] | null = null;
let inMemoryTimestamp = 0;

export async function fetchActiveProducts(forceRefresh = false): Promise<DbProdukt[]> {
  const now = Date.now();

  // 1. Zkontrolujeme rychlou in-memory paměť
  if (!forceRefresh && inMemoryCache && now - inMemoryTimestamp < CACHE_TTL_MS) {
    return inMemoryCache;
  }

  // 2. Zkontrolujeme sessionStorage mezipaměť
  if (!forceRefresh) {
    try {
      const savedTime = sessionStorage.getItem(CACHE_TIME_KEY);
      const savedData = sessionStorage.getItem(CACHE_KEY);
      if (savedTime && savedData && now - Number(savedTime) < CACHE_TTL_MS) {
        const parsed: DbProdukt[] = JSON.parse(savedData);
        inMemoryCache = parsed;
        inMemoryTimestamp = Number(savedTime);
        return parsed;
      }
    } catch (e) {
      console.warn('Chyba při čtení cache z sessionStorage:', e);
    }
  }

  // 3. Dotaz do Supabase
  const { data, error } = await supabase
    .from('products')
    .select('id, name, shop, category, shelf_price, amount, unit, current_price_per_unit, regular_price_per_unit, discount_percent, deal_score');

  if (error) {
    console.error('Chyba při stahování slev ze Supabase:', error);
    // Pokud máme starou cache, vrátíme ji jako záchranu
    if (inMemoryCache) return inMemoryCache;
    return [];
  }

  if (!data) return [];

  // 4. Mapování řádků se silnou typizací
  const mappedProducts: DbProdukt[] = (data as SupabaseProductRow[]).map((row) => {
    const unitPrice = parseFloat(String(row.current_price_per_unit ?? 0)) || 0;
    const shelfPrice = row.shelf_price ? parseFloat(String(row.shelf_price)) || unitPrice : unitPrice;
    const amount = row.amount ? parseFloat(String(row.amount)) || 1 : 1;

    return {
      id: String(row.id),
      name: row.name,
      shop: row.shop || 'Neznámý',
      category: row.category || 'Neurčeno',
      shelf_price: shelfPrice,
      current_price_per_unit: unitPrice,
      regular_price_per_unit: parseFloat(String(row.regular_price_per_unit ?? 0)) || 0,
      discount_percent: Math.abs(parseFloat(String(row.discount_percent ?? 0))) || 0,
      deal_score: row.deal_score ?? 0,
      amount: amount,
      unit: row.unit || 'ks'
    };
  });

  // 5. Uložíme do mezipaměti
  inMemoryCache = mappedProducts;
  inMemoryTimestamp = now;

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(mappedProducts));
    sessionStorage.setItem(CACHE_TIME_KEY, String(now));
  } catch (e) {
    console.warn('SessionStorage plná nebo nedostupná:', e);
  }

  return mappedProducts;
}
