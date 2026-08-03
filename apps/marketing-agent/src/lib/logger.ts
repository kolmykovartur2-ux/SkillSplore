import { pino } from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.isProduction ? 'info' : 'debug',
  transport: env.isProduction ? undefined : { target: 'pino/file', options: { destination: 1 } },
  redact: {
    // Never let LinkedIn tokens, session cookies, or the founder's password
    // reach a log line, even by accident.
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      '*.password',
      '*.passwordHash',
      '*.accessToken',
      '*.refreshToken',
      '*.encryptedAccessToken',
      '*.encryptedRefreshToken',
    ],
    remove: true,
  },
});
