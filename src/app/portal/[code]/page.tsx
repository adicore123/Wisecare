import ClientPortalPage from '@/components/ClientPortalManager';
import { getPortalPayload } from '@/app/api/portal/[portalCode]/route';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export const metadata: Metadata = {
  title: 'מרחב אישי ומאובטח | WiseCare',
  description: 'מרחב אישי ומאובטח למטופלים ומתרגלים - משימות, תכנים, יומן תובנות ותיאום פגישות',
};

export default async function PortalRoutePage(props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params;
  const initialPayload = await getPortalPayload(code).catch(() => null);
  return <ClientPortalPage portalCode={code} initialPayload={initialPayload} />;
}
