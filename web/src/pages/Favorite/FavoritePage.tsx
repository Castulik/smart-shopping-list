import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { type PolozkaKosiku, type DbProdukt } from '../../types/types';
import { MealCard } from './components/MealCard';
import { supabase } from '../supabaseClient'; // Potřebujeme Supabase

interface UlozeneJidlo {
  id: string;
  nazev: string;
  emoji: string;
  ingredience: PolozkaKosiku[];
}

export default function FavoritesPage() {
  const navigate = useNavigate();

  // STAV PRO DATA Z DATABÁZE (CENY)
  const [dbData, setDbData] = useState<DbProdukt[]>([]);
  const [mojeJidla, setMojeJidla] = useState<UlozeneJidlo[]>([]);

  // FUNKCE: Přidání na nákupní seznam (upravená verze)
  const pridatNaSeznam = (ingredienceKPridani: PolozkaKosiku[]) => {
    const staryKosik = JSON.parse(localStorage.getItem('nakupni_kosik') || '[]');

    // Vytvoříme kopie s novými UUID
    const novePolozky = ingredienceKPridani.map(ing => ({
      ...ing,
      id: crypto.randomUUID()
    }));

    const aktualniKosik = [...staryKosik, ...novePolozky];
    localStorage.setItem('nakupni_kosik', JSON.stringify(aktualniKosik));

    // Volitelný feedback (Toast nebo Alert)
    alert(`Na seznam bylo přidáno ${ingredienceKPridani.length} položek.`);
  };

  // FUNKCE: Přechod na editaci
  const jitNaEditaci = (jidlo: UlozeneJidlo) => {
    navigate('/addfood', { state: { jidloKEditaci: jidlo } });
  };

  // EFEKT: Stáhnout aktuální letáky při načtení stránky
  useEffect(() => {
    const fetchSlevy = async () => {
      const { data, error } = await supabase.from('products').select('*');

      if (!error && data) {
        // Mapping (stejný jako v OptimumPage - důležité pro čísla!)
        const mappedData: DbProdukt[] = data.map((row: any) => ({
          id: String(row.id),
          name: row.name,
          shop: row.shop,
          category: row.category || 'Neurčeno',
          shelf_price: parseFloat(row.current_price_per_unit) || 0,
          current_price_per_unit: parseFloat(row.current_price_per_unit) || 0,
          regular_price_per_unit: parseFloat(row.regular_price_per_unit) || 0,
          discount_percent: Math.abs(parseFloat(row.discount_percent)) || 0,
          deal_score: row.deal_score || 0,
          amount: 1,
          unit: 'ks'
        }));
        setDbData(mappedData);
      }
    };
    fetchSlevy();
  }, []);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Zjistíme, jestli je někdo přihlášený
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // V FavoritesPage.tsx uprav useEffect pro načítání receptů:

  useEffect(() => {
    const loadJidla = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Jsme online - zkusíme Supabase
        const { data, error } = await supabase
          .from('user_recipes')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setMojeJidla(data);
          // Volitelně: aktualizuj localStorage, aby byl aktuální i offline
          localStorage.setItem('moje_ulozena_jidla', JSON.stringify(data));
          return;
        }
      }

      // Nejsme přihlášeni nebo Supabase selhal - vezmi lokální
      const localData = localStorage.getItem('moje_ulozena_jidla');
      if (localData) setMojeJidla(JSON.parse(localData));
    };

    loadJidla();
  }, []);

  const koupitJidlo = (jidlo: UlozeneJidlo) => {
    navigate('/optimum', { state: { kosik: jidlo.ingredience } });
  };

  return (
    <div className="pb-24">

      {!user && (
        <div className="bg-linear-to-r from-emerald-500 to-teal-600 rounded-3xl p-6 mb-8 text-white shadow-lg shadow-emerald-200">
          <h3 className="font-bold text-lg mb-1">Nepřijď o své recepty! 👨‍🍳</h3>
          <p className="text-emerald-50 text-sm mb-4">Přihlas se a měj je uložené v bezpečí cloudu.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-white text-emerald-600 px-6 py-2 rounded-full font-bold text-sm shadow-sm active:scale-95 transition-transform"
          >
            Přihlásit se
          </button>
        </div>
      )}

      {/* Hlavička */}
      <div className="flex justify-between items-center mb-6 mt-2">
        <h2 className="text-xl font-bold text-gray-800">Moje recepty</h2>

        <button
          className="bg-primary text-white px-4 py-2 rounded-full flex items-center gap-1.5 font-semibold text-sm shadow-md shadow-blue-500/20 active:scale-95 transition-transform"
          onClick={() => navigate('/addfood')}
        >

          <Plus size={18} />
          <span>Sestavit</span>
        </button>
      </div>

      <div className="grid gap-4">
        {mojeJidla.length > 0 ? (
          mojeJidla.map((jidlo) => (
            <MealCard
              key={jidlo.id}
              jidlo={jidlo}
              dbData={dbData}
              onBuy={koupitJidlo}
              onEdit={() => jitNaEditaci(jidlo)} // NOVÉ
              onAddToList={pridatNaSeznam} // NOVÉ
            />
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-4xl border-2 border-dashed border-gray-100">
            <div className="text-4xl mb-4">👨‍🍳</div>
            <p className="text-gray-500 font-medium">Zatím tu nemáš žádné recepty.</p>
            <button
              onClick={() => navigate('/addfood')}
              className="mt-4 text-primary font-bold text-sm"
            >
              Vytvořit první jídlo →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}