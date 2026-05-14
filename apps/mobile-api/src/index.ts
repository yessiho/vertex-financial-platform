import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth';
import { entitiesRouter } from './routes/entities';
import { redirectsRouter } from './routes/redirects';
import { usersRouter } from './routes/users';
import { messagesRouter } from './routes/messages';
import { documentsRouter } from './routes/documents';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://10.255.255.254:3000',
    'http://10.255.255.254:3001',
    'http://10.255.255.254:3002',
    'https://web-portal-nu-plum.vercel.app',
    'https://admin-dashboard-pied-two-37.vercel.app',
    'https://vertex-web-portal-ci83emrp4-yessihos-projects.vercel.app',
    'https://admin-dashboard-3ggv8mgmr-yessihos-projects.vercel.app',
    'https://vertex-web-portal.vercel.app',
    'https://admin-dashboard-pied-two-37.vercel.app',
  ],
  credentials: true,
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use(limiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

app.use('/api/v1/auth',      authLimiter, authRouter);
app.use('/api/v1/entities',  entitiesRouter);
app.use('/api/v1/redirects', redirectsRouter);
app.use('/api/v1/users',     usersRouter);
app.use('/api/v1/messages',  messagesRouter);
app.use('/api/v1/documents', documentsRouter);

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Vertex API running on http://localhost:${PORT}`);
});

export default app;
