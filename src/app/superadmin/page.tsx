import SuperAdminPage from '@/components/SuperAdminManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'פאנל ניהול ראשי (SuperAdmin) | WiseCare',
  description: 'ניהול מטפלים, הגדרות מערכת גלובליות ומוניטורינג מרחבים ב-WiseCare',
  appleWebApp: false,
  other: {
    'mobile-web-app-capable': 'no',
    'apple-mobile-web-app-capable': 'no',
  }
};

export default function SuperAdminRoutePage() {
  return <SuperAdminPage />;
}
