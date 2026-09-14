import AppointmentsPage from '@/components/AppointmentsManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'יומן ותורים | WiseCare CRM',
  description: 'ניהול יומן פגישות, תזכורות ואישורי WhatsApp במערכת WiseCare',
};

export default function CRMAppointmentsPage() {
  return <AppointmentsPage />;
}
