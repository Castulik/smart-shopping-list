import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Settings, ArrowLeft } from 'lucide-react';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const showBottomNav = ['/', '/favorite', '/optimum', "/addfood"].includes(location.pathname);
  const showBackArrow = !['/', '/favorite'].includes(location.pathname);
  const showSettings = ['/', '/favorite'].includes(location.pathname);

  const getPageTitle = (): string => {
    switch (location.pathname) {
      case '/': return 'Nákupní seznam';
      case '/favorite': return 'Oblíbená jídla';
      case '/settings': return 'Nastavení';
      case '/optimum': return 'Výsledky hledání';
      case '/addfood': return 'Přidej recept';
      default: return 'Aplikace';
    }
  };

  return (
    <div className="min-h-screen w-full relative pb-20 pt-16"> 
      {/* pt-16 = odsazení obsahu odshora (aby nezalezl pod header)
         pb-20 = odsazení obsahu odspodu (aby nezalezl pod bottom nav)
      */}

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 px-4 flex items-center justify-between border-b border-gray-200/50 bg-surface backdrop-blur-md shadow-sm transition-all">
        <div className="w-10 flex items-center justify-start">
          {showBackArrow && (
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full active:bg-gray-100 transition-colors">
              <ArrowLeft size={24} className="text-gray-700" />
            </button>
          )}
        </div>
        
        <h1 className="flex-1 text-center text-lg font-semibold text-gray-800 truncate">
          {getPageTitle()}
        </h1>

        <div className="w-10 flex items-center justify-end">
          {showSettings && (
            <button onClick={() => navigate('/settings')} className="p-2 -mr-2 rounded-full active:bg-gray-100 transition-colors">
              <Settings size={24} className="text-gray-700" />
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="container mx-auto px-4 max-w-3xl animate-fade-in">
        <Outlet />
      </main>

      {/* BOTTOM NAV */}
      {showBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 flex justify-around items-center border-t border-gray-200/50 bg-surface backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
          <NavLink 
            to="/" 
            className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors ${isActive ? "text-primary" : "text-gray-400 hover:text-gray-600"}`}
          >
            <ShoppingCart size={24} strokeWidth={2} className="mb-1" />
            <span>Nákup</span>
          </NavLink>
          
          <NavLink 
            to="/favorite" 
            className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors ${isActive ? "text-primary" : "text-gray-400 hover:text-gray-600"}`}
          >
            <Heart size={24} strokeWidth={2} className="mb-1" />
            <span>Oblíbené</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
};

export default Layout;