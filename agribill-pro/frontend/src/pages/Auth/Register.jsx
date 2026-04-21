import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Leaf, Loader2 } from 'lucide-react';
import { authApi } from '../../api/auth.api.js';
import { useAuthStore } from '../../store/auth.store.js';
import toast from 'react-hot-toast';

const schema = z.object({
  shop_name: z.string().min(2, 'Shop name required'),
  name: z.string().min(2, 'Owner name required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Valid phone required'),
  password: z.string().min(8, 'Min 8 characters'),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

const Field = ({ label, error, children }) => (
  <div>
    <label className="block font-display font-500 text-sm mb-1.5" style={{ color: 'var(--gray-700)' }}>
      {label}
    </label>
    {children}
    {error && <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}
  </div>
);

const inputClass = (hasError) =>
  `w-full h-10 px-3 rounded-lg border font-body text-sm outline-none transition-all focus:border-brand-500`;

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const { confirm_password, ...payload } = data;
      const res = await authApi.register(payload);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success('Shop registered! Welcome to AgriBill Pro 🌾');
      navigate('/dashboard');
    } catch (err) {
      const emailErr = err.response?.data?.errors?.email?.[0];
      toast.error(emailErr || err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 page-enter"
      style={{ background: 'linear-gradient(135deg, #EDF8F2 0%, #FFFBEB 100%)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-8"
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
            <p className="text-xs font-body" style={{ color: 'var(--gray-500)' }}>Set up your agri shop</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Shop Name" error={errors.shop_name?.message}>
              <input
                placeholder="Shree Agro Store"
                className={inputClass(errors.shop_name)}
                style={{ borderColor: errors.shop_name ? 'var(--color-danger)' : 'var(--gray-200)' }}
                {...register('shop_name')}
              />
            </Field>
            <Field label="Owner Name" error={errors.name?.message}>
              <input
                placeholder="Ramesh Patil"
                className={inputClass(errors.name)}
                style={{ borderColor: errors.name ? 'var(--color-danger)' : 'var(--gray-200)' }}
                {...register('name')}
              />
            </Field>
          </div>

          <Field label="Email" error={errors.email?.message}>
            <input
              type="email"
              placeholder="you@example.com"
              className={inputClass(errors.email)}
              style={{ borderColor: errors.email ? 'var(--color-danger)' : 'var(--gray-200)' }}
              {...register('email')}
            />
          </Field>

          <Field label="Phone" error={errors.phone?.message}>
            <input
              type="tel"
              placeholder="9876543210"
              className={inputClass(errors.phone)}
              style={{ borderColor: errors.phone ? 'var(--color-danger)' : 'var(--gray-200)' }}
              {...register('phone')}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Password" error={errors.password?.message}>
              <input
                type="password"
                placeholder="Min 8 chars"
                className={inputClass(errors.password)}
                style={{ borderColor: errors.password ? 'var(--color-danger)' : 'var(--gray-200)' }}
                {...register('password')}
              />
            </Field>
            <Field label="Confirm Password" error={errors.confirm_password?.message}>
              <input
                type="password"
                placeholder="Repeat password"
                className={inputClass(errors.confirm_password)}
                style={{ borderColor: errors.confirm_password ? 'var(--color-danger)' : 'var(--gray-200)' }}
                {...register('confirm_password')}
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-lg font-display font-600 text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60 mt-2"
            style={{ background: 'var(--primary-dark)' }}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? 'Setting up...' : 'Create Shop Account'}
          </button>
        </form>

        <p className="mt-6 text-center font-body text-sm" style={{ color: 'var(--gray-500)' }}>
          Already registered?{' '}
          <Link to="/login" className="font-600" style={{ color: 'var(--primary)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
