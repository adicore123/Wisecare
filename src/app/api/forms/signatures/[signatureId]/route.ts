import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ signatureId: string }> }
) {
  try {
    await db.ensureLoaded();
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'therapist' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'גישה מורשית למטפלים בלבד' }, { status: 403 });
    }

    const { signatureId } = await props.params;
    const signature = db.collection('formSignatures').findById(signatureId);
    if (!signature) {
      return NextResponse.json({ error: 'הרשומה לא נמצאה' }, { status: 404 });
    }
    if (auth.role === 'therapist' && signature.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'אין הרשאה לרשומה זו' }, { status: 403 });
    }

    const template = db.collection('formTemplates').findById(signature.formTemplateId);
    const client = db.collection('clients').findById(signature.clientId);
    const therapist = db.collection('users').findById(signature.therapistId);
    const settings = db.getSettings();

    return NextResponse.json({
      ...signature,
      template,
      client: client ? {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        portalCode: client.portalCode
      } : null,
      therapistName: therapist?.name || '',
      clinicName: settings.clinicName || 'WiseCare'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת הטופס החתום';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
