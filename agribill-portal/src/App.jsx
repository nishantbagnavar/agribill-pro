import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import PortalDashboard from './pages/PortalDashboard.jsx';

export default function App() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="portal/:key" element={<PortalDashboard />} />
    </Routes>
  );
}
