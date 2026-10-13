import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { type ProduktDefinice, type PolozkaKosiku, type SupabaseGlobalProductRow } from '../../types/types'
import { supabase } from '../supabaseClient'
import { searchProductsFuzzy } from '../../utils/ceny';
import { useToast } from '../../components/useToast';
import { Trash2 } from 'lucide-react';

// Import komponent
import { QuickAddBar } from './components/QuickAddBar'
import { ShoppingList } from './components/ShoppingList'
import { ProductForm } from './components/ProductForm'

export default function NakupPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // --- STAVY (LOGIKA) ---

  // 1. Inicializace košíku z LocalStorage
  const [kosik, setKosik] = useState<PolozkaKosiku[]>(() => {
    const ulozenaData = localStorage.getItem('nakupni_kosik');
    if (ulozenaData) {
      try {
        return JSON.parse(ulozenaData);
      } catch (e) {
        console.error("Chyba při čtení košíku", e);
        return [];
      }
    }
    return [];
  });

  // 2. Automatické ukládání při každé změně (Hybridní verze)
  useEffect(() => {
    localStorage.setItem('nakupni_kosik', JSON.stringify(kosik));

    const syncCartToCloud = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await supabase.from('user_carts').upsert({
          user_id: session.user.id,
          items: kosik,
          updated_at: new Date().toISOString()
        });
      }
    };

    syncCartToCloud();
  }, [kosik]);

  const [databazePotravin, setDatabazePotravin] = useState<ProduktDefinice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- EFEKT: NAČTENÍ DAT PRO RYCHLOU VOLBU (QuickAddBar) ---
  useEffect(() => {
    const fetchProdukty = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from('global_products').select('*').limit(20);

      if (error) {
        console.error('Chyba při načítání:', error);
      } else if (data) {
        const rows = data as SupabaseGlobalProductRow[];
        const mappedData: ProduktDefinice[] = rows.map((item) => ({
          id: item.id,
          nazev: item.nazev,
          icon: item.icon,
          vychoziJednotka: item.vychozi_jednotka,
          mozneJednotky: item.mozne_jednotky,
          stitky: item.stitky || []
        }));
        setDatabazePotravin(mappedData);
      }
      setIsLoading(false);
    };
    fetchProdukty();
  }, []);

  // Stavy formuláře
  const [vstup, setVstup] = useState('')
  const [naseptavacProdukty, setnaseptavacProdukty] = useState<ProduktDefinice[]>([])
  const [vybranyProdukt, setVybranyProdukt] = useState<ProduktDefinice | null>(null)

  // Detail produktu
  const [pocet, setPocet] = useState(1)
  const [jednotka, setJednotka] = useState('ks')
  const [aktivniStitky, setAktivniStitky] = useState<string[]>([])
  const [upravovaneId, setUpravovaneId] = useState<string | null>(null);

  const handleVstupChange = (novyVstup: string) => {
    setVstup(novyVstup);
    if (!novyVstup || novyVstup.trim().length < 2) {
      setnaseptavacProdukty([]);
    }
  };

  // 🔥 VYHLEDÁVÁNÍ (Debounce + Supabase Fuzzy) bez synchronních setState v těle efektu 🔥
  useEffect(() => {
    if (!vstup || vstup.trim().length < 2) {
      return;
    }

    if (vybranyProdukt && vybranyProdukt.nazev === vstup) {
      return;
    }

    let isCurrent = true;
    const timeoutId = setTimeout(async () => {
      try {
        const vysledky = await searchProductsFuzzy(vstup);
        if (isCurrent) {
          setnaseptavacProdukty(vysledky);
        }
      } catch (err) {
        console.error("Chyba při hledání:", err);
      }
    }, 300);

    return () => {
      isCurrent = false;
      clearTimeout(timeoutId);
    };
  }, [vstup, vybranyProdukt]);

  // --- FUNKCE PRO VÝBĚR A FORMULÁŘ ---
  const vyberProdukt = (produkt: ProduktDefinice) => {
    setVybranyProdukt(produkt);
    setVstup(produkt.nazev);
    setJednotka(produkt.vychoziJednotka || 'ks');
    setPocet(1);
    setAktivniStitky([]);
    setnaseptavacProdukty([]);
  }

  const vyberVlastni = () => {
    const novyProdukt: ProduktDefinice = {
      id: 'custom-item',
      nazev: vstup,
      icon: '🛒',
      vychoziJednotka: 'ks',
      mozneJednotky: ['ks', 'kg', 'l', 'g', 'balení'],
      stitky: []
    };
    setVybranyProdukt(novyProdukt);
    setnaseptavacProdukty([]);
    setJednotka('ks');
  }

  const editovatPolozku = (polozka: PolozkaKosiku) => {
    setUpravovaneId(polozka.id);
    setVybranyProdukt({
      id: 'edit-item',
      nazev: polozka.nazev,
      icon: '✏️',
      vychoziJednotka: polozka.jednotka,
      mozneJednotky: ['ks', 'kg', 'l', 'g', 'balení'],
      stitky: []
    });

    setVstup(polozka.nazev);
    setPocet(polozka.pocet);
    setJednotka(polozka.jednotka);
    setAktivniStitky(polozka.vybraneStitky);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const toggleStitek = (stitek: string) => {
    if (aktivniStitky.includes(stitek)) {
      setAktivniStitky(aktivniStitky.filter(s => s !== stitek))
    } else {
      setAktivniStitky([...aktivniStitky, stitek])
    }
  }

  useEffect(() => {
    const fetchCloudCart = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data, error } = await supabase
          .from('user_carts')
          .select('items')
          .single();

        if (!error && data && data.items) {
          const localData = localStorage.getItem('nakupni_kosik');
          if (!localData || JSON.parse(localData).length === 0) {
            setKosik(data.items);
          }
        }
      }
    };

    fetchCloudCart();
  }, []);

  const pridatDoKosiku = async () => {
    if (!vybranyProdukt) return;

    if (vybranyProdukt.id === 'custom-item' && !upravovaneId) {
      try {
        await supabase
          .from('user_suggestions')
          .insert([{ nazev: vybranyProdukt.nazev }]);
      } catch (err) {
        console.error("Chyba při ukládání návrhu:", err);
      }
    }

    if (upravovaneId) {
      setKosik(kosik.map(p => p.id === upravovaneId ? {
        ...p,
        nazev: vybranyProdukt.nazev,
        pocet: pocet,
        jednotka: jednotka,
        vybraneStitky: aktivniStitky
      } : p));
      showToast('Položka upravena', 'success');
    } else {
      const novaPolozka: PolozkaKosiku = {
        id: crypto.randomUUID(),
        nazev: vybranyProdukt.nazev,
        pocet: pocet,
        jednotka: jednotka,
        vybraneStitky: aktivniStitky
      };
      setKosik([...kosik, novaPolozka]);
      showToast(`Přidáno: ${pocet}x ${vybranyProdukt.nazev}`, 'success');
    }

    ResetFormulare();
  }

  const ResetFormulare = () => {
    setVstup('');
    setVybranyProdukt(null);
    setAktivniStitky([]);
    setPocet(1);
    setJednotka('ks');
    setUpravovaneId(null);
    setnaseptavacProdukty([]);
  }

  const smazPolozku = (id: string) => {
    setKosik(kosik.filter(p => p.id !== id));
    if (upravovaneId === id) ResetFormulare();
    showToast('Položka odebrána z košíku', 'info');
  }

  const vysypatKosik = () => {
    if (kosik.length === 0) return;
    if (window.confirm('Opravdu chcete vyprázdnit celý nákupní košík?')) {
      setKosik([]);
      ResetFormulare();
      showToast('Košík byl vyprázdněn', 'info');
    }
  };

  const jitNaVysledky = () => navigate('/optimum', { state: { kosik: kosik } })

  // --- VZHLED (RENDER) ---
  return (
    <div className="pb-32">
      <ProductForm
        kosik={true}
        vstup={vstup}
        setVstup={handleVstupChange}
        naseptavacProdukty={naseptavacProdukty}
        vybranyProdukt={vybranyProdukt}
        onVybratZNaspetavace={vyberProdukt}
        onVybratVlastni={vyberVlastni}
        pocet={pocet}
        setPocet={setPocet}
        jednotka={jednotka}
        setJednotka={setJednotka}
        aktivniStitky={aktivniStitky}
        toggleStitek={toggleStitek}
        onConfirm={pridatDoKosiku}
        onCancel={ResetFormulare}
        submitLabel={upravovaneId ? '💾 Uložit změny' : undefined}
      />

      {!isLoading && databazePotravin.length > 0 && !upravovaneId && (
        <QuickAddBar
          produkty={databazePotravin.slice(0, 8)}
          onSelect={vyberProdukt}
        />
      )}

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2 px-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            V košíku ({kosik.length})
          </h3>
          {kosik.length > 0 && (
            <button
              onClick={vysypatKosik}
              className="text-xs text-red-500 font-semibold flex items-center gap-1 hover:underline active:scale-95 transition-transform"
            >
              <Trash2 size={13} />
              <span>Vysypat košík</span>
            </button>
          )}
        </div>
        <ShoppingList
          kosik={true}
          items={kosik}
          onDelete={smazPolozku}
          onEdit={editovatPolozku}
        />
      </div>

      {kosik.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40">
          <button
            className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            onClick={jitNaVysledky}
          >
            <span>🚀 Přejít k hledání cen</span>
          </button>
        </div>
      )}
    </div>
  )
}