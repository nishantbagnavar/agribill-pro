import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

function ErrorFallback({ error, resetError }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 p-8"
      style={{ background: 'var(--surface-page)' }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--color-danger-bg)' }}
      >
        <AlertTriangle size={28} style={{ color: 'var(--color-danger)' }} />
      </div>
      <div className="text-center max-w-md">
        <h2 className="font-display font-700 text-xl mb-2" style={{ color: 'var(--gray-900)' }}>
          Something went wrong
        </h2>
        <p className="font-body text-sm" style={{ color: 'var(--gray-500)' }}>
          {error?.message || 'An unexpected error occurred. This has been reported automatically.'}
        </p>
      </div>
      <button
        onClick={resetError}
        className="flex items-center gap-2 h-10 px-6 rounded-lg font-display font-600 text-sm text-white"
        style={{ background: 'var(--primary-dark)' }}
      >
        <RefreshCw size={14} />
        Try Again
      </button>
    </div>
  );
}

export default function ErrorBoundary({ children }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback error={error} resetError={resetError} />
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
