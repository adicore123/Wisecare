import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import authRoutes from './routes/auth.routes.js';
import superadminRoutes from './routes/superadmin.routes.js';
import clientRoutes from './routes/client.routes.js';
import taskRoutes from './routes/task.routes.js';
import portalRoutes from './routes/portal.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import contentRoutes from './routes/content.routes.js';
import { startReminderScheduler } from './services/reminderScheduler.js';
import { db } from './db/db.js';

// 🔐 Critical startup check – refuse to start without JWT secret
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ FATAL: JWT_SECRET is not set or too short (minimum 32 chars). Server will not start.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5001;

// ─── Security Headers (Helmet) ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    }
  },
  crossOriginEmbedderPolicy: false // allow iframes for portal embeds if needed
}));

// ─── CORS – restrict to known client origin ─────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_APP_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:4173' // vite preview
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, server-to-server) or localhost dev ports
    if (
      !origin || 
      allowedOrigins.includes(origin) || 
      /^http:\/\/(localhost|127\.0\.0\.1):(517\d|3000|4173)$/.test(origin)
    ) {
      return callback(null, true);
    }
    callback(new Error(`CORS: Origin ${origin} is not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ─── Global Rate Limiter ─────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                  // max 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'יותר מדי בקשות. אנא נסה שוב בעוד מספר דקות.' }
});
app.use(globalLimiter);

// ─── Body Parser – tighter size limit ───────────────────────────────────────
app.use(express.json({ limit: '500kb' }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/content', contentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: db.isMongoConnected ? 'mongodb_atlas' : 'local_database',
    time: new Date().toISOString(),
    system: 'WiseCare CRM & Portal'
  });
});

// ─── Global Error Handler (prevent stack trace leakage) ──────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  // Do NOT expose internal error messages to the client
  res.status(err.status || 500).json({ error: 'אירעה שגיאה בשרת. אנא נסה שוב.' });
});

async function startServer() {
  // Connect to MongoDB Atlas
  await db.connect();

  app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`🌿 WiseCare Backend running on http://localhost:${PORT}`);
    console.log(`🍃 Database: ${db.isMongoConnected ? 'MongoDB Atlas (Cluster0)' : 'Local File Storage'}`);
    console.log(`🔐 JWT Auth: enabled | Helmet: enabled | CORS: restricted`);
    console.log(`🌿 Ready to serve Therapists, Clients & SuperAdmin`);
    console.log(`=============================================`);
    
    // Keep automated outbound messages disabled in isolated QA/local fixtures.
    if (process.env.WISECARE_DISABLE_SCHEDULER !== '1') {
      startReminderScheduler();
    }
  });
}

startServer();
