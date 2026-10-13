import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { type User } from '@supabase/supabase-js';
import { LogOut, LogIn, Store, ShieldCheck, Check } from 'lucide-react';
import { useToast } from '../../components/useToast';

const DOSTUPNE_OBCHODY = [
  'Lidl',
  'Kaufland',
  'Albert',
  'Billa',
  'Tesco',
  'Penny',
  'COOP',
  'Globus',
  'CBA',
  'JIP CC Cash & Carry'
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [vybraneObchody, setVybraneObchody] = useState<string[]>(() => {
    try {
      const ulozene = localStorage.getItem('oblibene_obchody');
      return ulozene ? JSON.parse(ulozene) : [];
    } catch {
      return [];
    }
  });

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

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast('Chyba při odhlašování: ' + error.message, 'error');
    } else {
      showToast('Úspěšně odhlášeno', 'info');
      setUser(null);
    }
  };

  const toggleObchod = (obchod: string) => {
    let nove: string[];
    if (vybraneObchody.includes(obchod)) {
      nove = vybraneObchody.filter((o) => o !== obchod);
    } else {
      nove = [...vybraneObchody, obchod];
    }
    setVybraneObchody(nove);
    localStorage.setItem('oblibene_obchody', JSON.stringify(nove));
  };

  const vybratVsechny = () => {
    setVybraneObchody([]);
    localStorage.removeItem('oblibene_obchody');
    showToast('Filtry vypnuty – zobrazují se všechny obchody', 'info');
  };

  return (
    <div className="pb-24 pt-2">
      {/* 1. Uživatelský profil */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
          Uživatelský účet
        </h2>

        {user ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 font-bold text-xl rounded-2xl flex items-center justify-center">
                {user.email ? user.email[0].toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-800 truncate">{user.email}</div>
                <div className="text-xs text-emerald-600 flex items-center gap-1">
                  <ShieldCheck size={14} />
                  <span>Cloud synchronizace aktivní</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full bg-red-50 text-red-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-red-100"
            >
              <LogOut size={18} />
              <span>Odhlásit se</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">
              Přihlaste se, abyste neztratili uložené recepty a nákupní košík při změně zařízení.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-emerald-500 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
            >
              <LogIn size={18} />
              <span>Přihlásit se přes Google</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Filtrování obchodů */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Store size={18} className="text-gray-400" />
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Preferované řetězce
            </h2>
          </div>
          {vybraneObchody.length > 0 && (
            <button
              onClick={vybratVsechny}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Zobrazit všechny
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 mb-4">
          {vybraneObchody.length === 0
            ? 'Aktuálně se porovnávají všechny řetězce. Kliknutím vyberte jen své oblíbené:'
            : `Vybráno ${vybraneObchody.length} řetězců. Ve výsledcích uvidíte jen tyto:`}
        </p>

        <div className="flex flex-wrap gap-2">
          {DOSTUPNE_OBCHODY.map((obchod) => {
            const isSelected = vybraneObchody.includes(obchod);
            return (
              <button
                key={obchod}
                onClick={() => toggleObchod(obchod)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-blue-50 border-blue-300 text-primary shadow-xs'
                    : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {isSelected && <Check size={14} />}
                <span>{obchod}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Informace o aplikaci */}
      <div className="text-center text-xs text-gray-400 py-4 space-y-1">
        <p className="font-semibold text-gray-500">Chytrý Nákup PWA</p>
        <p>Verze 1.0.0 (TSX Production)</p>
      </div>
    </div>
  );
}
