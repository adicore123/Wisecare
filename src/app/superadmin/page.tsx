import SuperAdminPage from '@/components/SuperAdminManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'פאנל ניהול ראשי (SuperAdmin) | WiseCare',
  description: 'ניהול מטפלים, הגדרות מערכת גלובליות ומוניטורינג מרחבים ב-WiseCare',
};

export default function SuperAdminRoutePage() {
  return <SuperAdminPage />;
}
