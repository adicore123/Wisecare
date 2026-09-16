import FormsManager from '@/components/FormsManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'טפסים דיגיטליים וחתימות | WiseCare CRM',
  description: 'יצירת טפסי הסכמה, חוזים והצהרות ושליחתם לחתימה דיגיטלית מהנייד של המטופל',
};

export default function CRMFormsPage() {
  return <FormsManager />;
}
