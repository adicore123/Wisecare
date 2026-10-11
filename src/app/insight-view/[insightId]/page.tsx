import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { verifyToken, type ClientPayload } from '@/lib/auth';
import { THEME_PALETTES, paletteToCssVars } from '@/lib/theme';
import InsightPageView from '@/components/InsightPageView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'תצוגת תובנה | WiseCare',
  robots: { index: false, follow: false }
};

/**
 * Private full-page view of one journal insight (the "צפייה" button in the
 * portal). Same session gate as the portal's private payload: the client JWT
 * cookie must belong to the insight's owner, otherwise the visitor is sent to
 * the portal's login gate.
 */
export default async function InsightViewRoutePage(
  props: { params: Promise<{ insightId: string }> }
) {
  const { insightId } = await props.params;

  await db.ensureLoaded().catch(() => {});
  const insight = db.collection('insights').findById(insightId);

  let isOwner = false;
  try {
    const token = (await cookies()).get('wisecare_client_token')?.value;
    const auth = token ? verifyToken<ClientPayload>(token, 'wisecare-portal') : null;
    isOwner = Boolean(insight && auth && auth.clientId === insight.clientId);
  } catch {
    isOwner = false;
  }

  if (!insight || !isOwner) {
    // An invitation, not a credential — the portal gate handles sign-in.
    if (insight?.portalCode) redirect(`/portal/${insight.portalCode}`);
    return <InsightPageView insight={null} variant="view" />;
  }

  // Paint from the owner's personal palette, same server-side injection as
  // the portal page, so the view page feels like part of their space.
  const themeId = db.collection('clients').findById(insight.clientId)?.themeId || 'sage';
  const palette = THEME_PALETTES.find(p => p.id === themeId) || THEME_PALETTES[0];
  const themeVars = paletteToCssVars(palette);
  const themeScript = `(function(){try{var v=${JSON.stringify(themeVars)};var css=':root{';for(var k in v)css+=k+':'+v[k]+';';css+='}';var s=document.createElement('style');s.id='wisecare-theme-insight-view';s.textContent=css;document.head.appendChild(s);}catch(e){}})();`;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <InsightPageView
        variant="view"
        insight={{
          title: String(insight.title || ''),
          content: String(insight.content || ''),
          mood: String(insight.mood || 'רגיל'),
          intensity: Number(insight.intensity) || 5
        }}
      />
    </>
  );
}
