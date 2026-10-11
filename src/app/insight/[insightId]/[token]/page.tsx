import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { isLinkTokenFormat, verifyLinkToken } from '@/lib/linkToken';
import { verifyToken, type ClientPayload } from '@/lib/auth';
import { THEME_PALETTES, paletteToCssVars } from '@/lib/theme';
import InsightPageView from '@/components/InsightPageView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'תובנה אישית | WiseCare',
  robots: { index: false, follow: false }
};

/**
 * Public share page for a single journal insight — the link token in the URL
 * is the credential (same model as the quote pages). Renders the insight
 * itself only: no dates, no names, no internal ids. The "הפסקת שיתוף" control
 * is offered solely to the authenticated owner; recipients get a read-only page.
 */
export default async function SharedInsightPage(
  props: { params: Promise<{ insightId: string; token: string }> }
) {
  const { insightId, token } = await props.params;

  let insight: any = null;
  if (isLinkTokenFormat(token)) {
    await db.ensureLoaded().catch(() => {});
    const found = db.collection('insights').findById(insightId);
    if (found && found.shareTokenHash && verifyLinkToken(token, found.shareTokenHash)) {
      insight = found;
    }
  }

  let isOwner = false;
  if (insight) {
    try {
      const sessionToken = (await cookies()).get('wisecare_client_token')?.value;
      const auth = sessionToken ? verifyToken<ClientPayload>(sessionToken, 'wisecare-portal') : null;
      isOwner = Boolean(auth && auth.clientId === insight.clientId);
    } catch {
      isOwner = false;
    }
  }

  if (!insight) {
    return <InsightPageView insight={null} variant="public" insightId={insightId} />;
  }

  // Paint from the owner's personal palette so the shared page carries the
  // same look as their portal (a color scheme, not an identity).
  const themeId = db.collection('clients').findById(insight.clientId)?.themeId || 'sage';
  const palette = THEME_PALETTES.find(p => p.id === themeId) || THEME_PALETTES[0];
  const themeVars = paletteToCssVars(palette);
  const themeScript = `(function(){try{var v=${JSON.stringify(themeVars)};var css=':root{';for(var k in v)css+=k+':'+v[k]+';';css+='}';var s=document.createElement('style');s.id='wisecare-theme-insight-share';s.textContent=css;document.head.appendChild(s);}catch(e){}})();`;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <InsightPageView
        variant="public"
        isOwner={isOwner}
        insightId={insightId}
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
