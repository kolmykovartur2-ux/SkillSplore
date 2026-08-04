/**
 * Payment provider adapter.
 *
 * Deliberately an interface with a null implementation rather than a direct
 * Stripe integration, for two reasons:
 *
 *  1. No processor has been chosen or credentialled yet. Writing a real
 *     integration now would mean writing untested code against an API nobody
 *     has keys for.
 *  2. Stripe and Windcave are both plausible for a New Zealand business.
 *     Keeping the seam means that decision costs one file rather than a
 *     refactor.
 *
 * Whatever is implemented here must use **hosted checkout**: we hand the
 * processor an amount and a return URL, the payer enters their card on the
 * processor's page, and we are told the outcome. Card numbers must never reach
 * this server. That is the difference between a PCI-DSS SAQ-A self-assessment
 * and a compliance project, and it is not worth trading away for a slightly
 * nicer payment form.
 */
import { env } from '../../config/env.js';

export interface CheckoutRequest {
  /** Our Payment row id, echoed back by the processor. */
  paymentId: number;
  amountCents: number;
  currency: string;
  description: string;
  /** Where to send the payer after success or cancellation. */
  successUrl: string;
  cancelUrl: string;
  /** Prevents a double-submitted form opening two checkouts. */
  idempotencyKey: string;
  /** For the receipt. Never used for marketing. */
  payerEmail: string;
}

export interface CheckoutSession {
  /** Where to redirect the payer. */
  url: string;
  /** The processor's id for this session, stored as Payment.providerRef. */
  providerRef: string;
}

export interface WebhookResult {
  /** Our Payment row id, recovered from the processor's payload. */
  paymentId: number;
  providerRef: string;
  outcome: 'succeeded' | 'failed' | 'cancelled';
  failureReason?: string;
  /** Amount the processor actually took, checked against what we expected. */
  amountCents: number;
  currency: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  /**
   * Verifies the signature and parses the payload.
   *
   * MUST throw on an invalid signature. An unverified webhook is an
   * unauthenticated request to mark an order paid, and the endpoint URL is not
   * a secret -- it appears in processor dashboards and in logs.
   */
  parseWebhook(rawBody: Buffer | string, signatureHeader: string | undefined): Promise<WebhookResult>;
}

export class PaymentsDisabledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentsDisabledError';
  }
}

/**
 * The default. Refuses everything.
 *
 * This is a feature: with PAYMENT_PROVIDER unset, any code path that reaches a
 * checkout fails loudly instead of appearing to charge someone and silently
 * doing nothing.
 */
const disabledProvider: PaymentProvider = {
  name: 'none',
  async createCheckout() {
    throw new PaymentsDisabledError(
      'No payment provider is configured. Set PAYMENT_PROVIDER and the associated keys, '
      + 'or leave PAYMENTS_ENABLED off.',
    );
  },
  async parseWebhook() {
    throw new PaymentsDisabledError('No payment provider is configured, so webhooks cannot be verified.');
  },
};

/**
 * Not yet implemented. Kept as an explicit throw rather than a silent fallback
 * to the disabled provider, so selecting a processor without implementing it
 * is a startup-visible error rather than a payment that never happens.
 *
 * Implementation notes for whoever writes this:
 *   - Stripe: use Checkout Sessions. Pass `paymentId` in `client_reference_id`
 *     and `idempotencyKey` as the Idempotency-Key header. Verify webhooks with
 *     `stripe.webhooks.constructEvent` against PAYMENT_WEBHOOK_SECRET and the
 *     RAW body -- a JSON-parsed body will not verify.
 *   - Windcave: use a Hosted Payment Page session, echo `paymentId` in the
 *     merchant reference, and verify the result server-side rather than
 *     trusting the browser return.
 *   - Both: check the amount and currency on the webhook against the Payment
 *     row. Never trust an amount supplied by the client.
 */
function notImplemented(name: string): PaymentProvider {
  return {
    name,
    async createCheckout() {
      throw new PaymentsDisabledError(
        `The "${name}" payment provider is selected but not implemented yet. See src/lib/payments/provider.ts.`,
      );
    },
    async parseWebhook() {
      throw new PaymentsDisabledError(`The "${name}" payment provider is selected but not implemented yet.`);
    },
  };
}

export function getPaymentProvider(): PaymentProvider {
  switch (env.PAYMENT_PROVIDER) {
    case 'stripe':
      return notImplemented('stripe');
    case 'windcave':
      return notImplemented('windcave');
    default:
      return disabledProvider;
  }
}
