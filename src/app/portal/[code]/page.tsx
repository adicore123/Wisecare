import { cookies } from 'next/headers';
import ClientPortalPage from '@/components/ClientPortalManager';
import { getPortalPayload } from '@/app/api/portal/[portalCode]/route';
import { verifyToken, type ClientPayload } from '@/lib/auth';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export const metadata: Metadata = {
  title: 'מרחב אישי ומאובטח | WiseCare',
  description: 'מרחב אישי ומאובטח למטופלים ומתרגלים - משימות, תכנים, יומן תובנות ותיאום פגישות',
};

export default async function PortalRoutePage(props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params;

  // The portal link is an invitation, not a credential: private data is baked into
  // the SSR payload only when the request carries a valid patient session for THIS portal.
  let includePrivate = false;
  try {
    const token = (await cookies()).get('wisecare_client_token')?.value;
    const auth = token ? verifyToken<ClientPayload>(token, 'wisecare-portal') : null;
    includePrivate = Boolean(auth && auth.portalCode === code);
  } catch {
    includePrivate = false;
  }

  const initialPayload = await getPortalPayload(code, { includePrivate }).catch(() => null);
  return <ClientPortalPage portalCode={code} initialPayload={initialPayload} />;
}
