import type { Metadata } from 'next';
import LiveKitManager from '@/components/LiveKitManager';

export const metadata: Metadata = {
  title: 'פגישות וידאו | WiseCare CRM',
  description: 'שיחות וידאו פרטיות 1-על-1 עם מטופלים דרך LiveKit — ישירות מהמערכת'
};

export default function CRMMeetingsPage() {
  return <LiveKitManager />;
}
