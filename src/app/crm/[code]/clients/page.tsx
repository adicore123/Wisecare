import ClientsManager from '@/components/ClientsManager';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export const metadata: Metadata = {
  title: 'ניהול לקוחות ומטופלים | WiseCare CRM',
  description: 'ניהול מטופלים וסביבות אישיות במערכת WiseCare',
};

export default function CRMClientsPage() {
  return <ClientsManager />;
}
