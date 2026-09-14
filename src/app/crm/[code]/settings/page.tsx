import SettingsPage from '@/components/SettingsManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'הגדרות קליניקה ומערכת | WiseCare CRM',
  description: 'ניהול פרטי קליניקה, הגדרות עיצוב וצבעים, וחיבור WhatsApp Green API',
};

export default function CRMSettingsPage() {
  return <SettingsPage />;
}
