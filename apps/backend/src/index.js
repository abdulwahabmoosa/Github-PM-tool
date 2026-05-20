import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import prisma from './db/prisma.js';
import { startPoller } from './services/pollerWorker.js';
import { startRuleEngine } from './services/ruleEngineWorker.js';
import authRoutes from './routes/auth.routes.js';
import meRoutes from './routes/me.routes.js';
import reposRoutes from './routes/repos.routes.js';
import tasksRoutes from './routes/tasks.routes.js';
import githubDataRoutes from './routes/github-data.routes.js';
import insightsRoutes from './routes/insights.routes.js';
import rulesRoutes from './routes/rules.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import { ensureRuleConfig } from './lib/ruleConfig.js';

// BigInt can't be serialized by JSON.stringify by default
BigInt.prototype.toJSON = function () { return this.toString(); };

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT ?? 4000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: [
        "'self'",
        "data:",
        "https://avatars.githubusercontent.com",
        "https://*.githubusercontent.com",
        "https://github.com",
      ],
      connectSrc: ["'self'", "https://api.github.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());
app.use(session({
  name: 'taskmaster.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
}

app.get('/api', (_req, res) => {
  res.json({ name: 'TaskMaster API', version: '0.1.0' });
});

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', message: err.message });
  }
});

app.use('/auth', authRoutes);
app.use('/api', meRoutes);
app.use('/api', reposRoutes);
app.use('/api', tasksRoutes);
app.use('/api', githubDataRoutes);
app.use('/api', insightsRoutes);
app.use('/api', rulesRoutes);
app.use('/api', notificationsRoutes);

async function backfillRuleConfigs() {
  const repos = await prisma.repo.findMany({ select: { id: true } });
  for (const repo of repos) {
    await ensureRuleConfig(repo.id);
  }
  console.log(`[startup] Backfilled rule configs for ${repos.length} repo(s)`);
}

async function backfillOwnerRoles() {
  const repos = await prisma.repo.findMany({
    select: { id: true, connectedByUserId: true },
  });
  let updated = 0;
  for (const repo of repos) {
    const access = await prisma.repoAccess.findFirst({
      where: { repoId: repo.id, userId: repo.connectedByUserId },
    });
    if (access && access.role !== 'ADMIN') {
      await prisma.repoAccess.update({
        where: { id: access.id },
        data: { role: 'ADMIN' },
      });
      updated++;
    }
  }
  if (updated > 0) console.log(`[startup] Backfilled ${updated} owner role(s) to ADMIN`);
}

if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`TaskMaster API listening on http://localhost:${PORT}`);
  backfillRuleConfigs().catch(console.error);
  backfillOwnerRoles().catch(console.error);
  startPoller();
  startRuleEngine();
});
