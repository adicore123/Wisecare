import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { getBaseUrl } from '@/lib/urlHelpers';

export async function POST(
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
    const template = db.collection('formTemplates').findById(id);
    if (!template || template.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'הטופס לא נמצא או שאין הרשאה' }, { status: 404 });
    }
    if (!template.active) {
      return NextResponse.json({ error: 'הטופס אינו פעיל — יש להפעיל אותו לפני שליחה' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const clientId = String(body.clientId || '').trim();
    if (!clientId) {
      return NextResponse.json({ error: 'חסר מזהה לקוח' }, { status: 400 });
    }

    const client = db.collection('clients').findById(clientId);
    if (!client || client.archived) {
      return NextResponse.json({ error: 'הלקוח לא נמצא' }, { status: 404 });
    }
    if (client.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'הלקוח אינו משויך אליך' }, { status: 403 });
    }
    if (!client.phone) {
      return NextResponse.json({ error: 'ללקוח אין מספר טלפון לשליחת וואטסאפ' }, { status: 400 });
    }

    const signature = db.collection('formSignatures').insertOne({
      therapistId: auth.userId,
      formTemplateId: id,
      clientId: client.id,
      status: 'sent',
      sentAt: new Date().toISOString(),
      signatureData: '',
      signedName: '',
      answers: {},
      notificationStatus: 'none',
      portalUrl: ''
    });

    const clientAppUrl = getBaseUrl(request);
    const portalUrl = new URL(`/portal/${encodeURIComponent(client.portalCode)}`, clientAppUrl);
    portalUrl.searchParams.set('tab', 'forms');
    portalUrl.searchParams.set('form', signature.id);

    db.collection('formSignatures').updateById(signature.id, {
      portalUrl: portalUrl.toString()
    });

    const settings = db.getSettings();
    const therapistUser = db.collection('users').findById(auth.userId);
    const templateMsg = settings.formInviteMessageTemplate || `שלום {{firstName}} יקר/ה,

לפני הפגישה הראשונה שלנו, נדרשת חתימתך על המסמך הבא:
📄 *{{formName}}*

החתימה מתבצעת בקלות מהנייד, דרך המרחב האישי המאובטח שלך:
{{portalUrl}}

תודה וברכה,
{{therapistName}}`;

    const message = templateMsg
      .replace(/\{\{firstName\}\}/g, client.firstName || '')
      .replace(/\{firstName\}/g, client.firstName || '')
      .replace(/\{\{formName\}\}/g, template.title || template.name)
      .replace(/\{formName\}/g, template.title || template.name)
      .replace(/\{\{portalUrl\}\}/g, portalUrl.toString())
      .replace(/\{portalUrl\}/g, portalUrl.toString())
      .replace(/\{\{therapistName\}\}/g, therapistUser?.name || 'המטפל/ת')
      .replace(/\{\{clinicName\}\}/g, settings.clinicName || 'WiseCare');

    let notificationStatus = 'failed';
    let notificationError: string | null = null;
    try {
      await sendWhatsAppMessage({ phone: client.phone, message });
      notificationStatus = 'sent';
    } catch (waErr: any) {
      notificationError = waErr?.message || 'שגיאת וואטסאפ';
    }

    db.collection('formSignatures').updateById(signature.id, {
      notificationStatus,
      notifiedAt: new Date().toISOString(),
      notificationError
    });
    await db.flush();

    return NextResponse.json({
      success: true,
      signatureId: signature.id,
      portalUrl: portalUrl.toString(),
      notificationStatus,
      notificationError,
      message: notificationStatus === 'sent'
        ? `הטופס "${template.title || template.name}" נשלח בוואטסאפ ל${client.firstName}`
        : 'הטופס נוסף ללקוח, אך שליחת הוואטסאפ נכשלה — ניתן להעתיק את הקישור ידנית'
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשליחת הטופס';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
