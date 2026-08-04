import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { freeSlotsRemaining } from '../../lib/payments/freeTier.js';
import { checkEntitlement, ensurePendingPayment, formatMoney } from '../../lib/payments/signupFee.js';
import { getPaymentProvider, PaymentsDisabledError } from '../../lib/payments/provider.js';

export const paymentsRouter = Router();

/**
 * Public pricing. Safe to call signed-out — it powers the "first 50 free"
 * message on the marketing pages.
 *
 * `freeSlotsRemaining` is advisory. It is deliberately not what decides
 * whether anyone is charged; see freeTier.ts.
 */
paymentsRouter.get(
  '/pricing',
  asyncHandler(async (_req, res) => {
    const remaining = env.paymentsEnabled ? await freeSlotsRemaining(prisma) : env.FREE_SIGNUP_LIMIT;

    res.json({
      paymentsEnabled: env.paymentsEnabled,
      signupFee: {
        cents: env.SIGNUP_FEE_CENTS,
        currency: env.SIGNUP_FEE_CURRENCY,
        display: formatMoney(env.SIGNUP_FEE_CENTS, env.SIGNUP_FEE_CURRENCY),
      },
      freeTier: {
        limit: env.FREE_SIGNUP_LIMIT,
        remaining,
        // Approximate by nature: another submission can land between this
        // response and the reader acting on it.
        approximate: true,
      },
      // When false, nothing is charged and no payment record is created.
      // Stated explicitly so the frontend never has to infer it.
      chargingActive: env.paymentsEnabled,
    });
  }),
);

/** What the signed-in user's own profile owes, if anything. */
paymentsRouter.get(
  '/my-signup-fee',
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (!profile) throw notFound('You do not have a tutor profile yet.');

    const entitlement = await checkEntitlement(prisma, profile.id);
    res.json({
      ...entitlement,
      display: entitlement.amountCents
        ? formatMoney(entitlement.amountCents, entitlement.currency!)
        : null,
    });
  }),
);

/**
 * Starts a hosted checkout.
 *
 * Returns 501 while no processor is implemented, rather than pretending to
 * work. The amount comes from configuration, never from the request body — a
 * client that can name its own price is the oldest bug in online payments.
 */
paymentsRouter.post(
  '/signup-fee/checkout',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!env.paymentsEnabled) throw badRequest('Payments are not enabled.');

    const profile = await prisma.tutorProfile.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (!profile) throw badRequest('Start your tutor profile first.');

    const entitlement = await checkEntitlement(prisma, profile.id);
    if (entitlement.allowed) {
      res.json({ alreadyEntitled: true, reason: entitlement.reason });
      return;
    }

    const payment = await ensurePendingPayment(prisma, {
      userId: req.user!.id,
      tutorProfileId: profile.id,
    });

    try {
      const session = await getPaymentProvider().createCheckout({
        paymentId: payment.id,
        amountCents: payment.amountCents,
        currency: payment.currency,
        description: 'SkillSplore tutor profile activation',
        successUrl: new URL('/tutor/onboarding?paid=1', env.WEB_ORIGIN).toString(),
        cancelUrl: new URL('/tutor/onboarding?cancelled=1', env.WEB_ORIGIN).toString(),
        idempotencyKey: payment.idempotencyKey,
        payerEmail: req.user!.email,
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerRef: session.providerRef },
      });

      res.json({ checkoutUrl: session.url, paymentId: payment.id });
    } catch (err) {
      if (err instanceof PaymentsDisabledError) {
        res.status(501).json({
          error: 'payments_not_implemented',
          message: err.message,
        });
        return;
      }
      throw err;
    }
  }),
);

/** The user's own payment history. Never exposes provider secrets. */
paymentsRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await prisma.payment.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        kind: true,
        status: true,
        amountCents: true,
        currency: true,
        receiptNumber: true,
        createdAt: true,
        paidAt: true,
        refundedAt: true,
      },
    });

    res.json({
      payments: rows.map((p) => ({ ...p, display: formatMoney(p.amountCents, p.currency) })),
    });
  }),
);
