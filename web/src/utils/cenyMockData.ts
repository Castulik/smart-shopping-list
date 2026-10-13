import testovaciData from '../data/mock_data.json';
import { BEZNE_CENY } from '../data/bezne_ceny';
import { type DbProdukt, type PolozkaKosiku, type VysledekHledani, type VysledekObchodu, type DetailPolozky } from '../types/types';

// Pomocná funkce na malá písmena (pro porovnávání)
const normalize = (str: string) => str.toLowerCase();

// Slovník synonym stále dává smysl (v DB může být "Pilsner", i když uživatel zadal "Pivo")
const ROZSIRENE_HLEDANI: Record<string, string[]> = {
  'pivo': ['pivo', 'pilsner', 'kozel', 'radegast', 'gambrinus', 'svijany', 'budvar'],
  'mléko': ['mléko', 'trvanlivé', 'čerstvé', 'plnotučné', 'polotučné'],
  'máslo': ['máslo', 'madeta', 'jihočeské'],
  'kuřecí': ['kuřecí', 'prsa', 'řízky', 'čtvrtky', 'stehenní'],
  'vejce': ['vejce', 'vajíčka'],
  'pečivo': ['rohlík', 'houska', 'chléb', 'bageta', 'bulka', 'kaiserka'],
  'zelenina': ['rajče', 'okurka', 'paprika', 'mrkev', 'brambory', 'cibule'],
  'ovoce': ['jablko', 'banán', 'pomeranč', 'citron'],
  'toaletní papír': ['toaletní', 'papír', 'tento', 'zewa', 'harmasan'],
  'mouka': ['mouka', 'hladká', 'polohrubá', 'hrubá']
};

export const spocitatCenyProObchody = (seznamPolozek: PolozkaKosiku[]): VysledekObchodu[] => {
  const unikatniObchody = Array.from(new Set((testovaciData as DbProdukt[]).map(p => p.shop)));
  const vysledky: VysledekObchodu[] = [];

  for (const obchod of unikatniObchody) {
    let suma = 0;
    let nalezenoPocet = 0;
    const chybi: string[] = [];
    const detail: DetailPolozky[] = [];

    for (const polozka of seznamPolozek) {
      // 1. Příprava hledaných výrazů
      const hledanyNazev = normalize(polozka.nazev);
      // Klíčová slova: buď synonyma, nebo slova z názvu (např. "Kuřecí prsa" -> ["kuřecí", "prsa"])
      const klicovaSlova = ROZSIRENE_HLEDANI[hledanyNazev] || hledanyNazev.split(' ');
      const hledaneStitky = polozka.vybraneStitky.map(s => normalize(s));

      // --- 1. POKUS: Hledáme v AKCÍCH (Smart Scoring) ---
      
      // Filtrujeme produkty daného obchodu
      let kandidati = (testovaciData as DbProdukt[]).filter(p => p.shop === obchod);
      
      // A) Základní filtr: Produkt musí obsahovat alespoň část názvu (klíčové slovo)
      kandidati = kandidati.filter(p => {
        const jmenoProduktu = normalize(p.name);
        return klicovaSlova.some(slovo => jmenoProduktu.includes(slovo));
      });

      if (kandidati.length > 0) {
        // B) SKÓROVÁNÍ (Tady se děje to kouzlo se štítky)
        const obodovaniKandidati = kandidati.map(p => {
            let skore = 0;
            const jmenoProduktu = normalize(p.name);

            // Pravidlo 1: Bonus za shodu štítku (např. "3vrstvý")
            hledaneStitky.forEach(stitek => {
                if (jmenoProduktu.includes(stitek)) {
                    skore += 100; // Velký bonus! Trefili jsme specifikaci.
                }
            });

            // Pravidlo 2: Malý bonus za shodu více klíčových slov (přesnější název)
            klicovaSlova.forEach(slovo => {
                if (jmenoProduktu.includes(slovo)) skore += 1;
            });

            return { produkt: p, skore };
        });

        // C) ŘAZENÍ
        // 1. Podle skóre (sestupně) - kdo má víc štítků, vyhrává
        // 2. Podle ceny (vzestupně) - když je skóre stejné, bereme levnější
        obodovaniKandidati.sort((a, b) => {
            if (a.skore !== b.skore) return b.skore - a.skore;
            return a.produkt.shelf_price - b.produkt.shelf_price;
        });

        // Vítěz je ten nahoře
        const vitez = obodovaniKandidati[0].produkt;
        const cenaCelkem = vitez.shelf_price * polozka.pocet;

        suma += cenaCelkem;
        nalezenoPocet++;

        detail.push({
          nazevZbozi: polozka.nazev,
          cenaZaKus: vitez.shelf_price,
          pocet: polozka.pocet,
          celkemZaPolozku: cenaCelkem,
          produktVDB: vitez,
          typCeny: 'akce'
        });

      } else {
        // --- 2. POKUS: BĚŽNÉ CENY (Fallback) ---
        // Pokud nenajdeme akci, použijeme "záchranný ceník"
        let beznaCenaKus = BEZNE_CENY[hledanyNazev];
        
        // Zkusíme najít cenu i pro klíčové slovo (např. hledám "Vejce M", ceník má "vejce")
        if (!beznaCenaKus) {
             const klic = klicovaSlova.find(k => BEZNE_CENY[k]);
             if (klic) beznaCenaKus = BEZNE_CENY[klic];
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
                name: `${polozka.nazev} ${polozka.vybraneStitky.join(' ')} (běžná cena)`, // Do názvu dáme i štítky
                shop: obchod, 
                shelf_price: beznaCenaKus, 
                current_price_per_unit: beznaCenaKus, 
                regular_price_per_unit: beznaCenaKus,
                amount: 1, 
                unit: polozka.jednotka,
                discount_percent: 0,
                category: 'Standard',
                deal_score: 0
            },
            typCeny: 'standard'
          });

        } else {
          // 3. NENAŠLI JSME NIC
          chybi.push(polozka.nazev);
          suma += 1000; // Penalizace
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

  // Seřazení obchodů: Nejdřív podle počtu chybějících, pak podle ceny
  vysledky.sort((a, b) => {
      const chybiA = a.chybejiciPolozky.length;
      const chybiB = b.chybejiciPolozky.length;
      if (chybiA !== chybiB) return chybiA - chybiB;
      return a.celkovaCena - b.celkovaCena;
  });

  return vysledky;
};

// Funkce pro globální hledání (také vylepšená o skóre)
export const najitNejlepsiProduktyGlobalne = (seznamPolozek: PolozkaKosiku[]): VysledekHledani[] => {
    const nalezeneCeny: VysledekHledani[] = [];

    for (const polozka of seznamPolozek) {
        const hledanyNazev = normalize(polozka.nazev);
        const klicovaSlova = ROZSIRENE_HLEDANI[hledanyNazev] || hledanyNazev.split(' ');
        const hledaneStitky = polozka.vybraneStitky.map(s => normalize(s));

        // 1. Filtrujeme
        const kandidati = (testovaciData as DbProdukt[]).filter(p => {
             const jmeno = normalize(p.name);
             return klicovaSlova.some(slovo => jmeno.includes(slovo));
        });

        // 2. Skórujeme
        const obodovani = kandidati.map(p => {
             let skore = 0;
             const jmeno = normalize(p.name);
             hledaneStitky.forEach(stitek => {
                 if (jmeno.includes(stitek)) skore += 100;
             });
             return { p, skore };
        });

        // 3. Řadíme (Skóre > Jednotková cena)
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