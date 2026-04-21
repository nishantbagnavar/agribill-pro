import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { customersApi } from '../../api/customers.api.js';
import { whatsappApi } from '../../api/whatsapp.api.js';
import { Send, Users, Filter, Loader2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function BulkMessage() {
  const [filter, setFilter] = useState('ALL'); // ALL, HAS_DUE
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [messageTemplate, setMessageTemplate] = useState('DUE_REMINDER');
  const [customMsg, setCustomMsg] = useState('');

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', { limit: 1000 }],
    queryFn: () => customersApi.getAll({ limit: 1000 }).then((r) => r.data.data),
  });

  const customers = customersData?.customers || [];

  const filteredCustomers = useMemo(() => {
    let list = customers.filter(c => !!c.phone || !!c.whatsapp_number);
    if (filter === 'HAS_DUE') list = list.filter(c => c.total_due > 0);
    return list;
  }, [customers, filter]);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
    else setSelectedIds(new Set());
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectedCustomers = filteredCustomers.filter(c => selectedIds.has(c.id));

  const [sendLogs, setSendLogs] = useState([]);

  const bulkMutation = useMutation({
    mutationFn: (payload) => whatsappApi.bulkSend(payload).then(r => r.data.data),
    onSuccess: (results) => {
      toast.success(`Successfully sent to ${results.filter(r => r.status === 'SENT').length} customers!`);
      setSendLogs(results);
    },
    onError: () => toast.error('Failed to send bulk messages'),
  });

  const generateMessage = (customer) => {
    const shopName = "AgriBill Pro"; // ideally from context
    if (messageTemplate === 'DUE_REMINDER') {
      return `Dear ${customer.name}, you have a pending due of ₹${(customer.total_due / 100).toLocaleString('en-IN')} at ${shopName}. Please clear it at your earliest convenience.`;
    }
    return customMsg
      .replace('{name}', customer.name)
      .replace('{amount}', `₹${(customer.total_due / 100).toLocaleString('en-IN')}`);
  };

  const handleSend = () => {
    if (selectedCustomers.length === 0) return toast.error('No customers selected');
    
    // Check if empty template
    if (messageTemplate === 'CUSTOM' && !customMsg.trim()) return toast.error('Message is empty');

    const recipients = selectedCustomers.map(c => ({
      phone: c.whatsapp_number || c.phone,
      name: c.name,
      amount: c.total_due
    }));

    // For custom messages, generate the string with placeholders so backend can replace them
    const messagePayload = messageTemplate === 'DUE_REMINDER' 
      ? `🔔 *Payment Reminder*\nDear {name},\nYou have a pending due of *₹{amount}*. Please clear it at your earliest convenience.`
      : customMsg;

    bulkMutation.mutate({ recipients, message: messagePayload });
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="mx-auto animate-spin" /></div>;

  return (
    <div className="bg-white rounded-xl p-6 relative" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-2 mb-6">
        <Users size={20} className="text-[var(--primary)]" />
        <h2 className="font-display font-600 text-lg">Bulk Messaging</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Col: Target selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-500 text-sm">Target Customers</h3>
            <div className="flex gap-2">
              <select 
                title="Filter by attributes"
                value={filter} 
                onChange={e => { setFilter(e.target.value); setSelectedIds(new Set()); }}
                className="text-xs border rounded-md px-2 py-1 outline-none font-body"
              >
                <option value="ALL">All valid numbers</option>
                <option value="HAS_DUE">Has Pending Dues</option>
              </select>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden flex flex-col" style={{ maxHeight: '400px' }}>
            <div className="bg-gray-50 px-4 py-2 border-b flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={filteredCustomers.length > 0 && selectedIds.size === filteredCustomers.length}
                onChange={handleSelectAll}
                className="rounded accent-[var(--primary)] cursor-pointer" 
              />
              <span className="text-xs font-500 text-gray-500">Select All ({filteredCustomers.length})</span>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {filteredCustomers.map(c => (
                <label key={c.id} className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="rounded accent-[var(--primary)] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm font-500 text-gray-800 leading-tight truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{c.whatsapp_number || c.phone}</p>
                  </div>
                  {filter === 'HAS_DUE' && (
                    <span className="text-xs font-mono font-600 text-[var(--color-danger)] whitespace-nowrap">
                      {formatCurrency(c.total_due, { decimals: 0 })}
                    </span>
                  )}
                </label>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="text-center py-6 text-sm text-gray-400">No customers found</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Message setup */}
        <div className="flex flex-col h-full">
          <div className="mb-4">
            <h3 className="font-display font-500 text-sm mb-2">Message Template</h3>
            <select
              title="Template select"
              value={messageTemplate}
              onChange={e => setMessageTemplate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              <option value="DUE_REMINDER">Due Payment Reminder</option>
              <option value="CUSTOM">Custom Message</option>
            </select>
          </div>

          <div className="flex-1 mb-4 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-display text-gray-500">Preview</label>
              {messageTemplate === 'CUSTOM' && (
                <span className="text-[10px] text-gray-400">Tags: {"{name}"}, {"{amount}"}</span>
              )}
            </div>
            <textarea
              className="flex-1 w-full border rounded-lg p-3 text-sm font-body bg-gray-50 outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none"
              readOnly={messageTemplate !== 'CUSTOM'}
              value={messageTemplate === 'CUSTOM' ? customMsg : generateMessage(selectedCustomers[0] || { name: 'Customer', total_due: 500000 })}
              onChange={e => setCustomMsg(e.target.value)}
              placeholder="Type your message here... Use {name} for customer name."
            />
          </div>

          <button
            onClick={handleSend}
            disabled={bulkMutation.isPending || selectedIds.size === 0}
            className="w-full py-3 rounded-lg flex items-center justify-center gap-2 font-display font-600 text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--primary-dark)' }}
          >
            {bulkMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Send to {selectedIds.size} {selectedIds.size === 1 ? 'Customer' : 'Customers'}
          </button>

          {sendLogs.length > 0 && (
            <div className="mt-4 border rounded-md p-3 bg-gray-50 max-h-32 overflow-y-auto">
              <p className="text-xs font-600 mb-2 border-b pb-1">Last Send Log</p>
              {sendLogs.map((log, i) => (
                <div key={i} className="flex items-center justify-between py-0.5 text-xs">
                  <span className="font-mono text-gray-600">{log.phone}</span>
                  {log.status === 'SENT' ? (
                    <span className="text-green-600 flex items-center gap-1"><Check size={12}/> Sent</span>
                  ) : (
                    <span className="text-red-500 flex items-center gap-1" title={log.error}><X size={12}/> Failed</span>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
