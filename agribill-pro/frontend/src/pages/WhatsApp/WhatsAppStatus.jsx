import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappApi } from '../../api/whatsapp.api.js';
import { Smartphone, LogOut, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WhatsAppStatus() {
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: () => whatsappApi.getStatus().then((r) => r.data.data),
    refetchInterval: (data) => (data?.status === 'QR_READY' ? 3000 : 15000), // polling
  });

  const disconnectMutation = useMutation({
    mutationFn: () => whatsappApi.disconnect(),
    onSuccess: () => {
      toast.success('WhatsApp disconnected');
      qc.invalidateQueries(['whatsapp-status']);
      qc.invalidateQueries(['wa-status']); // for app layout
    },
    onError: () => toast.error('Failed to disconnect'),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  const { status, qr, phone } = data || { status: 'DISCONNECTED' };

  return (
    <div className="bg-white rounded-xl p-6 relative overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
        <div>
          <h2 className="font-display font-600 text-lg flex items-center gap-2">
            <Smartphone size={20} className="text-[var(--primary)]" />
            Connection Status
          </h2>
          <p className="text-sm text-gray-500 font-body mt-1">
            Link your WhatsApp account to enable automated messaging
          </p>
        </div>

        <button onClick={() => refetch()} className="p-2 text-gray-400 hover:text-[var(--primary)] transition-colors rounded-lg hover:bg-gray-50">
          <RefreshCw size={18} title="Refresh Status" />
        </button>
      </div>

      {status === 'CONNECTED' ? (
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 rounded-full bg-[var(--color-success-bg)] flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-[var(--color-success)]" />
          </div>
          <h3 className="font-display font-600 text-xl text-gray-900 mb-1">WhatsApp Connected</h3>
          <p className="font-body text-gray-500 mb-6">
            Linked to account: <span className="font-mono font-600 text-gray-700">{phone}</span>
          </p>
          
          <button
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-display font-500 text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            {disconnectMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
            Disconnect Device
          </button>
        </div>
      ) : status === 'QR_READY' && qr ? (
        <div className="flex flex-col md:flex-row items-center gap-8 py-4">
          <div className="flex-shrink-0 bg-white p-3 rounded-2xl border-2 border-gray-100 shadow-sm">
            <img src={qr} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-600 text-lg mb-4 flex items-center gap-2 text-gray-900">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--primary-dark)] text-white text-xs">1</span>
              Open WhatsApp on your phone
            </h3>
            <h3 className="font-display font-600 text-lg mb-4 flex items-center gap-2 text-gray-900">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--primary-dark)] text-white text-xs">2</span>
              Tap Menu ( ⋮ ) or Settings ( ⚙ )
            </h3>
            <h3 className="font-display font-600 text-lg flex items-center gap-2 text-gray-900">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--primary-dark)] text-white text-xs">3</span>
              Select Linked Devices & scan QR
            </h3>
            
            <div className="mt-6 p-4 rounded-lg bg-[var(--color-warning-bg)] border border-[var(--color-warning)] border-opacity-20 flex items-start gap-3">
              <AlertCircle className="text-[var(--color-warning)] mt-0.5 flex-shrink-0" size={18} />
              <p className="text-sm font-body text-yellow-800 leading-snug">
                This QR code changes every 15 seconds. Keep this page open while scanning.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="animate-spin text-[var(--primary)] mb-4" size={32} />
          <p className="font-display font-500 text-gray-600">Initializing WhatsApp Client...</p>
          <p className="text-xs text-gray-400 mt-2">This may take up to a minute on first run</p>
        </div>
      )}
    </div>
  );
}
