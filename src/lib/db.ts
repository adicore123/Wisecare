import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MongoClient, Db } from 'mongodb';
import { hashPassword } from './security';

const DATA_DIR = path.join(process.cwd(), 'server/data');
const DB_FILE = process.env.WISECARE_DB_FILE
  ? path.resolve(process.env.WISECARE_DB_FILE)
  : path.join(DATA_DIR, 'wisecare_db.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

function getMongoUri(): string | null {
  if (process.env.WISECARE_DISABLE_MONGODB === '1') return null;
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
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

const defaultData = {
  users: [
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
  ],
  clients: [],
  tasks: [],
  contentItems: [],
  contentAssignments: [],
  insights: [],
  appointments: [],
  settings: {
    greenApiToken: process.env.GREEN_API_TOKEN || '',
    greenApiInstanceId: process.env.GREEN_API_INSTANCE_ID || '',
    clinicName: 'מרחב טיפולי WiseCare',
    defaultMessageTemplate: 'שלום {{firstName}} יקר/ה,\nנפתח עבורך המרחב האישי המאובטח להמשך תרגול ומשימות טיפוליות עם {{therapistName}}.\n\nלכניסה ישירה למרחב האישי שלך:\n{{portalUrl}}\n\nקוד הגישה שלך: {{pin}}\nמאחלים לך מסע טיפולי פורה ומעצים! ✨',
    autoSendTherapistInviteWhatsApp: true,
    therapistInviteMessageTemplate: 'שלום {{name}} יקר/ה,\nברוך/ה הבא/ה למערכת ניהול הקליניקה והמרחב הטיפולי WiseCare! 🌿\n\nלהלן פרטי הגישה האישיים שלך למערכת:\n🔗 קישור כניסה ייחודי למרחב שלך:\n{{loginUrl}}\n\n👤 שם משתמש: {{username}}\n🔑 סיסמה ראשונית: {{password}}\n\nכתובת ישירה למרחב העבודה (CRM):\n{{crmUrl}}\n\nבברכה,\nהנהלת המערכת WiseCare'
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
  'auditLogs'
];

export class Database {
  data: Record<string, any>;
  mongoClient: MongoClient | null = null;
  mongoDb: Db | null = null;
  isMongoConnected = false;
  connectingPromise: Promise<boolean> | null = null;

  constructor() {
    this.data = this.loadLocal();
    this.initLoginCodes();
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
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
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
    } catch (err) {
      console.error('Failed to persist local DB backup:', err);
    }
  }

  async connect(): Promise<boolean> {
    if (this.isMongoConnected) return true;
    if (this.connectingPromise) return this.connectingPromise;

    this.connectingPromise = (async () => {
      const uri = getMongoUri();
      if (!uri) return false;

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

  async syncWithMongo() {
    if (!this.mongoDb) return;

    for (const name of ENTITY_COLLECTIONS) {
      const col = this.mongoDb.collection(name);
      const remoteDocs = await col.find({}).toArray();

      if (remoteDocs && remoteDocs.length > 0) {
        this.data[name] = remoteDocs.map(doc => {
          const item: any = { ...doc };
          item.id = item.id || item._id?.toString();
          delete item._id;
          return item;
        });
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
    }

    this.saveLocal();
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

        if (this.isMongoConnected && this.mongoDb) {
          const doc = { ...newItem, _id: newItem.id };
          this.mongoDb.collection(name)
            .updateOne({ _id: newItem.id as any }, { $set: doc }, { upsert: true })
            .catch(err => console.error(`[MongoDB insertOne Error on ${name}]:`, err.message));
        }

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

        if (this.isMongoConnected && this.mongoDb) {
          const target = list[index];
          const doc = { ...target, _id: target.id };
          this.mongoDb.collection(name)
            .updateOne({ _id: target.id as any }, { $set: doc }, { upsert: true })
            .catch(err => console.error(`[MongoDB updateOne Error on ${name}]:`, err.message));
        }

        return list[index];
      },
      updateById: (id: string, update: any) => {
        const index = list.findIndex(item => item.id === id || (item._id && item._id.toString() === id));
        if (index === -1) return null;
        list[index] = { ...list[index], ...update, updatedAt: new Date().toISOString() };
        this.saveLocal();

        if (this.isMongoConnected && this.mongoDb) {
          const target = list[index];
          const doc = { ...target, _id: target.id };
          this.mongoDb.collection(name)
            .updateOne({ _id: target.id as any }, { $set: doc }, { upsert: true })
            .catch(err => console.error(`[MongoDB updateById Error on ${name}]:`, err.message));
        }

        return list[index];
      },
      deleteById: (id: string) => {
        const index = list.findIndex(item => item.id === id || (item._id && item._id.toString() === id));
        if (index === -1) return false;
        list.splice(index, 1);
        this.saveLocal();

        if (this.isMongoConnected && this.mongoDb) {
          this.mongoDb.collection(name)
            .deleteOne({ _id: id as any })
            .catch(err => console.error(`[MongoDB deleteById Error on ${name}]:`, err.message));
        }

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

        if (this.isMongoConnected && this.mongoDb) {
          const target = list[index];
          this.mongoDb.collection(name)
            .updateOne(
              { _id: (target.id || id) as any },
              { $set: { archived: true, deletedAt: list[index].deletedAt, updatedAt: list[index].updatedAt } }
            )
            .catch(err => console.error(`[MongoDB softDelete Error on ${name}]:`, err.message));
        }

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

// Global singleton for Next.js Fast Refresh
declare global {
  var __wisecare_db: Database | undefined;
}

export const db = globalThis.__wisecare_db ?? new Database();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__wisecare_db = db;
}
