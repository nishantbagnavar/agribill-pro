import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, X, Loader2, Package, ArrowLeft } from 'lucide-react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../../hooks/useProducts.js';
import toast from 'react-hot-toast';

const ICONS = ['🌿','🌱','🐛','🍄','🌾','⚗️','🔧','📦','💊','🧪','🌻','🥬'];

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  icon: z.string().optional(),
  description: z.string().optional(),
});

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div
        className="w-full max-w-md rounded-2xl p-6 relative"
        style={{ background: 'white', boxShadow: 'var(--shadow-lg)', animation: 'scale-in 0.15s ease' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-700 text-base" style={{ color: 'var(--gray-900)' }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} style={{ color: 'var(--gray-500)' }} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CategoryModal({ category, onClose }) {
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const [selectedIcon, setSelectedIcon] = useState(category?.icon || '📦');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: category?.name || '', description: category?.description || '' },
  });

  const onSubmit = async (data) => {
    const payload = { ...data, icon: selectedIcon };
    if (category) {
      await update.mutateAsync({ id: category.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  };

  return (
    <Modal title={category ? 'Edit Category' : 'Add Category'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block font-display font-500 text-xs mb-1.5" style={{ color: 'var(--gray-700)' }}>Category Name</label>
          <input
            placeholder="e.g. Fertilizers"
            className="w-full h-10 px-3 rounded-lg border text-sm font-body outline-none transition-all"
            style={{ borderColor: errors.name ? 'var(--color-danger)' : 'var(--gray-200)' }}
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{errors.name.message}</p>}
        </div>

        <div>
          <label className="block font-display font-500 text-xs mb-2" style={{ color: 'var(--gray-700)' }}>Icon</label>
          <div className="flex flex-wrap gap-2">
            {ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setSelectedIcon(ic)}
                className="w-9 h-9 rounded-lg text-lg transition-all"
                style={{
                  background: selectedIcon === ic ? 'var(--green-100)' : 'var(--gray-100)',
                  border: selectedIcon === ic ? '2px solid var(--primary)' : '2px solid transparent',
                }}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-display font-500 text-xs mb-1.5" style={{ color: 'var(--gray-700)' }}>Description (optional)</label>
          <input
            placeholder="Short description"
            className="w-full h-10 px-3 rounded-lg border text-sm font-body outline-none"
            style={{ borderColor: 'var(--gray-200)' }}
            {...register('description')}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-lg font-display font-500 text-sm border transition-all hover:bg-gray-50"
            style={{ borderColor: 'var(--gray-200)', color: 'var(--gray-700)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 h-10 rounded-lg font-display font-600 text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: 'var(--primary-dark)' }}
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {category ? 'Save Changes' : 'Add Category'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Categories() {
  const { data: categories, isLoading } = useCategories();
  const deleteCategory = useDeleteCategory();
  const [modal, setModal] = useState(null); // null | 'add' | category object

  const handleDelete = (cat) => {
    if (!window.confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;
    deleteCategory.mutate(cat.id);
  };

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/inventory"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--gray-500)' }}
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display font-700 text-xl" style={{ color: 'var(--gray-900)' }}>Categories</h1>
            <p className="font-body text-xs" style={{ color: 'var(--gray-400)' }}>
              {categories?.length ?? 0} categories
            </p>
          </div>
        </div>
        <button
          onClick={() => setModal('add')}
          className="h-9 px-4 rounded-lg font-display font-600 text-sm text-white flex items-center gap-1.5 transition-all hover:opacity-90"
          style={{ background: 'var(--primary-dark)' }}
        >
          <Plus size={14} />
          Add Category
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'var(--gray-200)' }} />
          ))}
        </div>
      ) : categories?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-xl p-5 relative group transition-all duration-200 hover:-translate-y-1"
              style={{ background: 'white', boxShadow: 'var(--shadow-card)', border: '1px solid var(--gray-200)' }}
            >
              <div className="text-3xl mb-3">{cat.icon || '📦'}</div>
              <p className="font-display font-600 text-sm mb-0.5 truncate" style={{ color: 'var(--gray-900)' }}>{cat.name}</p>
              <p className="font-mono text-xs" style={{ color: 'var(--gray-400)' }}>
                {cat.product_count ?? 0} products
              </p>

              {/* Action buttons — show on hover */}
              <div
                className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <button
                  onClick={() => setModal(cat)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
                  title="Edit"
                >
                  <Pencil size={13} style={{ color: 'var(--gray-500)' }} />
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 size={13} style={{ color: 'var(--color-danger)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="text-5xl">🌾</div>
          <p className="font-display font-600 text-base" style={{ color: 'var(--gray-700)' }}>No categories yet</p>
          <p className="font-body text-sm" style={{ color: 'var(--gray-400)' }}>Add your first product category to get started</p>
          <button
            onClick={() => setModal('add')}
            className="mt-2 h-9 px-4 rounded-lg font-display font-600 text-sm text-white"
            style={{ background: 'var(--primary-dark)' }}
          >
            Add Category
          </button>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <CategoryModal
          category={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
