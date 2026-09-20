import { cookies } from 'next/headers';
import ClientPortalPage from '@/components/ClientPortalManager';
import { getPortalPayload } from '@/app/api/portal/[portalCode]/route';
import { verifyToken, type ClientPayload } from '@/lib/auth';
import { THEME_PALETTES, paletteToCssVars } from '@/lib/theme';
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

  // Each client's portal paints from their own palette, injected here
  // server-side before first paint — no localStorage involved, so the CRM and
  // superadmin palettes can never bleed into (or from) patient portals.
  const portalThemeId = initialPayload?.portalInfo?.themeId || 'sage';
  const portalPalette = THEME_PALETTES.find(p => p.id === portalThemeId) || THEME_PALETTES[0];
  const portalThemeVars = paletteToCssVars(portalPalette);
  const portalThemeScript = `(function(){try{var v=${JSON.stringify(portalThemeVars)};for(var k in v)document.documentElement.style.setProperty(k,v[k]);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',v['--primary']);}catch(e){}})();`;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: portalThemeScript }} />
      <ClientPortalPage portalCode={code} initialPayload={initialPayload} />
    </>
  );
}
