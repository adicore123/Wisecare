import { db } from '@/lib/db';

/**
 * מעקב שימוש במרחבים האישיים: מסמך אחד ללקוח+יום עם כניסות ולחיצות
 * לפי מודול — כך הסופראדמין רואה בכרטיס היוזר אם ואיך הוא משתמש במערכת.
 */

export const TRACKED_MODULES = ['tasks', 'content', 'songs', 'breathing', 'knowledge', 'journal', 'appointments'] as const;
export type TrackedModule = (typeof TRACKED_MODULES)[number];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function findTodayDoc(clientId: string): any | null {
  const date = todayKey();
  return db.collection('usageStats').findOne((d: any) => d.clientId === clientId && d.date === date) || null;
}

function emptyModules(): Record<string, number> {
  return Object.fromEntries(TRACKED_MODULES.map((m) => [m, 0]));
}

/** רישום כניסה מוצלחת למרחב */
export function recordLogin(clientId: string): void {
  const now = new Date().toISOString();
  recordEvent(clientId, 'login');
  const existing = findTodayDoc(clientId);
  if (existing) {
    db.collection('usageStats').updateById(existing.id, {
      logins: (existing.logins || 0) + 1,
      lastActiveAt: now
    });
  } else {
    db.collection('usageStats').insertOne({
      clientId,
      date: todayKey(),
      logins: 1,
      modules: emptyModules(),
      lastActiveAt: now
    });
  }
}

/** רישום כניסה למודול (טאב) בפורטל */
export function recordModuleView(clientId: string, module: string): void {
  const mod = TRACKED_MODULES.includes(module as TrackedModule) ? module : null;
  if (!mod) return;
  recordEvent(clientId, 'module', mod);
  const now = new Date().toISOString();
  const existing = findTodayDoc(clientId);
  if (existing) {
    const modules = { ...emptyModules(), ...(existing.modules || {}) };
    modules[mod] = (modules[mod] || 0) + 1;
    db.collection('usageStats').updateById(existing.id, { modules, lastActiveAt: now });
  } else {
    const modules = emptyModules();
    modules[mod] = 1;
    db.collection('usageStats').insertOne({
      clientId,
      date: todayKey(),
      logins: 0,
      modules,
      lastActiveAt: now
    });
  }
}

export interface UsageSummary {
  loginsToday: number;
  lastActiveAt: string | null;
  modulesLast30: Record<string, number>;
}

/** יומן אירועים לתצוגה המפורטת — login / מודול / פעולה (שיר, מחשבה) */
export interface UsageEvent {
  id: string;
  clientId: string;
  kind: 'login' | 'module' | 'action';
  module?: string;
  action?: string;
  at: string;
}

function recordEvent(clientId: string, kind: UsageEvent['kind'], module?: string, action?: string): void {
  db.collection('usageEvents').insertOne({
    clientId,
    kind,
    ...(module ? { module } : {}),
    ...(action ? { action } : {}),
    at: new Date().toISOString()
  } as any);
}

/** האירועים האחרונים של לקוח — החדשים קודם */
export function recentEventsForClient(clientId: string, limit = 100): UsageEvent[] {
  return db
    .collection('usageEvents')
    .find({ clientId })
    .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
    .map((e: any) => ({
      id: e.id,
      clientId: e.clientId,
      kind: e.kind,
      module: e.module,
      action: e.action,
      at: e.at
    }));
}

/** רישום פעולה משמעותית — נגן שיר, כתב מחשבה וכו' */
export function recordAction(clientId: string, action: string, module?: string): void {
  recordEvent(clientId, 'action', module, action);
}

/** סיכום לתצוגה בכרטיס היוזר בסופראדמין */
export function usageSummaryForClient(clientId: string): UsageSummary {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const docs = db
    .collection('usageStats')
    .find({ clientId })
    .filter((d: any) => d.date >= cutoff);

  let loginsToday = 0;
  let lastActiveAt: string | null = null;
  const modules: Record<string, number> = {};
  const today = todayKey();

  for (const doc of docs) {
    if (doc.date === today) loginsToday = doc.logins || 0;
    if (doc.lastActiveAt && (!lastActiveAt || doc.lastActiveAt > lastActiveAt)) {
      lastActiveAt = doc.lastActiveAt;
    }
    for (const [mod, count] of Object.entries(doc.modules || {})) {
      if (typeof count === 'number' && count > 0) {
        modules[mod] = (modules[mod] || 0) + count;
      }
    }
  }

  return { loginsToday, lastActiveAt, modulesLast30: modules };
}
