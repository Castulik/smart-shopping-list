import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import NakupPage from './pages/Nakup/NakupPage';
import OptimumPage from './pages/Optimum/OptimumPage';
import FavoritePage from './pages/Favorite/FavoritePage';
import AddFoodPage from './pages/Favorite/AddFoodPage';
import LoginPage from './pages/Auth/LoginPage';
import SettingsPage from './pages/Settings/SettingsPage';
import { supabase } from './pages/supabaseClient';
import { ToastProvider } from './components/Toast';
import { type UlozeneJidlo } from './types/types';

// --- MIGRAČNÍ FUNKCE ---
const syncLocalDataToCloud = async (userId: string) => {
  console.log("🔄 Začínám synchronizaci dat na uživatele:", userId);

  // 1. Synchronizace receptů
  const localRecipes: UlozeneJidlo[] = JSON.parse(localStorage.getItem('moje_ulozena_jidla') || '[]');
  if (localRecipes.length > 0) {
    const cloudRecipes = localRecipes.map((r) => ({
      ...r,
      user_id: userId,
    }));
    
    const { error } = await supabase.from('user_recipes').upsert(cloudRecipes);
    if (error) console.error("Chyba sync receptů:", error);
    else console.log("✅ Recepty nahrány do cloudu");
  }

  // 2. Synchronizace košíku
  const localCart = JSON.parse(localStorage.getItem('nakupni_kosik') || '[]');
  if (localCart.length > 0) {
    const { error } = await supabase.from('user_carts').upsert({
      user_id: userId,
      items: localCart
    });
    if (error) console.error("Chyba sync košíku:", error);
    else console.log("✅ Košík nahrán do cloudu");
  }
};

function App() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        syncLocalDataToCloud(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<NakupPage />} />
            <Route path="favorite" element={<FavoritePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="optimum" element={<OptimumPage />} />
            <Route path="addfood" element={<AddFoodPage />} />
            <Route path="login" element={<LoginPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;