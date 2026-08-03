import 'express-session';
import type { AdminUser } from '@prisma/client';

declare module 'express-session' {
  interface SessionData {
    adminUserId?: number;
    // Transient OAuth handshake state (§28: state validation + PKCE),
    // cleared as soon as the callback consumes it.
    linkedinOauthState?: string;
    linkedinOauthCodeVerifier?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminUser;
    }
  }
}

export {};
