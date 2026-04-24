import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { useAuthStore } from './store/auth.store.js';
import AppLayout from './components/Layout/AppLayout.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Lazy pages — stubs for sessions 7-9 (replaced as sessions complete)
import { lazy, Suspense } from 'react';

const LandingPage    = lazy(() => import('./pages/LandingPage/index.jsx'));
const Login          = lazy(() => import('./pages/Auth/Login.jsx'));
const Register       = lazy(() => import('./pages/Auth/Register.jsx'));
const Dashboard      = lazy(() => import('./pages/Dashboard/index.jsx'));
const Inventory      = lazy(() => import('./pages/Inventory/index.jsx'));
const Categories     = lazy(() => import('./pages/Inventory/Categories.jsx'));
const ProductForm    = lazy(() => import('./pages/Inventory/ProductForm.jsx'));
const StockAdjust    = lazy(() => import('./pages/Inventory/StockAdjust.jsx'));
const Billing        = lazy(() => import('./pages/Billing/index.jsx'));
const BillHistory    = lazy(() => import('./pages/Billing/BillHistory.jsx'));
const BillPreview    = lazy(() => import('./pages/Billing/BillPreview.jsx'));
const Customers      = lazy(() => import('./pages/Customers/index.jsx'));
const CustomerForm   = lazy(() => import('./pages/Customers/CustomerForm.jsx'));
const CustomerLedger = lazy(() => import('./pages/Customers/CustomerLedger.jsx'));
const Reminders      = lazy(() => import('./pages/Reminders/index.jsx'));
const WhatsApp       = lazy(() => import('./pages/WhatsApp/index.jsx'));
const Settings       = lazy(() => import('./pages/Settings/index.jsx'));
const GSTReport      = lazy(() => import('./pages/Reports/GSTReport.jsx'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--surface-page)' }}>
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: 'var(--green-100)' }}
        >
          🌾
        </div>
        <p className="font-display text-sm" style={{ color: 'var(--gray-500)' }}>Loading...</p>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: 'var(--surface-page)' }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
        style={{ background: 'var(--green-100)' }}
      >
        🌾
      </div>
      <h1 className="font-display font-700 text-4xl" style={{ color: 'var(--gray-900)' }}>404</h1>
      <p className="font-body text-base" style={{ color: 'var(--gray-500)' }}>Page not found</p>
      <Link
        to="/dashboard"
        className="h-10 px-6 rounded-lg font-display font-600 text-sm text-white flex items-center"
        style={{ background: 'var(--primary-dark)' }}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

function AuthGuard({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function GuestGuard({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<GuestGuard><Login /></GuestGuard>} />
          <Route path="/register" element={<GuestGuard><Register /></GuestGuard>} />

          {/* Protected */}
          <Route
            element={
              <AuthGuard>
                <AppLayout />
              </AuthGuard>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/inventory/categories" element={<Categories />} />
            <Route path="/inventory/product/new" element={<ProductForm />} />
            <Route path="/inventory/product/:id/edit" element={<ProductForm />} />
            <Route path="/inventory/product/:id/stock" element={<StockAdjust />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/billing/history" element={<BillHistory />} />
            <Route path="/billing/:id/preview" element={<BillPreview />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/new" element={<CustomerForm />} />
            <Route path="/customers/:id/edit" element={<CustomerForm />} />
            <Route path="/customers/:id/ledger" element={<CustomerLedger />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/whatsapp" element={<WhatsApp />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/reports" element={<Navigate to="/reports/gst" replace />} />
            <Route path="/reports/gst" element={<GSTReport />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default Sentry.withProfiler(App);
