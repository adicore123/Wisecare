import ZoomManager from '@/components/ZoomManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'פגישות זום | WiseCare CRM',
  description: 'ניהול פגישות וידאו מ-Zoom בתוך המערכת: קביעה, שליחה בוואטסאפ ושיחות ישירות',
};

export default function CRMZoomPage() {
  return <ZoomManager />;
}
