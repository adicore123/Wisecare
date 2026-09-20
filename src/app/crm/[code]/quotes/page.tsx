import QuotesManager from '@/components/QuotesManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'הצעות מחיר | WiseCare CRM',
  description: 'בניית הצעות מחיר ללקוחות פוטנציאליים ושליחתן לאישור בוואטסאפ',
};

export default function CRMQuotesPage() {
  return <QuotesManager />;
}
