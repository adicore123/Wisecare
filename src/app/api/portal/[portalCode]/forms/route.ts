import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';

// Forms module is only for therapist-managed clients. Self-care users never get forms.
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    await db.ensureLoaded();
    const { portalCode } = await props.params;
    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const clientAuth = getClientAuthFromRequest(request);
    const isAuthorized = clientAuth?.portalCode === portalCode;
    if (!isAuthorized) {
      // Not signed in yet — the portal shows the gate first; return empty instead of leaking data
      return NextResponse.json([]);
    }

    if (client.isSelfCare || !client.therapistId) {
      return NextResponse.json([]);
    }

    const signatures = db.collection('formSignatures')
      .find({ clientId: client.id })
      .sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    const result = signatures.map((s: any) => {
      const template = db.collection('formTemplates').findById(s.formTemplateId);
      const isSigned = s.status === 'signed';
      return {
        id: s.id,
        status: s.status,
        sentAt: s.sentAt,
        signedAt: s.signedAt || null,
        // The signed signature itself is private to the therapist — clients only see a flag
        signedByMe: isSigned,
        form: template && template.active !== false ? {
          id: template.id,
          title: template.title,
          introText: template.introText,
          sections: template.sections || [],
          requiredFields: template.requiredFields || [],
          footerText: template.footerText || '',
          requiresSignature: template.requiresSignature !== false,
          accentColor: template.accentColor || '#0d9488'
        } : null
      };
    }).filter((s: any) => s.form || s.signedByMe);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת הטפסים';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
