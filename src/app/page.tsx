import IntroManager from '@/components/IntroManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wisecare — המרחב החכם לתהליך הטיפולי שלך',
  description: 'פלטפורמה חכמה לניהול תהליכים טיפוליים, משימות, תרגולים ותוכן מותאם אישית למטפלים ולמטופלים.',
};

export default function HomePage() {
  return <IntroManager />;
}
