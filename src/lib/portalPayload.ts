import { db } from '@/lib/db';

/**
 * טעינת המכלול של מרחב אישי (gate + נתונים פרטיים לפי הרשאה).
 * הוצא מקובץ ה-route כדי ש-page.tsx יוכל להשתמש בו ב-SSR —
 * ל-Next.js App Router אסור לייצא מ-route.ts שום דבר מלבד handlers.
 */
export async function getPortalPayload(portalCode: string, options: { includePrivate?: boolean } = {}) {
  const includePrivate = options.includePrivate !== false;
  await db.ensureLoaded();
  const clients = db.collection('clients');
  const tasks = db.collection('tasks');
  const users = db.collection('users');
  const contentItems = db.collection('contentItems');
  const contentAssignments = db.collection('contentAssignments');
  const insights = db.collection('insights');
  const appointments = db.collection('appointments');
  const settings = db.getSettings();

  const client = clients.findOne({ portalCode });
  if (!client) {
    return null;
  }

  // Portal disabled by the therapist — the personal space is unavailable
  if (client.portalEnabled === false) {
    return null;
  }

  const therapist = client.therapistId ? users.findById(client.therapistId) : null;

  // portalInfo is the public "gate" surface: enough to render the login/setup
  // screen (clinic branding, greeting) — it must never contain clinical data.
  const portalInfo = {
    clinicName: settings.clinicName || 'WiseCare מרחב טיפולי',
    clinicAddress: settings.clinicAddress || '',
    clinicCity: settings.clinicCity || '',
    clinicFloor: settings.clinicFloor || '',
    clinicPhone: settings.clinicPhone || therapist?.phone || '',
    clinicArrivalInstructions: settings.clinicArrivalInstructions || '',
    // Per-client palette (set in the client edit form) — deliberately NOT the
    // clinic-wide settings.themeId, so repainting the CRM never touches portals
    themeId: client.themeId || 'sage',
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
    isSelfCare: Boolean(client.isSelfCare || !client.therapistId),
    hasPassword: Boolean(client.hasPassword !== false && (client.password || client.initialPassword)),
    needsCredentialsSetup: Boolean(client.hasPassword === false || (client.clientSetsCredentials && !client.credentialsSetAt)),
    username: client.username || ''
  };

  if (!includePrivate) {
    // Unauthenticated caller: gate data only
    return { portalInfo, tasks: [], content: [], insights: [], appointments: [] };
  }

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
        // Served by the cached image endpoint — not embedded in the payload.
        // hasImageData: the bulk sync carries presence, not the blob itself.
        imageUrl: (item.imageData || item.hasImageData) ? `/api/content/${item.id}/image` : '',
        category: item.category,
        sourceName: item.sourceName,
        assignedAt: assignment.createdAt
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());

  const clientInsights = insights.find({ clientId: client.id })
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const clientAppointments = appointments.find({ clientId: client.id })
    .sort((a: any, b: any) => {
      const dateCompare = (a.date || '').localeCompare(b.date || '');
      if (dateCompare !== 0) return dateCompare;
      return (a.time || '').localeCompare(b.time || '');
    });

  return {
    portalInfo,
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
    content: clientContent,
    insights: clientInsights,
    appointments: clientAppointments
  };
}
