import ClientPortalPage from '@/components/ClientPortalManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'מרחב אישי ומאובטח | WiseCare',
  description: 'מרחב אישי ומאובטח למטופלים ומתרגלים - משימות, תכנים, יומן תובנות ותיאום פגישות',
};

export default async function PortalRoutePage(props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params;
  return <ClientPortalPage portalCode={code} />;
}
