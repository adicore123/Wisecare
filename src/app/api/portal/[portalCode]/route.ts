import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ portalCode: string }> }
) {
  try {
    const { portalCode } = await props.params;
    const clients = db.collection('clients');
    const tasks = db.collection('tasks');
    const users = db.collection('users');
    const contentItems = db.collection('contentItems');
    const contentAssignments = db.collection('contentAssignments');
    const settings = db.getSettings();

    const client = clients.findOne({ portalCode });
    if (!client) {
      return NextResponse.json({ error: 'מרחב טיפולי זה לא נמצא או שהקישור שגוי' }, { status: 404 });
    }

    const therapist = client.therapistId ? users.findById(client.therapistId) : null;
    const clientTasks = tasks.find({ clientId: client.id });
    const clientContent = contentAssignments
      .find({ clientId: client.id })
      .map((assignment: any) => {
        const item = contentItems.findById(assignment.contentId);
        if (!item || item.archived) return null;
        return {
          id: item.id,
          assignmentId: assignment.id,
          title: item.title,
          description: item.description,
          type: item.type,
          url: item.url,
          imageData: item.imageData,
          category: item.category,
          sourceName: item.sourceName,
          assignedAt: assignment.createdAt
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());

    return NextResponse.json({
      portalInfo: {
        clinicName: settings.clinicName || 'WiseCare מרחב טיפולי',
        clinicAddress: settings.clinicAddress || '',
        clinicCity: settings.clinicCity || '',
        clinicFloor: settings.clinicFloor || '',
        clinicPhone: settings.clinicPhone || therapist?.phone || '',
        clinicArrivalInstructions: settings.clinicArrivalInstructions || '',
        themeId: settings.themeId || 'sage',
        portalCode: client.portalCode,
        clientName: `${client.firstName} ${client.lastName}`.trim(),
        firstName: client.firstName,
        gender: client.gender,
        therapist: therapist ? {
          name: therapist.name,
          title: therapist.title,
          phone: therapist.phone,
          email: therapist.email,
          specialty: therapist.specialty
        } : null,
        isSelfCare: Boolean(client.isSelfCare || !client.therapistId)
      },
      tasks: clientTasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        dueDate: t.dueDate,
        completed: !!t.completed,
        completedAt: t.completedAt,
        clientNotes: t.clientNotes || '',
        isSelfCreated: Boolean(t.isSelfCreated || client.isSelfCare || !client.therapistId),
        createdAt: t.createdAt
      })),
      content: clientContent
    });
  } catch (error: any) {
    console.error('[Portal Get Error]', error);
    return NextResponse.json({ error: 'שגיאה בשליפת נתוני המרחב האישי' }, { status: 500 });
  }
}
