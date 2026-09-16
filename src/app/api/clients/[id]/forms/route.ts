import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { id } = await props.params;
    const client = db.collection('clients').findById(id);
    if (!client) {
      return NextResponse.json({ error: 'הלקוח לא נמצא' }, { status: 404 });
    }
    if (auth.role === 'therapist' && client.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין הרשאה לצפות בלקוח זה' }, { status: 403 });
    }

    const signatures = db.collection('formSignatures')
      .find({ clientId: id })
      .sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    const result = signatures.map((s: any) => {
      const template = db.collection('formTemplates').findById(s.formTemplateId);
      const { signatureData, ...safe } = s;
      return {
        ...safe,
        formName: template?.name || 'טופס שנמחק',
        formTitle: template?.title || '',
        hasSignature: Boolean(signatureData),
        clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim()
      };
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת טפסי הלקוח';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
