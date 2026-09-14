import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthFromRequest, signClientToken } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ clientId: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'גישה מורשית למנהל מערכת בלבד' }, { status: 403 });
    }

    const { clientId } = await props.params;
    const clients = db.collection('clients');

    const client = clients.findOne((c: any) => c.id === clientId || c.portalCode === clientId);
    if (!client) {
      return NextResponse.json({ error: 'הלקוח/המטופל המבוקש לא נמצא במערכת' }, { status: 404 });
    }

    const token = signClientToken(client);

    return NextResponse.json({
      success: true,
      message: `הונפקה גישת SuperAdmin למרחב הלקוח ${client.firstName || ''} ${client.lastName || ''}`,
      token,
      portalCode: client.portalCode,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        portalCode: client.portalCode,
        isSelfCare: Boolean(client.isSelfCare || !client.therapistId)
      }
    });
  } catch (err: any) {
    console.error('[SuperAdmin Client Impersonation Error]', err);
    return NextResponse.json({ error: 'שגיאה בהנפקת גישת SuperAdmin למרחב הלקוח' }, { status: 500 });
  }
}
