import { BEZNE_CENY } from '../data/bezne_ceny';
import {
  type DbProdukt,
  type PolozkaKosiku,
  type VysledekHledani,
  type VysledekObchodu,
  type DetailPolozky,
  type ProduktDefinice,
  type SupabaseFuzzyRpcRow
} from '../types/types';
import { supabase } from '../pages/supabaseClient';


// ==========================================
// 1. KONFIGURACE A POMOCNÉ FUNKCE
// ==========================================

// Odstraní diakritiku a převede na malá písmena
const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const LIMITY_PRO_KUSOVKY: Record<string, number> = {
  'toaletní papír': 7,
  'mléko': 11,
  'pivo': 10,
  'vejce': 9,
};

// 🔥 VYLEPŠENÝ SLOVNÍK: Používáme kořeny slov (stems) pro lepší shodu
// Např. 'mlek' najde 'mléko', 'mléka', 'mléčný'...
const ROZSIRENE_HLEDANI: Record<string, string[]> = {
  'pivo': ['pivo', 'piv', 'pilsner', 'kozel', 'radegast', 'gambrinus', 'svijany', 'budvar', 'ležák'],
  'mléko': ['mlek', 'trvanliv', 'čerstv', 'plnotuč', 'polotuč', 'mléčn'],
  'máslo': ['másl', 'madeta', 'jihočesk'],
  'kuřecí': ['kuřec', 'prsa', 'řízky', 'čtvrtky', 'stehen'],
  'vejce': ['vejc', 'vajíč'],
  'pečivo': ['rohlík', 'housk', 'chléb', 'chleb', 'baget', 'bulk', 'kaiserk'],
  'zelenina': ['rajč', 'okurk', 'paprik', 'mrkev', 'mrkv', 'brambor', 'cibul'],
  'ovoce': ['jablk', 'banán', 'pomeranč', 'citron'],
  'toaletní papír': ['toalet', 'papír', 'tento', 'zewa', 'harmasan'],
  'mouka': ['mouk', 'hladk', 'polohrub', 'hrub'],
  // Konkrétní položky, které se často liší koncovkou
  'rajče': ['rajč', 'tomat'],
  'rajčata': ['rajč', 'tomat'],
  'brambory': ['brambor'],
  'okurka': ['okurk', 'hadov'],
  'cibule': ['cibul'],
  'chléb': ['chléb', 'chleb', 'konzumní', 'šumava'],
  'cukr': ['cukr', 'krupic', 'krystal'],
  'olej': ['olej', 'slunečnic', 'řepkov'],
  'kofola': ['kofol'],
  'coca cola': ['coca', 'cola'],
  'těstoviny': ['těstovin', 'špaget', 'fusilli', 'kolínk', 'penne']
};

/**
 * Získá kořen slova (odstraní poslední písmeno, pokud je to samohláska nebo 'y')
 * Pomáhá najít shodu mezi "Avokádo" a "Avokáda".
 */
const ziskatKorenSlova = (slovo: string): string => {
    if (slovo.length < 4) return slovo; // Příliš krátká slova nekrátíme
    return slovo.replace(/[aáeéěiíoóuúůyý]$/, ''); 
};

/**
 * FALLBACK metoda pro parsování balení z názvu
 */
const parsovatVelikostBaleniRegex = (nazevProduktu: string): number => {
  const regex = /(\d+)\s*(?:ks|rol|x\b|rolí|l\b)/i;
  const match = nazevProduktu.match(regex);
  if (match && match[1]) {
    const hodnota = parseInt(match[1], 10);
    return hodnota > 0 ? hodnota : 1;
  }
  return 1;
};

const ziskatLimit = (nazevZbozi: string): number => {
  const normNazev = normalize(nazevZbozi);
  const klic = Object.keys(LIMITY_PRO_KUSOVKY).find(k => normNazev.includes(k));
  return klic ? LIMITY_PRO_KUSOVKY[klic] : 1;
};

// ==========================================
// 2. HLAVNÍ LOGIKA VÝPOČTU KOŠÍKU
// ==========================================

export const spocitatCenyProObchody = (seznamPolozek: PolozkaKosiku[], databazeAkci: DbProdukt[]): VysledekObchodu[] => {

  const unikatniObchody = Array.from(new Set(databazeAkci.map(p => p.shop)));
  const vysledky: VysledekObchodu[] = [];

  for (const obchod of unikatniObchody) {
    let suma = 0;
    let nalezenoPocet = 0;
    const chybi: string[] = [];
    const detail: DetailPolozky[] = [];

    for (const polozka of seznamPolozek) {
      const hledanyNazev = normalize(polozka.nazev);
      
      // 1. Získáme klíčová slova z našeho chytrého slovníku
      let klicovaSlova = ROZSIRENE_HLEDANI[hledanyNazev];

      // 2. Pokud ve slovníku nejsou, vytvoříme je dynamicky z názvu
      if (!klicovaSlova) {
          const slova = hledanyNazev.split(' ');
          // Přidáme původní slova + jejich "ořezané" verze (kořeny)
          klicovaSlova = [...slova, ...slova.map(ziskatKorenSlova)];
      }

      const hledaneStitky = polozka.vybraneStitky.map(s => normalize(s));
      const limitProMalyNakup = ziskatLimit(polozka.nazev);
      const jeVelkyNakup = polozka.jednotka === 'ks' && polozka.pocet > limitProMalyNakup;

      // Filtrujeme produkty z daného obchodu
      let kandidati = databazeAkci.filter(p => p.shop === obchod);

      // 🔥 HLAVNÍ FILTR: Hledáme shodu
      kandidati = kandidati.filter(p => {
        const jmenoProduktu = normalize(p.name);
        // Stačí, aby název produktu obsahoval ALESPOŇ JEDNO klíčové slovo
        // Příklad: "Rajče" -> klíč "rajč" -> najde "Rajčata keříková"
        return klicovaSlova.some(slovo => jmenoProduktu.includes(slovo));
      });

      if (kandidati.length > 0) {
        const obodovaniKandidati = kandidati.map(p => {
          const jmenoProduktu = normalize(p.name);

          let velikostBaleni = 1;
          if (p.amount && Number(p.amount) > 1) {
            velikostBaleni = Number(p.amount);
          } else {
            velikostBaleni = parsovatVelikostBaleniRegex(p.name);
          }

          let cenaZaBaleni = 0;
          if (p.shelf_price && Number(p.shelf_price) > 0) {
            cenaZaBaleni = Number(p.shelf_price);
          } else {
            cenaZaBaleni = p.current_price_per_unit * velikostBaleni;
          }

          let skore = 0;
          hledaneStitky.forEach(stitek => { if (jmenoProduktu.includes(stitek)) skore += 100; });
          
          // Bonus za shodu s klíčovými slovy
          klicovaSlova.forEach(slovo => { if (jmenoProduktu.includes(slovo)) skore += 1; });
          
          // Bonus za přesnou shodu délky (aby "Mléko" nevyhrálo nad "Mléko 12ks" pokud nechceme)
          // Ale tady to necháme jednoduché.

          let skutecnaCenaCelkem = 0;
          let pocetBaleniKeKoupi = 0;
          let poznamka = '';

          if (polozka.jednotka === 'balení') {
            pocetBaleniKeKoupi = polozka.pocet;
            skutecnaCenaCelkem = cenaZaBaleni * pocetBaleniKeKoupi;
            poznamka = `Cena za ${pocetBaleniKeKoupi}x balení`;
          } else {
            pocetBaleniKeKoupi = Math.ceil(polozka.pocet / velikostBaleni);
            skutecnaCenaCelkem = pocetBaleniKeKoupi * cenaZaBaleni;
            if (velikostBaleni > 1) {
              poznamka = `(Koupeno ${pocetBaleniKeKoupi}x po ${velikostBaleni}ks)`;
            }
          }

          return {
            produkt: p,
            skore,
            celkovaCena: skutecnaCenaCelkem,
            unitPrice: p.current_price_per_unit,
            shelfPrice: cenaZaBaleni,
            pocetBaleni: pocetBaleniKeKoupi,
            poznamka
          };
        });

        obodovaniKandidati.sort((a, b) => {
          if (a.skore !== b.skore) return b.skore - a.skore;
          if (jeVelkyNakup) return a.unitPrice - b.unitPrice;
          return a.celkovaCena - b.celkovaCena;
        });

        const vitezData = obodovaniKandidati[0];
        suma += vitezData.celkovaCena;
        nalezenoPocet++;

        detail.push({
          nazevZbozi: polozka.nazev,
          cenaZaKus: vitezData.shelfPrice,
          pocet: vitezData.pocetBaleni,
          celkemZaPolozku: vitezData.celkovaCena,
          produktVDB: vitezData.produkt,
          typCeny: 'akce',
        });

      } else {
        // FALLBACK NA BĚŽNÉ CENY
        // I tady použijeme vylepšené hledání
        let beznaCenaKus = BEZNE_CENY[hledanyNazev];
        
        if (!beznaCenaKus) {
          // Zkusíme najít v BEZNE_CENY pomocí klíčových slov (stems)
          // Projdeme všechny klíče v BEZNE_CENY a hledáme shodu
          const nalezenaBezna = Object.keys(BEZNE_CENY).find(key => {
             const normKey = normalize(key);
             return klicovaSlova.some(slovo => normKey.includes(slovo));
          });
          if (nalezenaBezna) beznaCenaKus = BEZNE_CENY[nalezenaBezna];
        }

        if (beznaCenaKus) {
          const cenaCelkem = beznaCenaKus * polozka.pocet;
          suma += cenaCelkem;
          nalezenoPocet++;

          detail.push({
            nazevZbozi: polozka.nazev,
            cenaZaKus: beznaCenaKus,
            pocet: polozka.pocet,
            celkemZaPolozku: cenaCelkem,
            produktVDB: {
              id: 'standard',
              name: `${polozka.nazev} (běžná cena)`,
              shop: obchod,
              shelf_price: beznaCenaKus,
              current_price_per_unit: beznaCenaKus,
              regular_price_per_unit: beznaCenaKus,
              amount: 1, unit: polozka.jednotka, discount_percent: 0, category: 'Standard', deal_score: 0
            },
            typCeny: 'standard'
          });
        } else {
          chybi.push(polozka.nazev);
          // U chybějící položky nepřičítáme fiktivní 1 Kč - celková cena reflektuje pouze reálně nalezené položky
        }
      }
    }

    vysledky.push({
      nazevObchodu: obchod,
      celkovaCena: suma,
      pocetNalezenychPolozek: nalezenoPocet,
      chybejiciPolozky: chybi,
      detailNakupu: detail
    });
  }

  vysledky.sort((a, b) => {
    const chybiA = a.chybejiciPolozky.length;
    const chybiB = b.chybejiciPolozky.length;
    if (chybiA !== chybiB) return chybiA - chybiB;
    return a.celkovaCena - b.celkovaCena;
  });

  return vysledky;
};

// ==========================================
// 3. GLOBÁLNÍ HLEDÁNÍ (Stránka Optimum)
// ==========================================

export const najitNejlepsiProduktyGlobalne = (seznamPolozek: PolozkaKosiku[], databazeAkci: DbProdukt[]): VysledekHledani[] => {
  const nalezeneCeny: VysledekHledani[] = [];

  for (const polozka of seznamPolozek) {
    const hledanyNazev = normalize(polozka.nazev);
    
    // Používáme stejnou vylepšenou logiku i zde
    let klicovaSlova = ROZSIRENE_HLEDANI[hledanyNazev];
    if (!klicovaSlova) {
        const slova = hledanyNazev.split(' ');
        klicovaSlova = [...slova, ...slova.map(ziskatKorenSlova)];
    }

    const kandidati = databazeAkci.filter(p => {
      const jmeno = normalize(p.name);
      return klicovaSlova.some(slovo => jmeno.includes(slovo));
    });

    const obodovani = kandidati.map(p => {
      let skore = 0;
      const jmeno = normalize(p.name);
      // Pokud je shoda s názvem, dáme skóre
      klicovaSlova.forEach(slovo => { if (jmeno.includes(slovo)) skore += 1; });
      return { p, skore };
    });

    obodovani.sort((a, b) => {
      if (a.skore !== b.skore) return b.skore - a.skore;
      return a.p.current_price_per_unit - b.p.current_price_per_unit;
    });

    nalezeneCeny.push({
      hledano: polozka.nazev,
      nalezeno: obodovani.slice(0, 3).map(o => o.p)
    });
  }
  return nalezeneCeny;
}

// ==========================================
// 4. FUZZY NAŠEPTÁVAČ
// ==========================================

export const searchProductsFuzzy = async (searchTerm: string): Promise<ProduktDefinice[]> => {
  if (!searchTerm || searchTerm.length < 2) return [];

  const { data, error } = await supabase
    .rpc('search_products_fuzzy', { search_term: searchTerm });

  if (error) {
    console.error('❌ Chyba při fuzzy hledání:', error);
    return [];
  }

  const rows = (data || []) as SupabaseFuzzyRpcRow[];

  return rows.map((item) => ({
      id: item.id,
      nazev: item.nazev,
      icon: item.icon || '🛒',
      vychoziJednotka: 'ks',
      mozneJednotky: ['ks', 'kg', 'balení'], 
      stitky: [], 
      source: item.source,
      shop: item.shop,
      price: item.price
  }));
};