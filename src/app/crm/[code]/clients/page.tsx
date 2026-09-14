import ClientsManager from '@/components/ClientsManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ניהול לקוחות ומטופלים | WiseCare CRM',
  description: 'ניהול מטופלים וסביבות אישיות במערכת WiseCare',
};

export default function CRMClientsPage() {
  return <ClientsManager />;
}
