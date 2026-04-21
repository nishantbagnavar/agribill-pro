import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Leaf, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authApi } from '../../api/auth.api.js';
import { useAuthStore } from '../../store/auth.store.js';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

export default function Login() {
  const [showPwd, setShowPwd] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const res = await authApi.login(data);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 page-enter"
      style={{ background: 'linear-gradient(135deg, #EDF8F2 0%, #FFFBEB 100%)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{ background: 'white', boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--green-100)' }}
          >
            <Leaf size={20} style={{ color: 'var(--primary-dark)' }} />
          </div>
          <div>
            <p className="font-display font-700 text-base" style={{ color: 'var(--primary-dark)' }}>
              AgriBill Pro
            </p>
            <p className="text-xs font-body" style={{ color: 'var(--gray-500)' }}>Sign in to your account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block font-display font-500 text-sm mb-1.5" style={{ color: 'var(--gray-700)' }}>
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full h-10 px-3 rounded-lg border font-body text-sm outline-none transition-all"
              style={{
                borderColor: errors.email ? 'var(--color-danger)' : 'var(--gray-200)',
                boxShadow: errors.email ? '0 0 0 2px var(--color-danger-bg)' : 'none',
              }}
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block font-display font-500 text-sm mb-1.5" style={{ color: 'var(--gray-700)' }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full h-10 px-3 pr-10 rounded-lg border font-body text-sm outline-none transition-all"
                style={{
                  borderColor: errors.password ? 'var(--color-danger)' : 'var(--gray-200)',
                }}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-lg font-display font-600 text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: 'var(--primary-dark)' }}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center font-body text-sm" style={{ color: 'var(--gray-500)' }}>
          First time?{' '}
          <Link to="/register" className="font-600" style={{ color: 'var(--primary)' }}>
            Set up your shop
          </Link>
        </p>
      </div>
    </div>
  );
}
