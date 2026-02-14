// src/pages/Auth/LoginPage.tsx
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Smartphone, Zap } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin, // Vrátí uživatele na hlavní stranu
      },
    });
    if (error) console.error('Chyba při přihlašování:', error.message);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-6 py-12">
      {/* Horní část s ikonou */}
      <div className="w-20 h-20 bg-emerald-100 rounded-[28px] flex items-center justify-center mb-8 shadow-sm">
        <ShieldCheck size={40} className="text-emerald-600" />
      </div>

      <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-2">
        Tvoje recepty v bezpečí
      </h1>
      <p className="text-gray-500 text-center mb-10 max-w-70">
        Přihlas se a měj své nákupní seznamy a recepty dostupné na všech zařízeních.
      </p>

      {/* Benefity */}
      <div className="w-full max-w-sm space-y-4 mb-12">
        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="bg-blue-50 p-2 rounded-lg text-blue-500"><Smartphone size={20} /></div>
          <span className="text-sm font-medium text-gray-700">Synchronizace mobil + PC</span>
        </div>
        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="bg-amber-50 p-2 rounded-lg text-amber-500"><Zap size={20} /></div>
          <span className="text-sm font-medium text-gray-700">Záloha receptů při ztrátě dat</span>
        </div>
      </div>

      {/* Hlavní akce */}
      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={handleGoogleLogin}
          className="w-full bg-white text-gray-700 font-bold py-4 rounded-2xl shadow-md border border-gray-200 flex items-center justify-center gap-3 active:scale-95 transition-transform"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          <span>Pokračovat přes Google</span>
        </button>

        <button
          onClick={() => navigate(-1)}
          className="w-full text-gray-400 font-medium py-4 text-sm hover:text-gray-600 transition-colors"
        >
          Zatím pokračovat bez přihlášení
        </button>
      </div>

      <p className="mt-auto text-[10px] text-gray-400 text-center uppercase tracking-widest">
        Zabezpečeno přes Supabase Auth
      </p>
    </div>
  );
}