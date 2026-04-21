import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, ChromeIcon } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import toast from 'react-hot-toast';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'bagnavarnishant@gmail.com';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email === ADMIN_EMAIL) navigate('/', { replace: true });
    });
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0F4F2' }}>
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-sm text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1F6F5F' }}>
            <Leaf size={20} className="text-white" />
          </div>
          <div className="text-left">
            <p className="font-display font-700 text-lg leading-tight text-gray-900">AgriBill Pro</p>
            <p className="text-xs font-display text-gray-400">Admin Dashboard</p>
          </div>
        </div>

        <h1 className="font-display font-600 text-xl text-gray-900 mb-2">Sign In</h1>
        <p className="text-sm text-gray-500 mb-8">Restricted to authorized admin only</p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-display font-500 text-sm transition-colors disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Continue with Google
        </button>

        <p className="mt-6 text-xs text-gray-400">
          Only <span className="font-mono text-gray-500">{ADMIN_EMAIL}</span> can access this panel.
        </p>
      </div>
    </div>
  );
}
