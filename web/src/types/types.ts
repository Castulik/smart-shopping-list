// src/types.ts

export interface ProduktDefinice {
  id: string;
  nazev: string;
  icon: string;
  // Změň snake_case na camelCase:
  vychoziJednotka: string; // Místo vychozi_jednotka
  mozneJednotky: string[]; // Místo mozne_jednotky
  stitky: string[];
  
  // Volitelné nové pole
  source?: string;
  shop?: string | null;
  price?: number | null;
}

export interface PolozkaKosiku {
  id: string
  nazev: string
  pocet: number
  jednotka: string
  vybraneStitky: string[]
}

export interface DbProdukt {
  id: string;
  name: string;
  shop: string;
  category: string;
  shelf_price: number;
  amount: number;
  unit: string;
  current_price_per_unit: number;
  regular_price_per_unit: number;
  discount_percent: number;
  deal_score: number;
}

export interface DetailPolozky {
    nazevZbozi: string;
    cenaZaKus: number;
    pocet: number;
    celkemZaPolozku: number;
    produktVDB: DbProdukt; // Znovužití jiného typu
    typCeny?: 'akce' | 'standard'; // <--- NOVÉ
}

export interface VysledekObchodu {
  nazevObchodu: string;
  celkovaCena: number;
  pocetNalezenychPolozek: number;
  chybejiciPolozky: string[];
  // 2. POUŽITÍ - Mnohem čistší
  detailNakupu: DetailPolozky[]; 
}

export interface VysledekHledani {
  hledano: string;
  nalezeno: DbProdukt[];
}

export interface UlozeneJidlo {
  id: string;
  nazev: string;
  emoji: string;
  ingredience: PolozkaKosiku[];
  user_id?: string;
  created_at?: string;
}

export interface SupabaseGlobalProductRow {
  id: string;
  nazev: string;
  icon: string;
  vychozi_jednotka: string;
  mozne_jednotky: string[];
  stitky?: string[] | null;
}

export interface SupabaseProductRow {
  id: string | number;
  name: string;
  shop: string;
  category?: string | null;
  shelf_price?: number | string | null;
  current_price_per_unit?: number | string | null;
  regular_price_per_unit?: number | string | null;
  discount_percent?: number | string | null;
  deal_score?: number | null;
  amount?: number | string | null;
  unit?: string | null;
}

export interface SupabaseFuzzyRpcRow {
  id: string;
  nazev: string;
  icon?: string | null;
  source?: string;
  shop?: string | null;
  price?: number | null;
}