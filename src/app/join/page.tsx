import JoinPage from '@/components/JoinManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'הרשמה ופתיחת מרחב אישי | WiseCare',
  description: 'פתיחת מרחב אישי עצמאי לתרגול, משימות טיפוליות וספריית תוכן ב-WiseCare',
};

export default function JoinRoutePage() {
  return <JoinPage />;
}
