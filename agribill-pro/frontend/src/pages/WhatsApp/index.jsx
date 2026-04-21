import { useTranslation } from 'react-i18next';
import WhatsAppStatus from './WhatsAppStatus.jsx';
import BulkMessage from './BulkMessage.jsx';

export default function WhatsApp() {
  const { t } = useTranslation();
  return (
    <div className="page-enter space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-display font-700 text-xl" style={{ color: 'var(--gray-900)' }}>{t('whatsapp.title')}</h1>
        <p className="font-body text-sm mt-0.5" style={{ color: 'var(--gray-500)' }}>
          Manage your device connection and send bulk messages
        </p>
      </div>

      <WhatsAppStatus />

      <BulkMessage />
    </div>
  );
}
