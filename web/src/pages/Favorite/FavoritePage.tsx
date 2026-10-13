import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { type PolozkaKosiku, type DbProdukt, type UlozeneJidlo } from '../../types/types';
import { MealCard } from './components/MealCard';
import { supabase } from '../supabaseClient';
import { fetchActiveProducts } from '../../utils/productFetcher';
import { useToast } from '../../components/useToast';
import { type User } from '@supabase/supabase-js';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [dbData, setDbData] = useState<DbProdukt[]>([]);
  const [mojeJidla, setMojeJidla] = useState<UlozeneJidlo[]>([]);
  const [user, setUser] = useState<User | null>(null);

  // Přidání na nákupní seznam s Toast notifikací namísto alertu
  const pridatNaSeznam = (ingredienceKPridani: PolozkaKosiku[]) => {
    const staryKosik = JSON.parse(localStorage.getItem('nakupni_kosik') || '[]');

    const novePolozky = ingredienceKPridani.map((ing) => ({
      ...ing,
      id: crypto.randomUUID()
    }));

    const aktualniKosik = [...staryKosik, ...novePolozky];
    localStorage.setItem('nakupni_kosik', JSON.stringify(aktualniKosik));

    showToast(`Na nákupní seznam přidáno ${ingredienceKPridani.length} položek.`, 'success');
  };

  const jitNaEditaci = (jidlo: UlozeneJidlo) => {
    navigate('/addfood', { state: { jidloKEditaci: jidlo } });
  };

  // Načtení dat přes mezipaměť a centrální fetcher
  useEffect(() => {
    const fetchSlevy = async () => {
      const data = await fetchActiveProducts();
      setDbData(data);
    };
    fetchSlevy();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadJidla = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data, error } = await supabase
          .from('user_recipes')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const typedData = data as UlozeneJidlo[];
          setMojeJidla(typedData);
          localStorage.setItem('moje_ulozena_jidla', JSON.stringify(typedData));
          return;
        }
      }

      const localData = localStorage.getItem('moje_ulozena_jidla');
      if (localData) {
        try {
          setMojeJidla(JSON.parse(localData));
        } catch {
          setMojeJidla([]);
        }
      }
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
              onEdit={() => jitNaEditaci(jidlo)}
              onAddToList={pridatNaSeznam}
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