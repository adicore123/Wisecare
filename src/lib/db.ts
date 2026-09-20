import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MongoClient, Db } from 'mongodb';
import { hashPassword } from './security';

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? '/tmp' : path.join(process.cwd(), 'server/data');
const DB_FILE = process.env.WISECARE_DB_FILE
  ? path.resolve(process.env.WISECARE_DB_FILE)
  : path.join(DATA_DIR, 'wisecare_db.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(path.dirname(DB_FILE))) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  }
} catch (err: any) {
  console.warn('[DB File Init Warning]:', err.message);
}

// Production must never boot against the stale deploy-time JSON bundle: if the URI
// is missing there, fail loudly at import time instead of silently serving old data
// (and a seeded admin) while every write evaporates.
if (
  process.env.NODE_ENV === 'production' &&
  !process.env.MONGODB_URI &&
  process.env.WISECARE_DISABLE_MONGODB !== '1'
) {
  throw new Error('[DB] MONGODB_URI is not configured. Refusing to boot production with a stale local data bundle.');
}

function getMongoUri(): string | null {
  if (process.env.WISECARE_DISABLE_MONGODB === '1') return null;
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  // Dev-only convenience: a local (gitignored) credentials file.
  try {
    const credsPath = path.join(process.cwd(), 'atlas-credentials.env');
    if (fs.existsSync(credsPath)) {
      const content = fs.readFileSync(credsPath, 'utf-8');
      const match = content.match(/MONGODB_URI=["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) {
        return match[1].includes('/wisecare')
          ? match[1]
          : `${match[1].replace(/\/$/, '')}/wisecare?retryWrites=true&w=majority`;
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[MongoDB] Could not read atlas-credentials.env:', message);
  }
  return null;
}

// Seed accounts carry publicly-known passwords (they lived in git history) — they
// must never be seeded into a production database, only into fresh dev environments.
const seedDefaultUsers = process.env.NODE_ENV !== 'production' && process.env.WISECARE_SEED_DEMO_USERS !== '0';

const defaultData = {
  users: seedDefaultUsers ? [
    {
      id: 'superadmin-1',
      username: 'adicore123',
      password: hashPassword('c38410a3'),
      name: 'מנהל מערכת ראשי (SuperAdmin)',
      email: 'admin@wisecare.health',
      role: 'superadmin',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'therapist-1',
      username: 'dr_sarah',
      password: hashPassword('Sarah@WiseCare2024!'),
      name: 'ד"ר שרה לוי',
      title: 'פסיכולוגית קלינית מומחית',
      email: 'sarah@wisecare.health',
      phone: '0501234567',
      role: 'therapist',
      specialty: 'חרדות, CBT וטיפול רגשי ממוקד',
      loginCode: 'dr-sarah-8821',
      active: true,
      createdAt: new Date().toISOString()
    }
  ] : [],
  clients: [],
  tasks: [],
  contentItems: [],
  contentAssignments: [],
  insights: [],
  appointments: [],
  formTemplates: [],
  formSignatures: [],
  settings: {
    greenApiToken: process.env.GREEN_API_TOKEN || '',
    greenApiInstanceId: process.env.GREEN_API_INSTANCE_ID || '',
    clinicName: 'מרחב טיפולי WiseCare',
    defaultMessageTemplate: 'שלום {{firstName}} יקר/ה,\nנפתח עבורך המרחב האישי המאובטח להמשך תרגול ומשימות טיפוליות עם {{therapistName}}.\n\nלהלן פרטי הגישה האישיים שלך למרחב:\n🔗 קישור כניסה:\n{{portalUrl}}\n\n👤 שם משתמש: {{username}}\n🔑 סיסמה אישית: {{password}}\n\nמאחלים לך מסע טיפולי פורה ומעצים! ✨',
    autoSendTherapistInviteWhatsApp: true,
    therapistInviteMessageTemplate: 'שלום {{name}} יקר/ה,\nברוך/ה הבא/ה למערכת ניהול הקליניקה והמרחב הטיפולי WiseCare! 🌿\n\nלהלן פרטי הגישה האישיים שלך למערכת:\n🔗 קישור כניסה ייחודי למרחב שלך:\n{{loginUrl}}\n\n👤 שם משתמש: {{username}}\n🔑 סיסמה ראשונית: {{password}}\n\nכתובת ישירה למרחב העבודה (CRM):\n{{crmUrl}}\n\nבברכה,\nהנהלת המערכת WiseCare',
    autoSendContentNotificationWhatsApp: true,
    articleNotificationTemplate: 'שלום {{firstName}} יקר/ה,\nשותף איתך מאמר חדש לקריאה במרחב האישי של WiseCare:\n📖 *{{title}}*\n\nלקריאת המאמר במרחב הטיפולי שלך:\n{{portalUrl}}\n\nקריאה מעשירה ויום נעים! 🌿',
    mediaNotificationTemplate: 'שלום {{firstName}} יקר/ה,\nשותף איתך תוכן חדש (סרטון / פוסט) במרחב האישי של WiseCare:\n🎬 *{{title}}*\n\nלצפייה בתוכן במרחב הטיפולי שלך:\n{{portalUrl}}\n\nצפייה מהנה ויום נפלא! ✨',
    formInviteMessageTemplate: 'שלום {{firstName}} יקר/ה,\nלפני הפגישה הראשונה שלנו, נדרשת חתימתך על המסמך הבא:\n📄 *{{formName}}*\n\nהחתימה מתבצעת בקלות מהנייד, דרך המרחב האישי המאובטח שלך:\n{{portalUrl}}\n\nתודה וברכה,\n{{therapistName}}'
  }
};

const ENTITY_COLLECTIONS = [
  'users',
  'clients',
  'tasks',
  'appointments',
  'insights',
  'contentItems',
  'contentAssignments',
  'formTemplates',
  'formSignatures',
  'auditLogs',
  'videoCalls',
  'scheduledCalls'
];

export class Database {
  data: Record<string, any>;
  mongoClient: MongoClient | null = null;
  mongoDb: Db | null = null;
  isMongoConnected = false;
  connectingPromise: Promise<boolean> | null = null;
  syncingPromise: Promise<void> | null = null;
  pendingWrites: Promise<any>[] = [];
  lastSyncTime = 0;
  // True once this instance completed at least one successful sync (or runs without Mongo).
  // The zero-latency read path is only allowed after it, so cold starts never serve the
  // stale deploy-time JSON bundle while MongoDB holds newer data.
  hasSyncedOnce = false;
  // ids written by THIS instance and not yet confirmed in MongoDB (per collection).
  locallyModifiedIds: Map<string, Set<string>> = new Map();
  // ids deleted locally while MongoDB was unreachable (per collection); replayed on next sync.
  pendingRemoteDeletes: Map<string, Set<string>> = new Map();

  constructor() {
    this.data = this.loadLocal();
    this.initLoginCodes();
    this.connect().catch(err => {
      console.warn('[MongoDB auto-connect]:', err.message);
    });
  }

  async ensureLoaded(forceSync = false): Promise<boolean> {
    const hasData = Boolean(this.data && (this.data.clients?.length || this.data.users?.length));

    // Fast zero-latency path — trusted after initial sync
    if (!forceSync && hasData && this.hasSyncedOnce) {
      if (!this.isMongoConnected) {
        this.connect().catch(() => { });
      } else if (Date.now() - this.lastSyncTime > 10000) {
        // Await sync so subsequent reads don't see stale data if threshold passed
        await this.syncWithMongo().catch(() => { });
      }
      return true;
    }

    const connected = await this.connect();
    if (connected && (forceSync || Date.now() - this.lastSyncTime > 10000)) {
      await this.syncWithMongo();
    }
    return connected;
  }

  async flush(): Promise<void> {
    if (this.pendingWrites.length > 0) {
      const writes = [...this.pendingWrites];
      this.pendingWrites = [];
      await Promise.allSettled(writes);
    }
    this.lastSyncTime = Date.now();
  }

  markModified(name: string, id: string) {
    if (!id) return;
    let set = this.locallyModifiedIds.get(name);
    if (!set) {
      set = new Set();
      this.locallyModifiedIds.set(name, set);
    }
    set.add(id);
  }

  markDeleted(name: string, id: string) {
    let modified = this.locallyModifiedIds.get(name);
    if (modified) modified.delete(id);
    let deletes = this.pendingRemoteDeletes.get(name);
    if (!deletes) {
      deletes = new Set();
      this.pendingRemoteDeletes.set(name, deletes);
    }
    deletes.add(id);
  }

  // Writes are pushed to MongoDB only when already connected; otherwise the op is
  // BUFFERED and drained the moment the connection opens. Never waits on connect()
  // from here — that would deadlock against syncWithMongo's initial flush().
  // (Before this buffer existed, a mutation racing the cold-start connect() was
  // silently dropped, and the next sync would resurrect/vanish it — the root of
  // "deleted/created items don't stick" on serverless.)
  bufferedWrites: Array<{ name: string; label: string; op: (col: any) => Promise<any> }> = [];

  queueRemoteWrite(name: string, label: string, op: (col: any) => Promise<any>) {
    if (!this.isMongoConnected || !this.mongoDb) {
      this.bufferedWrites.push({ name, label, op });
      return;
    }
    const p = op(this.mongoDb.collection(name))
      .catch((err: any) => console.error(`[MongoDB ${label} Error on ${name}]:`, err.message));
    this.pendingWrites.push(p);
  }

  /** Drain writes that arrived before the MongoDB connection opened. */
  private drainBufferedWrites() {
    if (this.bufferedWrites.length === 0) return;
    const drained = [...this.bufferedWrites];
    this.bufferedWrites = [];
    for (const w of drained) {
      const p = w.op(this.mongoDb!.collection(w.name))
        .catch((err: any) => console.error(`[MongoDB ${w.label} Error on ${w.name}]:`, err.message));
      this.pendingWrites.push(p);
    }
    console.log(`[MongoDB] Drained ${drained.length} buffered write(s) queued before connection`);
  }

  initLoginCodes() {
    let changed = false;
    (this.data.users || []).forEach((u: any) => {
      if (u.role === 'therapist' && !u.loginCode) {
        if (u.id === 'therapist-1' || u.username === 'dr_sarah') {
          u.loginCode = 'dr-sarah-8821';
        } else {
          const slug = (u.username || 'therapist').toLowerCase().replace(/[^a-z0-9]/g, '-');
          u.loginCode = `${slug}-${crypto.randomBytes(3).toString('hex').slice(0, 4)}`;
        }
        changed = true;
      }
    });
    if (changed) this.saveLocal();
  }

  loadLocal(): Record<string, any> {
    try {
      if (!fs.existsSync(DB_FILE)) {
        const bundleFile = path.join(process.cwd(), 'server/data/wisecare_db.json');
        if (fs.existsSync(bundleFile)) {
          const rawBundle = fs.readFileSync(bundleFile, 'utf-8');
          try {
            fs.writeFileSync(DB_FILE, rawBundle, 'utf-8');
          } catch { }
          return JSON.parse(rawBundle);
        }
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
        } catch { }
        return defaultData;
      }
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const merged = { ...defaultData, ...parsed };
      if (!merged.appointments || !Array.isArray(merged.appointments)) {
        merged.appointments = defaultData.appointments || [];
      }
      return merged;
    } catch (err) {
      console.error('Failed to load local DB, using default:', err);
      return defaultData;
    }
  }

  saveLocal() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {
      // Ignore read-only file system errors in serverless environments
    }
  }

  async connect(): Promise<boolean> {
    if (this.isMongoConnected && this.mongoDb) return true;
    if (this.connectingPromise) return this.connectingPromise;

    this.connectingPromise = (async () => {
      const uri = getMongoUri();
      if (!uri) {
        // Local-only mode — nothing to sync against, memory is the source of truth.
        this.hasSyncedOnce = true;
        return false;
      }

      const dbName = process.env.MONGODB_DB_NAME || 'wisecare';
      try {
        const client = new MongoClient(uri, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 10000
        });

        await client.connect();
        this.mongoClient = client;
        this.mongoDb = client.db(dbName);
        this.isMongoConnected = true;

        // Deliver writes that raced the connection BEFORE syncing — otherwise
        // the sync's remote snapshot would wipe them out of memory.
        this.drainBufferedWrites();

        await this.syncWithMongo();
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('⚠️ [MongoDB] Continuing with local database cache:', message);
        return false;
      } finally {
        this.connectingPromise = null;
      }
    })();

    return this.connectingPromise;
  }

  async syncWithMongo(): Promise<void> {
    if (!this.mongoDb) return;
    if (this.syncingPromise) return this.syncingPromise;

    this.syncingPromise = (async () => {
      try {
        await this.flush();
        this.lastSyncTime = Date.now();
        const dbInstance = this.mongoDb;
        if (!dbInstance) return;

        // Fetch all collections in parallel for maximum speed
        await Promise.all([
          ...ENTITY_COLLECTIONS.map(async (name) => {
            try {
              const col = dbInstance.collection(name);

              // Replay deletions that were made while MongoDB was unreachable
              const pendingDeletes = this.pendingRemoteDeletes.get(name);
              if (pendingDeletes && pendingDeletes.size > 0) {
                const ids = [...pendingDeletes];
                await Promise.allSettled(ids.map(id => col.deleteOne({ _id: id as any })));
                ids.forEach(id => pendingDeletes.delete(id));
              }

              const remoteDocs = await col.find({}).toArray();

              if (remoteDocs && remoteDocs.length > 0) {
                const remoteList = remoteDocs.map(doc => {
                  const item: any = { ...doc };
                  item.id = item.id || item._id?.toString();
                  delete item._id;
                  return item;
                });

                // Push ONLY items this instance actually wrote (inserts/updates made
                // while disconnected). Everything else that exists locally but not
                // remotely is stale bundle data whose absence from MongoDB usually
                // means it was deleted elsewhere — pushing it back would resurrect
                // deleted content.
                const modified = this.locallyModifiedIds.get(name);
                if (modified && modified.size > 0) {
                  const localDocs = this.data[name] || [];
                  const pushResults = await Promise.allSettled(
                    localDocs
                      .filter((item: any) => item?.id && modified.has(item.id))
                      .map((item: any) =>
                        col.updateOne(
                          { _id: item.id as any },
                          { $set: { ...item, _id: item.id } },
                          { upsert: true }
                        )
                      )
                  );

                  let pushedIndex = 0;
                  const localModifiedDocs = localDocs.filter(
                    (item: any) => item?.id && modified.has(item.id)
                  );
                  for (const item of localModifiedDocs) {
                    const result = pushResults[pushedIndex];
                    pushedIndex += 1;
                    if (result.status === 'fulfilled') {
                      modified.delete(item.id);
                      // Keep our latest local version over the (possibly older) remote snapshot
                      const idx = remoteList.findIndex(r => r.id === item.id);
                      if (idx >= 0) remoteList[idx] = item;
                      else remoteList.push(item);
                    } else {
                      console.warn(
                        `[MongoDB modified item push error on ${name}]:`,
                        (result.reason as any)?.message
                      );
                    }
                  }
                }

                this.data[name] = remoteList;
              } else {
                const localDocs = this.data[name] || [];
                if (localDocs.length > 0) {
                  const toInsert = localDocs.map((item: any) => ({
                    ...item,
                    _id: item.id || `id-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
                  }));
                  await col.insertMany(toInsert);
                }
              }
            } catch (err: any) {
              console.warn(`[MongoDB sync error on ${name}]:`, err.message);
            }
          }),
          // Sync settings from MongoDB if present
          (async () => {
            try {
              const settingsDoc = await dbInstance.collection('settings').findOne({ _id: 'global_settings' as any });
              if (settingsDoc && (settingsDoc as any).data) {
                this.data.settings = { ...this.data.settings, ...(settingsDoc as any).data };
              }
            } catch (err: any) {
              // Ignore settings sync failure
            }
          })()
        ]);

        this.saveLocal();
        this.hasSyncedOnce = true;
      } finally {
        this.syncingPromise = null;
      }
    })();

    return this.syncingPromise;
  }

  collection(name: string) {
    if (!this.data[name]) {
      this.data[name] = [];
      this.saveLocal();
    }
    const list: any[] = this.data[name];

    return {
      find: (filter: any = {}) => {
        if (typeof filter === 'function') {
          return list.filter(filter);
        }
        return list.filter(item => {
          return Object.entries(filter).every(([key, val]) => item[key] === val);
        });
      },
      findOne: (filter: any = {}) => {
        if (typeof filter === 'function') {
          return list.find(filter) || null;
        }
        return list.find(item => {
          return Object.entries(filter).every(([key, val]) => item[key] === val);
        }) || null;
      },
      findById: (id: string) => {
        return list.find(item => item.id === id || (item._id && item._id.toString() === id)) || null;
      },
      insertOne: (item: any) => {
        const newItem = {
          id: item.id || `id-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          createdAt: item.createdAt || new Date().toISOString(),
          ...item
        };
        list.push(newItem);
        this.saveLocal();
        this.markModified(name, newItem.id);

        const doc = { ...newItem, _id: newItem.id };
        this.queueRemoteWrite(name, 'insertOne',
          col => col.updateOne({ _id: newItem.id as any }, { $set: doc }, { upsert: true })
        );

        return newItem;
      },
      updateOne: (filter: any, update: any) => {
        const index = list.findIndex(item => {
          if (typeof filter === 'function') return filter(item);
          return Object.entries(filter).every(([key, val]) => item[key] === val);
        });
        if (index === -1) return null;
        list[index] = { ...list[index], ...update, updatedAt: new Date().toISOString() };
        this.saveLocal();
        this.markModified(name, list[index].id);

        const target = list[index];
        const doc = { ...target, _id: target.id };
        this.queueRemoteWrite(name, 'updateOne',
          col => col.updateOne({ _id: target.id as any }, { $set: doc }, { upsert: true })
        );

        return list[index];
      },
      updateById: (id: string, update: any) => {
        const index = list.findIndex(item => item.id === id || (item._id && item._id.toString() === id));
        if (index === -1) return null;
        list[index] = { ...list[index], ...update, updatedAt: new Date().toISOString() };
        this.saveLocal();
        this.markModified(name, list[index].id);

        const target = list[index];
        const doc = { ...target, _id: target.id };
        this.queueRemoteWrite(name, 'updateById',
          col => col.updateOne({ _id: target.id as any }, { $set: doc }, { upsert: true })
        );

        return list[index];
      },
      deleteById: (id: string) => {
        const index = list.findIndex(item => item.id === id || (item._id && item._id.toString() === id));
        if (index === -1) return false;
        list.splice(index, 1);
        this.saveLocal();
        this.markDeleted(name, id);

        this.queueRemoteWrite(name, 'deleteById', col => col.deleteOne({ _id: id as any }));

        return true;
      },
      softDelete: (id: string) => {
        const index = list.findIndex(item => item.id === id || (item._id && item._id.toString() === id));
        if (index === -1) return null;
        list[index] = {
          ...list[index],
          archived: true,
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        this.saveLocal();
        this.markModified(name, list[index].id);

        const target = list[index];
        this.queueRemoteWrite(name, 'softDelete',
          col => col.updateOne(
            { _id: (target.id || id) as any },
            { $set: { archived: true, deletedAt: list[index].deletedAt, updatedAt: list[index].updatedAt } }
          )
        );

        return list[index];
      },
      count: (filter: any = {}) => {
        if (typeof filter === 'function') {
          return list.filter(filter).length;
        }
        return list.filter(item => {
          return Object.entries(filter).every(([key, val]) => item[key] === val);
        }).length;
      }
    };
  }

  /**
   * Strict Tenant Scope Guard:
   * Wraps queries so any operations are strictly scoped to `therapistId`.
   */
  scoped(therapistId: string) {
    if (!therapistId) {
      throw new Error('[TenantScopeGuard] therapistId is strictly required for scoped tenant access');
    }
    return {
      collection: (colName: string) => {
        const col = this.collection(colName);
        return {
          find: (filter: any = {}) => {
            const baseFilter = typeof filter === 'function'
              ? (item: any) => item.therapistId === therapistId && filter(item)
              : { ...filter, therapistId };
            return col.find(baseFilter);
          },
          findOne: (filter: any = {}) => {
            const baseFilter = typeof filter === 'function'
              ? (item: any) => item.therapistId === therapistId && filter(item)
              : { ...filter, therapistId };
            return col.findOne(baseFilter);
          },
          findById: (id: string) => {
            const item = col.findById(id);
            if (item && item.therapistId !== therapistId) return null;
            return item;
          },
          insertOne: (item: any) => {
            return col.insertOne({ ...item, therapistId });
          },
          updateOne: (filter: any, update: any) => {
            const baseFilter = typeof filter === 'function'
              ? (item: any) => item.therapistId === therapistId && filter(item)
              : { ...filter, therapistId };
            return col.updateOne(baseFilter, update);
          },
          updateById: (id: string, update: any) => {
            const existing = col.findById(id);
            if (!existing || existing.therapistId !== therapistId) return null;
            return col.updateById(id, update);
          },
          deleteById: (id: string) => {
            const existing = col.findById(id);
            if (!existing || existing.therapistId !== therapistId) return false;
            return col.deleteById(id);
          },
          softDelete: (id: string) => {
            const existing = col.findById(id);
            if (!existing || existing.therapistId !== therapistId) return null;
            return col.softDelete(id);
          },
          count: (filter: any = {}) => {
            const baseFilter = typeof filter === 'function'
              ? (item: any) => item.therapistId === therapistId && filter(item)
              : { ...filter, therapistId };
            return col.count(baseFilter);
          }
        };
      }
    };
  }

  logAudit(entry: {
    actor: string;
    actorRole: string;
    action: string;
    targetId?: string;
    targetType?: string;
    details?: any;
    ip?: string;
  }) {
    try {
      return this.collection('auditLogs').insertOne({
        ...entry,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[AuditLog] Failed to record audit log:', err);
    }
  }

  async getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        mode: this.isMongoConnected ? 'mongodb-atlas' : 'local-json-cache',
        isMongoConnected: this.isMongoConnected,
        collections: {
          users: this.collection('users').count(),
          clients: this.collection('clients').count(),
          appointments: this.collection('appointments').count(),
          tasks: this.collection('tasks').count(),
          auditLogs: this.collection('auditLogs').count()
        }
      }
    };
  }

  getSettings() {
    return this.data.settings || defaultData.settings;
  }

  updateSettings(newSettings: any) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.saveLocal();

    if (this.isMongoConnected && this.mongoDb) {
      this.mongoDb.collection('settings')
        .updateOne(
          { _id: 'global_settings' as any },
          { $set: { _id: 'global_settings', data: this.data.settings, updatedAt: new Date().toISOString() } },
          { upsert: true }
        )
        .catch(err => console.error('[MongoDB updateSettings Error]:', err.message));
    }

    return this.data.settings;
  }
}

// Global singleton — cached on globalThis in ALL environments so every route module
// inside the same runtime shares one in-memory store (and one sync cycle).
declare global {
  var __wisecare_db: Database | undefined;
}

export const db = globalThis.__wisecare_db ?? new Database();
globalThis.__wisecare_db = db;
