import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { MongoClient } from 'mongodb';
import { hashPassword } from '../utils/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = process.env.WISECARE_DB_FILE
  ? path.resolve(process.env.WISECARE_DB_FILE)
  : path.join(DATA_DIR, 'wisecare_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Fallback to load atlas-credentials.env if MONGODB_URI is not set in process.env
function getMongoUri() {
  if (process.env.WISECARE_DISABLE_MONGODB === '1') return null;
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  try {
    const credsPath = path.join(__dirname, '../../../atlas-credentials.env');
    if (fs.existsSync(credsPath)) {
      const content = fs.readFileSync(credsPath, 'utf-8');
      const match = content.match(/MONGODB_URI=["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) {
        return match[1].includes('/wisecare') ? match[1] : `${match[1].replace(/\/$/, '')}/wisecare?retryWrites=true&w=majority`;
      }
    }
  } catch (err) {
    console.warn('[MongoDB] Could not read atlas-credentials.env:', err.message);
  }
  return null;
}

const defaultData = {
  users: [
    {
      id: 'superadmin-1',
      username: 'adicore123',
      password: hashPassword('WiseCare@Admin2024!'),
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
  clients: [
    {
      id: 'client-demo-1',
      therapistId: 'therapist-1',
      firstName: 'יונתן',
      lastName: 'כהן',
      phone: '0521234567',
      age: 29,
      gender: 'זכר',
      notes: 'מתמודד עם חרדת ביצוע במקום העבודה. מגיב טוב מאוד לתרגילי נשימות וכתיבת יומן רגשות.',
      portalCode: 'jonathan-c821',
      pin: '1234',
      whatsappStatus: 'sent',
      lastSentAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'client-demo-2',
      therapistId: 'therapist-1',
      firstName: 'מיכל',
      lastName: 'ברק',
      phone: '0547654321',
      age: 34,
      gender: 'נקבה',
      notes: 'שיפור הדימוי העצמי וחיזוק גבולות ביחסים בינאישיים.',
      portalCode: 'michal-b490',
      pin: '4321',
      whatsappStatus: 'not_sent',
      lastSentAt: null,
      createdAt: new Date().toISOString()
    }
  ],
  tasks: [
    {
      id: 'task-demo-1',
      clientId: 'client-demo-1',
      therapistId: 'therapist-1',
      title: 'תרגיל נשימה מודעת 4-7-8',
      description: 'בצעו 3 סבבים של נשימת 4-7-8 בכל בוקר ובכל פעם שחשים מתח בחזה. שימו לב לתחושת הרפיון בכתפיים.',
      category: 'ויסות רגשי',
      dueDate: '2026-09-20',
      completed: true,
      completedAt: new Date().toISOString(),
      clientNotes: 'עזר לי מאוד לפני ישיבת צוות ביום חמישי!',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task-demo-2',
      clientId: 'client-demo-1',
      therapistId: 'therapist-1',
      title: 'יומן מחשבות אוטומטיות (CBT)',
      description: 'רשמו לפחות אירוע אחד ביום שעורר אי-נוחות: מה היה האירוע, מה המחשבה האוטומטית שעלתה, ואיזו מחשבה חלופית מאוזנת יותר ניתן לאמץ.',
      category: 'תיעוד ומודעות',
      dueDate: '2026-09-25',
      completed: false,
      completedAt: null,
      clientNotes: '',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task-demo-3',
      clientId: 'client-demo-2',
      therapistId: 'therapist-1',
      title: 'תרגיל עוגן עצמי והכרת תודה',
      description: 'בסוף כל יום, ציינו 3 דברים שהייתם גאים בעצמכם עליהם (אפילו קטנים ביותר).',
      category: 'חיזוק דימוי עצמי',
      dueDate: '2026-09-22',
      completed: false,
      completedAt: null,
      clientNotes: '',
      createdAt: new Date().toISOString()
    }
  ],
  contentItems: [],
  contentAssignments: [],
  insights: [
    {
      id: 'insight-1',
      clientId: 'client-demo-1',
      portalCode: 'jonathan-c821',
      title: 'התמודדות עם מתח בישיבת צוות בוקר',
      content: 'הרגשתי דפיקות לב חזקות כשהתבקשתי להציג את הפרויקט, אבל לקחתי שלוש נשימות עמוקות 4-7-8 כפי שד"ר שרה לימדה אותי. זה ממש החזיר לי את השליטה והדיבור זרם.',
      mood: 'הצלחה וסיפוק',
      intensity: 7,
      recordedDate: '10/09/2026',
      recordedTime: '11:45',
      createdAt: '2026-09-10T08:45:00.000Z'
    },
    {
      id: 'insight-2',
      clientId: 'client-demo-1',
      portalCode: 'jonathan-c821',
      title: 'מחשבה אוטומטית של "אני לא מספיק טוב"',
      content: 'הבוקר קיבלתי הערה מהמנהל על דוח. מיד קפצה לי המחשבה שהוא חושב שאני לא מתאים לתפקיד. עצרתי ורשמתי ביומן: זו רק הערה נקודתית ולא מעידה על הערך שלי.',
      mood: 'חרדה שנרגעה',
      intensity: 6,
      recordedDate: '11/09/2026',
      recordedTime: '17:20',
      createdAt: '2026-09-11T14:20:00.000Z'
    }
  ],
  appointments: [
    {
      id: 'apt-demo-1',
      therapistId: 'therapist-1',
      clientId: 'client-demo-1',
      clientName: 'יונתן כהן',
      clientPhone: '0521234567',
      date: '2026-09-15',
      time: '16:00',
      durationMinutes: 50,
      type: 'in_person',
      typeName: 'פגישה בקליניקה',
      location: 'רחוב רוטשילד 45, תל אביב (קליניקה מרכזית)',
      status: 'confirmed',
      notes: 'פגישת מעקב וסקירת תרגיל CBT',
      reminderSent: false,
      reminderSentAt: null,
      requestedBy: 'therapist',
      createdAt: new Date().toISOString()
    },
    {
      id: 'apt-demo-2',
      therapistId: 'therapist-1',
      clientId: 'client-demo-1',
      clientName: 'יונתן כהן',
      clientPhone: '0521234567',
      date: '2026-09-18',
      time: '11:00',
      durationMinutes: 50,
      type: 'zoom',
      typeName: 'פגישת וידאו (Zoom)',
      location: 'קישור יישלח לקראת המועד',
      status: 'pending',
      notes: 'בקשת תור מהפורטל: שיחה לפני מצגת גדולה בעבודה',
      reminderSent: false,
      reminderSentAt: null,
      requestedBy: 'client',
      createdAt: new Date().toISOString()
    }
  ],
  settings: {
    greenApiToken: process.env.GREEN_API_TOKEN || 'b524c107b4994b79a904258cce365939c284a489e93540e2a2',
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
  'contentAssignments'
];

class Database {
  constructor() {
    this.data = this.loadLocal();
    this.initLoginCodes();
    this.mongoClient = null;
    this.mongoDb = null;
    this.isMongoConnected = false;
    this.connectingPromise = null;
  }

  initLoginCodes() {
    let changed = false;
    (this.data.users || []).forEach(u => {
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

  loadLocal() {
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
      (merged.users || []).forEach(u => {
        if (u.role === 'therapist' && !u.loginCode) {
          const slug = (u.username || 'therapist').toLowerCase().replace(/[^a-z0-9]/g, '-');
          u.loginCode = `${slug}-${crypto.randomBytes(3).toString('hex').slice(0, 4)}`;
        }
      });
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

  async connect() {
    if (this.isMongoConnected) return true;
    if (this.connectingPromise) return this.connectingPromise;

    this.connectingPromise = (async () => {
      const uri = getMongoUri();
      if (!uri) {
        console.warn('⚠️ [MongoDB] No MONGODB_URI configured. Running with local JSON database.');
        return false;
      }

      const dbName = process.env.MONGODB_DB_NAME || 'wisecare';
      console.log(`🍃 [MongoDB] Connecting to MongoDB Atlas (database: ${dbName})...`);

      try {
        const client = new MongoClient(uri, {
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 15000
        });

        await client.connect();
        this.mongoClient = client;
        this.mongoDb = client.db(dbName);
        this.isMongoConnected = true;
        console.log(`✅ [MongoDB Atlas] Successfully connected to cluster!`);

        // Synchronize and migrate collections
        await this.syncWithMongo();
        return true;
      } catch (err) {
        console.error('❌ [MongoDB Atlas] Connection error:', err.message);
        console.warn('⚠️ [MongoDB] Continuing with local database cache.');
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
        // Load data from MongoDB Atlas
        this.data[name] = remoteDocs.map(doc => {
          const item = { ...doc };
          item.id = item.id || item._id?.toString();
          delete item._id;
          return item;
        });
      } else {
        // MongoDB collection is empty -> migrate local data into MongoDB
        const localDocs = this.data[name] || [];
        if (localDocs.length > 0) {
          const toInsert = localDocs.map(item => ({
            ...item,
            _id: item.id || `id-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
          }));
          await col.insertMany(toInsert);
          console.log(`📦 [MongoDB] Migrated ${toInsert.length} records into '${name}' collection in MongoDB Atlas.`);
        }
      }
    }

    // Sync settings collection
    try {
      const settingsCol = this.mongoDb.collection('settings');
      const remoteSettings = await settingsCol.findOne({ _id: 'global_settings' });
      if (remoteSettings && remoteSettings.data) {
        this.data.settings = { ...defaultData.settings, ...remoteSettings.data };
      } else {
        const localSettings = this.data.settings || defaultData.settings;
        await settingsCol.updateOne(
          { _id: 'global_settings' },
          { $set: { _id: 'global_settings', data: localSettings, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
        console.log(`📦 [MongoDB] Migrated system settings into MongoDB Atlas.`);
      }
    } catch (settingsErr) {
      console.warn('[MongoDB] Settings sync error:', settingsErr.message);
    }

    this.saveLocal();
    console.log(`🚀 [MongoDB Atlas] Database synchronized successfully.`);
  }

  collection(name) {
    if (!this.data[name]) {
      this.data[name] = [];
      this.saveLocal();
    }
    const list = this.data[name];

    return {
      find: (filter = {}) => {
        if (typeof filter === 'function') {
          return list.filter(filter);
        }
        return list.filter(item => {
          return Object.entries(filter).every(([key, val]) => item[key] === val);
        });
      },
      findOne: (filter = {}) => {
        if (typeof filter === 'function') {
          return list.find(filter) || null;
        }
        return list.find(item => {
          return Object.entries(filter).every(([key, val]) => item[key] === val);
        }) || null;
      },
      findById: (id) => {
        return list.find(item => item.id === id || (item._id && item._id.toString() === id)) || null;
      },
      insertOne: (item) => {
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
            .updateOne({ _id: newItem.id }, { $set: doc }, { upsert: true })
            .catch(err => console.error(`[MongoDB insertOne Error on ${name}]:`, err.message));
        }

        return newItem;
      },
      updateOne: (filter, update) => {
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
            .updateOne({ _id: target.id }, { $set: doc }, { upsert: true })
            .catch(err => console.error(`[MongoDB updateOne Error on ${name}]:`, err.message));
        }

        return list[index];
      },
      updateById: (id, update) => {
        const index = list.findIndex(item => item.id === id || (item._id && item._id.toString() === id));
        if (index === -1) return null;
        list[index] = { ...list[index], ...update, updatedAt: new Date().toISOString() };
        this.saveLocal();

        if (this.isMongoConnected && this.mongoDb) {
          const target = list[index];
          const doc = { ...target, _id: target.id };
          this.mongoDb.collection(name)
            .updateOne({ _id: target.id }, { $set: doc }, { upsert: true })
            .catch(err => console.error(`[MongoDB updateById Error on ${name}]:`, err.message));
        }

        return list[index];
      },
      deleteById: (id) => {
        const index = list.findIndex(item => item.id === id || (item._id && item._id.toString() === id));
        if (index === -1) return false;
        list.splice(index, 1);
        this.saveLocal();

        if (this.isMongoConnected && this.mongoDb) {
          this.mongoDb.collection(name)
            .deleteOne({ _id: id })
            .catch(err => console.error(`[MongoDB deleteById Error on ${name}]:`, err.message));
        }

        return true;
      },
      count: (filter = {}) => {
        if (typeof filter === 'function') {
          return list.filter(filter).length;
        }
        return list.filter(item => {
          return Object.entries(filter).every(([key, val]) => item[key] === val);
        }).length;
      }
    };
  }

  getSettings() {
    return this.data.settings || defaultData.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.saveLocal();

    if (this.isMongoConnected && this.mongoDb) {
      this.mongoDb.collection('settings')
        .updateOne(
          { _id: 'global_settings' },
          { $set: { _id: 'global_settings', data: this.data.settings, updatedAt: new Date().toISOString() } },
          { upsert: true }
        )
        .catch(err => console.error('[MongoDB updateSettings Error]:', err.message));
    }

    return this.data.settings;
  }
}

export const db = new Database();
