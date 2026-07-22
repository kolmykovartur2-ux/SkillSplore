import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pgPkg from 'pg';
import { pinoHttp } from 'pino-http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { apiRouter } from './routes.js';
import { loadUser } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';

const { Pool } = pgPkg;

export function createApp() {
  const app = express();

  // Behind a TLS-terminating reverse proxy in production, trust the first hop
  // so secure cookies and rate limiting see the real client.
  if (env.secureCookies) app.set('trust proxy', 1);

  app.use(
    helmet({
      // The SPA is served from the same origin; relax COEP so avatars/docs load.
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: env.isProduction ? undefined : false,
    }),
  );

  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));

  // Sessions persist in PostgreSQL (no Redis or proprietary service required).
  const PgStore = connectPgSimple(session);
  const sessionPool = new Pool({ connectionString: env.DATABASE_URL });
  app.use(
    session({
      name: 'learnfolk.sid',
      store: new PgStore({ pool: sessionPool, tableName: 'user_sessions', createTableIfMissing: true }),
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: env.secureCookies,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 30,
      },
    }),
  );

  app.use(loadUser);

  app.use('/api', apiLimiter, apiRouter);

  // Serve the built SPA when present (production/demo image). In development the
  // Vite dev server serves the client instead.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const webDist = path.resolve(here, '../../web/dist');
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
