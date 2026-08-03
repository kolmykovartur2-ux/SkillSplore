import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { writeAudit } from '../../lib/audit.js';
import { env } from '../../config/env.js';
import { getLinkedinClient } from '../../lib/linkedin/index.js';
import { encrypt } from '../../lib/crypto.js';
import { badRequest } from '../../lib/errors.js';
import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  generatePkcePair,
  generateState,
  LINKEDIN_SCOPES,
} from '../../lib/linkedin/oauth.js';
import { apiHeaders } from '../../lib/linkedin/realClient.js';
import { logger } from '../../lib/logger.js';

export const linkedinConnectionRouter = Router();
linkedinConnectionRouter.use(requireAuth);

// Two connection states, exactly per §5: draft-only, or LinkedIn-connected.
linkedinConnectionRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const client = getLinkedinClient();
    const status = await client.getConnectionStatus();
    res.json({
      mode: client.isMock ? 'demo_mock' : env.LINKEDIN_PUBLISHING_ENABLED ? 'real' : 'draft_only',
      ...status,
      publishingEnabled: env.LINKEDIN_PUBLISHING_ENABLED,
      realClientConfigured: env.linkedinRealClientConfigured,
    });
  }),
);

function oauthNotConfigured(res: import('express').Response) {
  res.status(501).json({
    error: {
      code: 'not_configured',
      message:
        'LINKEDIN_CLIENT_ID/LINKEDIN_CLIENT_SECRET/LINKEDIN_REDIRECT_URI (and LINKEDIN_PUBLISHING_ENABLED=true) are not set. Add them to this service\'s own .env — never paste secrets into a chat or commit them — then restart. See docs/marketing-agent/LINKEDIN_SETUP.md.',
    },
  });
}

// Real OAuth 2.0 (authorization code + PKCE), server-side only — the
// founder's browser is redirected to LinkedIn's own login/consent screen;
// this service never sees a LinkedIn password (§28, §5).
linkedinConnectionRouter.get(
  '/oauth/start',
  asyncHandler(async (req, res) => {
    if (!env.LINKEDIN_PUBLISHING_ENABLED || !env.linkedinRealClientConfigured) return oauthNotConfigured(res);
    const state = generateState();
    const { verifier, challenge } = generatePkcePair();
    req.session.linkedinOauthState = state;
    req.session.linkedinOauthCodeVerifier = verifier;
    req.session.save(() => {
      res.redirect(buildAuthorizationUrl(state, challenge));
    });
  }),
);

linkedinConnectionRouter.get(
  '/oauth/callback',
  asyncHandler(async (req, res) => {
    if (!env.LINKEDIN_PUBLISHING_ENABLED || !env.linkedinRealClientConfigured) return oauthNotConfigured(res);

    const { code, state, error, error_description } = req.query as Record<string, string | undefined>;
    if (error) throw badRequest(`LinkedIn denied the connection: ${error_description ?? error}`);
    if (!code || !state) throw badRequest('Missing code or state from LinkedIn.');
    if (!req.session.linkedinOauthState || state !== req.session.linkedinOauthState) {
      throw badRequest('OAuth state mismatch — please retry connecting from the dashboard.');
    }
    const verifier = req.session.linkedinOauthCodeVerifier;
    req.session.linkedinOauthState = undefined;
    req.session.linkedinOauthCodeVerifier = undefined;
    if (!verifier) throw badRequest('Missing PKCE verifier — please retry connecting from the dashboard.');

    const token = await exchangeCodeForToken(code, verifier);

    const connection = await prisma.linkedinConnection.create({
      data: {
        ownerAdminUserId: req.adminUser!.id,
        encryptedAccessToken: encrypt(token.accessToken),
        encryptedRefreshToken: token.refreshToken ? encrypt(token.refreshToken) : null,
        accessTokenExpiresAt: new Date(Date.now() + token.expiresInSeconds * 1000),
        grantedScopes: (token.scope ?? LINKEDIN_SCOPES.join(' ')).split(' ').filter(Boolean),
        connectionStatus: 'CONNECTED',
        lastVerifiedAt: new Date(),
      },
    });
    for (const scope of connection.grantedScopes) {
      await prisma.linkedinPermission.create({ data: { connectionId: connection.id, scope } });
    }

    // Discover organizations where this member has an admin role — the
    // required check from §5 ("verify that the authenticated user has
    // permission to publish on behalf of the organization").
    let organizationsFound = 0;
    try {
      const url = new URL('https://api.linkedin.com/rest/organizationAcls');
      url.searchParams.set('q', 'roleAssignee');
      url.searchParams.set('role', 'ADMINISTRATOR');
      url.searchParams.set('state', 'APPROVED');
      const aclRes = await fetch(url.toString(), { headers: apiHeaders(token.accessToken) });
      if (aclRes.ok) {
        const data = (await aclRes.json()) as { elements?: { organization?: string; role?: string }[] };
        for (const el of data.elements ?? []) {
          if (!el.organization) continue;
          organizationsFound++;
          await prisma.linkedinOrganization.upsert({
            where: { connectionId_linkedinOrganizationUrn: { connectionId: connection.id, linkedinOrganizationUrn: el.organization } },
            update: { authorizationStatus: el.role ?? 'ADMINISTRATOR', publishingAllowed: true, lastCheckedAt: new Date() },
            create: {
              connectionId: connection.id,
              linkedinOrganizationUrn: el.organization,
              displayName: env.LINKEDIN_ORGANIZATION_URN === el.organization ? 'SkillSplore' : el.organization,
              authorizationStatus: el.role ?? 'ADMINISTRATOR',
              publishingAllowed: true,
              analyticsAllowed: connection.grantedScopes.includes('r_organization_social'),
              lastCheckedAt: new Date(),
            },
          });
        }
      } else {
        logger.warn({ status: aclRes.status }, 'organizationAcls lookup failed during LinkedIn connect');
      }
    } catch (err) {
      logger.error({ err }, 'organizationAcls lookup threw during LinkedIn connect');
    }

    await writeAudit({ actorId: req.adminUser!.id, action: 'linkedin.connect', entityType: 'LinkedinConnection', entityId: connection.id, metadata: { organizationsFound } });
    res.redirect(`${env.DASHBOARD_ORIGIN}/linkedin?connected=1&organizations=${organizationsFound}`);
  }),
);

// One-click disconnect (§28): revokes local connection state, deletes
// stored tokens, stops scheduled publications from having anything to
// publish through, preserves historical published-post records.
linkedinConnectionRouter.post(
  '/disconnect',
  asyncHandler(async (req, res) => {
    const connections = await prisma.linkedinConnection.findMany({ where: { ownerAdminUserId: req.adminUser!.id } });
    await prisma.$transaction(
      connections.map((c) =>
        prisma.linkedinConnection.update({
          where: { id: c.id },
          data: { encryptedAccessToken: null, encryptedRefreshToken: null, connectionStatus: 'REVOKED' },
        }),
      ),
    );
    await writeAudit({ actorId: req.adminUser!.id, action: 'linkedin.disconnect', metadata: { connectionsCleared: connections.length } });
    res.json({ ok: true });
  }),
);
