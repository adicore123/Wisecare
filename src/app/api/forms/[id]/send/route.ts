import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/services/greenApi';
import { getBaseUrl } from '@/lib/urlHelpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


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
    if (!template || (template.therapistId !== auth.userId && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'הטופס לא נמצא או שאין הרשאה' }, { status: 404 });
    }
    if (!template.active) {
      return NextResponse.json({ error: 'הטופס אינו פעיל — יש להפעיל אותו לפני שליחה' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const clientId = String(body.clientId || '').trim();
    const shouldSendWhatsApp = body.sendWhatsApp !== false;
    const customMessage = body.customMessage && String(body.customMessage).trim();

    if (!clientId) {
      return NextResponse.json({ error: 'חסר מזהה לקוח' }, { status: 400 });
    }

    const client = db.collection('clients').findById(clientId);
    if (!client || client.archived) {
      return NextResponse.json({ error: 'הלקוח לא נמצא' }, { status: 404 });
    }
    if (client.therapistId !== auth.userId && auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'הלקוח אינו משויך אליך' }, { status: 403 });
    }
    if (shouldSendWhatsApp && !client.phone) {
      return NextResponse.json({ error: 'ללקוח אין מספר טלפון לשליחת וואטסאפ' }, { status: 400 });
    }

    const effectiveTherapistId = template.therapistId || client.therapistId || auth.userId;

    const signature = db.collection('formSignatures').insertOne({
      therapistId: effectiveTherapistId,
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

    // Update sentCount on template
    db.collection('formTemplates').updateById(template.id, {
      sentCount: (template.sentCount || 0) + 1
    });

    const settings = db.getSettings();
    const therapistUser = db.collection('users').findById(effectiveTherapistId);
    const templateMsg = customMessage || settings.formInviteMessageTemplate || `שלום {{firstName}} יקר/ה,

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

    let notificationStatus = shouldSendWhatsApp ? 'failed' : 'skipped';
    let notificationError: string | null = null;

    if (shouldSendWhatsApp && client.phone) {
      try {
        await sendWhatsAppMessage({ phone: client.phone, message });
        notificationStatus = 'sent';
      } catch (waErr: any) {
        notificationError = waErr?.message || 'שגיאת וואטסאפ';
      }
    }

    db.collection('formSignatures').updateById(signature.id, {
      notificationStatus,
      notifiedAt: shouldSendWhatsApp ? new Date().toISOString() : null,
      notificationError
    });
    await db.flush();

    try {
      revalidatePath('/crm/[code]/forms', 'page');
      revalidatePath('/crm/[code]/clients', 'page');
      revalidatePath(`/portal/${encodeURIComponent(client.portalCode)}`, 'page');
      revalidatePath('/portal/[code]', 'page');
    } catch { }

    return NextResponse.json({
      success: true,
      signatureId: signature.id,
      portalUrl: portalUrl.toString(),
      notificationStatus,
      notificationError,
      message: notificationStatus === 'sent'
        ? `הטופס "${template.title || template.name}" נשלח בהצלחה בוואטסאפ ל${client.firstName}!`
        : (shouldSendWhatsApp
          ? 'הטופס שויך ללקוח, אך שליחת הוואטסאפ נכשלה — ניתן להעתיק את הקישור ידנית'
          : `הטופס שויך בהצלחה למרחב של ${client.firstName}`)
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה בשליחת הטופס';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
