import { pino } from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.isProduction ? 'info' : 'debug',
  transport: env.isProduction
    ? undefined
    : { target: 'pino/file', options: { destination: 1 } },
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', '*.password', '*.passwordHash'],
    remove: true,
  },
});
