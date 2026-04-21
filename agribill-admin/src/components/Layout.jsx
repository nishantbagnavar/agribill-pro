import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Plus, LogOut, Leaf, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import toast from 'react-hot-toast';

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: '#1F6F5F' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
            <Leaf size={16} className="text-green-200" />
          </div>
          <div>
            <p className="text-white font-display font-600 text-sm leading-tight">AgriBill</p>
            <p className="text-green-300 text-xs font-display">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 h-9 rounded-md text-sm font-display font-500 transition-colors ${
                isActive ? 'bg-white/15 text-white' : 'text-green-200 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <LayoutDashboard size={16} />
            All Shops
          </NavLink>
          <NavLink
            to="/new-shop"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 h-9 rounded-md text-sm font-display font-500 transition-colors ${
                isActive ? 'bg-white/15 text-white' : 'text-green-200 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Plus size={16} />
            New Shop
          </NavLink>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2 px-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={14} className="text-green-300" />
            </div>
            <p className="text-green-300 text-xs font-display truncate">Admin</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 h-8 rounded-md text-green-300 hover:text-white hover:bg-white/10 text-xs font-display transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
