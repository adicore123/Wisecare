import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken, UserPayload, ClientPayload } from '@/lib/auth';
import { db } from '@/lib/db';
import IntroManager from '@/components/IntroManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wisecare — המרחב החכם לתהליך הטיפולי שלך',
  description: 'פלטפורמה חכמה לניהול תהליכים טיפוליים, משימות, תרגולים ותוכן מותאם אישית למטפלים ולמטופלים.',
};

export default async function HomePage() {
  const cookieStore = await cookies();

  // 1. Instant Server-Side Client / Patient redirect (0 network roundtrips on client)
  const clientToken = cookieStore.get('wisecare_client_token')?.value;
  if (clientToken) {
    const payload = verifyToken<ClientPayload>(clientToken);
    if (payload?.portalCode) {
      redirect(`/portal/${encodeURIComponent(payload.portalCode)}`);
    }
  }

  // 2. Instant Server-Side Therapist / Admin redirect
  const userToken = cookieStore.get('wisecare_token')?.value || cookieStore.get('wisecare_admin_token')?.value;
  if (userToken) {
    const payload = verifyToken<UserPayload>(userToken);
    if (payload?.userId) {
      if (payload.loginCode) {
        redirect(`/crm/${encodeURIComponent(payload.loginCode)}/clients`);
      }
      await db.ensureLoaded();
      const user = db.collection('users').findById(payload.userId);
      if (user?.loginCode) {
        redirect(`/crm/${encodeURIComponent(user.loginCode)}/clients`);
      } else if (user?.role === 'superadmin' || payload.role === 'superadmin') {
        redirect('/superadmin');
      }
    }
  }

  return <IntroManager />;
}
