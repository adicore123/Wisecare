import ContentLibraryPage from '@/components/ContentLibraryManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ספריית תוכן והעשרה | WiseCare CRM',
  description: 'ניהול מאמרים, סרטונים וחומרי טיפול ושיתופם ישירות למטופלים',
};

export default function CRMContentPage() {
  return <ContentLibraryPage />;
}
