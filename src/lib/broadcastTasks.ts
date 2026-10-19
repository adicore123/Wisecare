import { db } from '@/lib/db';

/**
 * משימות שידור ("לכולם"): כל שידור מקבל broadcastId, וכל עותק נחתם בו.
 * נרשם חדש (או מרחב קיים שהחסיר) מקבל אוטומטית עותק מכל אצווה שחסרה לו —
 * כך משימות "שייכות לכולם" מגיעות גם למי שלא היה קיים בשעת השידור.
 */

/** מזהה אצווה חדש לשידור */
export function newBroadcastId(): string {
  return `bc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** עותק אחד (תבנית) לכל אצוית שידור קיימת */
function broadcastTemplates(): any[] {
  const all = db.collection('tasks').find({});
  const seen = new Set<string>();
  const templates: any[] = [];
  for (const t of all) {
    if (!t.broadcastId || t.assignedBy !== 'superadmin') continue;
    if (seen.has(t.broadcastId)) continue;
    seen.add(t.broadcastId);
    templates.push(t);
  }
  return templates;
}

/**
 * משלים ללקוח אחד את כל משימות השידור שחסרות לו.
 * מחזיר את מספר העותקים שנוספו. לא דורס קיימות ולא נוגע בהשלמות שנעשו.
 */
export function provisionBroadcastTasksForClient(clientId: string, clientTherapistId: string | null = null): number {
  const templates = broadcastTemplates();
  if (templates.length === 0) return 0;

  const tasks = db.collection('tasks');
  const mine = new Set(
    tasks.find({ clientId }).map((t: any) => t.broadcastId).filter(Boolean)
  );

  let added = 0;
  for (const tpl of templates) {
    if (mine.has(tpl.broadcastId)) continue;
    tasks.insertOne({
      clientId,
      therapistId: clientTherapistId || tpl.therapistId || null,
      title: tpl.title,
      description: tpl.description || '',
      category: tpl.category || 'תרגול ביתי',
      dueDate: tpl.dueDate || null,
      completed: false,
      completedAt: null,
      clientNotes: '',
      isSelfCreated: false,
      assignedBy: 'superadmin',
      broadcastId: tpl.broadcastId,
      provisionedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    added++;
  }
  return added;
}
