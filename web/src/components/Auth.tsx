// src/components/Auth.tsx
import { supabase } from '../pages/supabaseClient';

export default function Auth() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  return (
    <button 
      onClick={handleLogin}
      className="bg-white text-gray-700 px-4 py-2 rounded-xl shadow-sm border font-medium flex items-center gap-2"
    >
      <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="G" />
      Přihlásit se přes Google
    </button>
  );
}