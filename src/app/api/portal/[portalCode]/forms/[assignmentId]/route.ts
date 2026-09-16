import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientAuthFromRequest } from '@/lib/auth';
import { validateImageData, cleanText } from '@/lib/contentHelpers';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string; assignmentId: string }> }
) {
  try {
    await db.ensureLoaded();
    const { portalCode, assignmentId } = await props.params;

    const client = db.collection('clients').findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב אישי לא נמצא' }, { status: 404 });
    }

    const clientAuth = getClientAuthFromRequest(request);
    if (!clientAuth || clientAuth.portalCode !== portalCode) {
      return NextResponse.json({ error: 'נדרשת התחברות למרחב האישי' }, { status: 401 });
    }

    // Self-care users have no therapist and therefore no forms to sign
    if (client.isSelfCare || !client.therapistId) {
      return NextResponse.json({ error: 'טפסים זמינים רק למטופלים מלווים' }, { status: 403 });
    }

    const signature = db.collection('formSignatures').findById(assignmentId);
    if (!signature || signature.clientId !== client.id) {
      return NextResponse.json({ error: 'הטופס לא נמצא או שאינו משויך אליך' }, { status: 404 });
    }
    if (signature.status === 'signed') {
      return NextResponse.json({ error: 'הטופס כבר חתום' }, { status: 409 });
    }

    const template = db.collection('formTemplates').findById(signature.formTemplateId);
    if (!template) {
      return NextResponse.json({ error: 'תבנית הטופס אינה זמינה עוד' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const signatureData = validateImageData(body.signatureData);
    if (template.requiresSignature !== false && !signatureData) {
      return NextResponse.json({ error: 'נדרשת חתימה — יש לחתום במסגרת החתימה לפני השליחה' }, { status: 400 });
    }

    const signedName = cleanText(body.signedName, 120);
    if (!signedName) {
      return NextResponse.json({ error: 'נא להזין שם מלא לאימות החתימה' }, { status: 400 });
    }

    // Every required field must be acknowledged
    const answers: Record<string, any> = {};
    const requiredFields = Array.isArray(template.requiredFields) ? template.requiredFields : [];
    const provided = body.answers && typeof body.answers === 'object' ? body.answers : {};
    for (const field of requiredFields) {
      const value = provided[field.label];
      if (field.type === 'checkbox' && value !== true) {
        return NextResponse.json({ error: `נדרש לאשר: ${field.label}` }, { status: 400 });
      }
      answers[field.label] = field.type === 'checkbox' ? Boolean(value) : cleanText(value, 200);
    }

    const signedAt = new Date().toISOString();
    db.collection('formSignatures').updateById(signature.id, {
      status: 'signed',
      signedAt,
      signatureData: signatureData || '',
      signedName,
      answers
    });

    db.logAudit({
      actor: `client:${client.id}`,
      actorRole: 'client',
      action: 'form_signed',
      targetId: signature.id,
      targetType: 'formSignatures',
      details: {
        formTemplateId: signature.formTemplateId,
        formName: template.name,
        therapistId: signature.therapistId,
        signedName
      }
    });

    await db.flush();

    return NextResponse.json({
      success: true,
      signedAt,
      message: 'הטופס נחתם ונשמר בהצלחה! המטפל/ת שלך קיבל/ה אותו.'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשמירת החתימה';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
