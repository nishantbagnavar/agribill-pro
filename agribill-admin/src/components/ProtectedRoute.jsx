import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'bagnavarnishant@gmail.com';

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setStatus('unauthenticated'); return; }
      if (session.user.email !== ADMIN_EMAIL) {
        supabase.auth.signOut();
        setStatus('unauthorized');
        return;
      }
      setStatus('ok');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setStatus('unauthenticated'); return; }
      if (session.user.email !== ADMIN_EMAIL) {
        supabase.auth.signOut();
        setStatus('unauthorized');
        return;
      }
      setStatus('ok');
    });
    return () => subscription.unsubscribe();
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (status === 'unauthorized') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-2xl font-display font-600 text-red-600 mb-2">Unauthorized</p>
          <p className="text-gray-500 text-sm">This dashboard is restricted to admin only.</p>
        </div>
      </div>
    );
  }
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  return children;
}
