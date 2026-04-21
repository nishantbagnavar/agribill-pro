import { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, User } from 'lucide-react';
import { useCustomer, useCreateCustomer, useUpdateCustomer } from '../../hooks/useCustomers.js';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  phone: z.string().min(10, 'Valid 10-digit phone required').max(15),
  whatsapp_number: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  village: z.string().optional(),
  taluka: z.string().optional(),
  district: z.string().optional(),
  pincode: z.string().optional(),
  gstin: z.string().optional(),
  notes: z.string().optional(),
});

const Field = ({ label, error, required, children }) => (
  <div>
    <label className="block font-display font-500 text-sm mb-1.5" style={{ color: 'var(--gray-700)' }}>
      {label}{required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}
  </div>
);

const inputStyle = (hasError) => ({
  borderColor: hasError ? 'var(--color-danger)' : 'var(--gray-200)',
});

import { useQueryClient } from '@tanstack/react-query';

const inputClass = 'w-full h-10 px-3 rounded-lg border font-body text-sm outline-none transition-all focus:ring-1';

export default function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const qc = useQueryClient();
  const isEdit = !!id;

  const { data: existing, isLoading: loadingExisting } = useCustomer(isEdit ? id : null);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', phone: '', whatsapp_number: '', email: '',
      address: '', village: '', taluka: '', district: '', pincode: '', gstin: '', notes: '',
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name || '',
        phone: existing.phone || '',
        whatsapp_number: existing.whatsapp_number || '',
        email: existing.email || '',
        address: existing.address || '',
        village: existing.village || '',
        taluka: existing.taluka || '',
        district: existing.district || '',
        pincode: existing.pincode || '',
        gstin: existing.gstin || '',
        notes: existing.notes || '',
      });
    }
  }, [existing, reset]);

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      whatsapp_number: data.whatsapp_number || data.phone,
      email: data.email || null,
    };
    if (isEdit) {
      await updateCustomer.mutateAsync({ id, data: payload });
    } else {
      await createCustomer.mutateAsync(payload);
    }
    await qc.invalidateQueries({ queryKey: ['customers'] });
    navigate('/customers');
  };

  if (isEdit && loadingExisting) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className="page-enter max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/customers"
          className="w-9 h-9 rounded-lg border flex items-center justify-center hover:bg-gray-50 transition-colors"
          style={{ borderColor: 'var(--gray-200)' }}
        >
          <ArrowLeft size={16} style={{ color: 'var(--gray-600)' }} />
        </Link>
        <div>
          <h1 className="font-display font-700 text-xl" style={{ color: 'var(--gray-900)' }}>
            {isEdit ? 'Edit Customer' : 'Add Customer'}
          </h1>
          <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>
            {isEdit ? `Updating ${existing?.name || ''}` : 'Register a new customer for billing'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Basic Info */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <User size={15} style={{ color: 'var(--primary)' }} />
            <h2 className="font-display font-600 text-sm" style={{ color: 'var(--gray-700)' }}>Basic Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" error={errors.name?.message} required>
              <input
                {...register('name')}
                placeholder="Ramesh Patil"
                className={inputClass}
                style={inputStyle(errors.name)}
              />
            </Field>
            <Field label="Phone Number" error={errors.phone?.message} required>
              <input
                {...register('phone')}
                type="tel"
                placeholder="9876543210"
                className={inputClass}
                style={inputStyle(errors.phone)}
              />
            </Field>
            <Field label="WhatsApp Number" error={errors.whatsapp_number?.message}>
              <input
                {...register('whatsapp_number')}
                type="tel"
                placeholder="Same as phone if blank"
                className={inputClass}
                style={inputStyle(errors.whatsapp_number)}
              />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input
                {...register('email')}
                type="email"
                placeholder="ramesh@example.com"
                className={inputClass}
                style={inputStyle(errors.email)}
              />
            </Field>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="font-display font-600 text-sm mb-2" style={{ color: 'var(--gray-700)' }}>Address Details</h2>

          <Field label="Address / Street" error={errors.address?.message}>
            <input
              {...register('address')}
              placeholder="House No., Street Name"
              className={inputClass}
              style={inputStyle(errors.address)}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Village / Town" error={errors.village?.message}>
              <input
                {...register('village')}
                placeholder="Nashik"
                className={inputClass}
                style={inputStyle(errors.village)}
              />
            </Field>
            <Field label="Taluka" error={errors.taluka?.message}>
              <input
                {...register('taluka')}
                placeholder="Sinnar"
                className={inputClass}
                style={inputStyle(errors.taluka)}
              />
            </Field>
            <Field label="District" error={errors.district?.message}>
              <input
                {...register('district')}
                placeholder="Nashik"
                className={inputClass}
                style={inputStyle(errors.district)}
              />
            </Field>
          </div>

          <Field label="Pincode" error={errors.pincode?.message}>
            <input
              {...register('pincode')}
              placeholder="422001"
              className="w-40 h-10 px-3 rounded-lg border font-body text-sm outline-none"
              style={inputStyle(errors.pincode)}
            />
          </Field>
        </div>

        {/* Business */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'white', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="font-display font-600 text-sm mb-2" style={{ color: 'var(--gray-700)' }}>Business Details (Optional)</h2>

          <Field label="GSTIN" error={errors.gstin?.message}>
            <input
              {...register('gstin')}
              placeholder="27AABCU9603R1ZJ"
              className="w-full sm:w-72 h-10 px-3 rounded-lg border font-mono text-sm outline-none uppercase"
              style={inputStyle(errors.gstin)}
            />
          </Field>

          <Field label="Notes" error={errors.notes?.message}>
            <textarea
              {...register('notes')}
              placeholder="Any notes about this customer..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border font-body text-sm outline-none resize-none"
              style={inputStyle(errors.notes)}
            />
          </Field>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            to="/customers"
            className="flex-1 sm:flex-none h-11 px-6 rounded-lg border font-display font-500 text-sm flex items-center justify-center"
            style={{ borderColor: 'var(--gray-200)', color: 'var(--gray-700)' }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || createCustomer.isPending || updateCustomer.isPending}
            className="flex-1 sm:flex-none h-11 px-8 rounded-lg font-display font-600 text-sm text-white flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-opacity"
            style={{ background: 'var(--primary-dark)' }}
          >
            {(isSubmitting || createCustomer.isPending || updateCustomer.isPending) && (
              <Loader2 size={15} className="animate-spin" />
            )}
            {isEdit ? 'Save Changes' : 'Add Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
