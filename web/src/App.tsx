import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import NakupPage from './pages/Nakup/NakupPage';
import OptimumPage from './pages/Optimum/OptimumPage';
import FavoritePage from './pages/Favorite/FavoritePage';
import AddFoodPage from './pages/Favorite/AddFoodPage';

const SettingsPage = () => (
  <div className="page-content">
    <p>Verze: 1.0.0 TSX</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<NakupPage />} />
          <Route path="favorite" element={<FavoritePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="optimum" element={<OptimumPage />} />
          <Route path="addfood" element={<AddFoodPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;