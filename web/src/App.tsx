import { useEffect } from 'react'; // 1. Přidán import useEffect
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import NakupPage from './pages/Nakup/NakupPage';
import OptimumPage from './pages/Optimum/OptimumPage';
import FavoritePage from './pages/Favorite/FavoritePage';
import AddFoodPage from './pages/Favorite/AddFoodPage';
import LoginPage from './pages/Auth/LoginPage';
import { supabase } from './pages/supabaseClient';

const SettingsPage = () => (
  <div className="page-content">
    <p>Verze: 1.0.0 TSX</p>
  </div>
);

// --- MIGRAČNÍ FUNKCE (Tohle jsi měl dobře, jen to nikdo nevolal) ---
const syncLocalDataToCloud = async (userId: string) => {
  console.log("🔄 Začínám synchronizaci dat na uživatele:", userId);

  // 1. Synchronizace receptů
  const localRecipes = JSON.parse(localStorage.getItem('moje_ulozena_jidla') || '[]');
  if (localRecipes.length > 0) {
    const cloudRecipes = localRecipes.map((r: any) => ({
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

  // --- TOTO JE TA CHYBĚJÍCÍ ČÁST ---
  useEffect(() => {
    // Supabase nám dává metodu, která se spustí pokaždé, když se změní stav přihlášení
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      
      // Event 'SIGNED_IN' nastane, když se uživatel úspěšně přihlásí (např. vrátí z Google loginu)
      // Event 'INITIAL_SESSION' nastane, když uživatel obnoví stránku a už je přihlášený
      if (event === 'SIGNED_IN' && session) {
        syncLocalDataToCloud(session.user.id);
      }
    });

    // Úklid (cleanup) při zavření aplikace
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  // ----------------------------------

  return (
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
  );
}

export default App;