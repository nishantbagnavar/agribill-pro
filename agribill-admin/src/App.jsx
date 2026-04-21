import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import ShopsOverview from './pages/ShopsOverview.jsx';
import ShopDetail from './pages/ShopDetail.jsx';
import NewShop from './pages/NewShop.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ShopsOverview />} />
        <Route path="shops/:id" element={<ShopDetail />} />
        <Route path="new-shop" element={<NewShop />} />
      </Route>
    </Routes>
  );
}
