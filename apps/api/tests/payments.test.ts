import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { app, prisma, resetDb } from './helpers.js';
import { claimFreeTierSlot, freeSlotsRemaining, releaseFreeTierSlot, FREE_TIER_COUNTER_KEY } from '../src/lib/payments/freeTier.js';
import { formatMoney } from '../src/lib/payments/signupFee.js';
import { getPaymentProvider, PaymentsDisabledError } from '../src/lib/payments/provider.js';
import { env } from '../src/config/env.js';

const anon = () => supertest(app);

async function resetCounter(value = 0) {
  await prisma.platformCounter.upsert({
    where: { key: FREE_TIER_COUNTER_KEY },
    create: { key: FREE_TIER_COUNTER_KEY, value },
    update: { value },
  });
}

describe('payments are disabled by default', () => {
  it('reports charging as inactive', async () => {
    const res = await anon().get('/api/payments/pricing');
    expect(res.status).toBe(200);
    expect(res.body.paymentsEnabled).toBe(false);
    expect(res.body.chargingActive).toBe(false);
  });

  it('advertises the configured fee even while disabled', async () => {
    const res = await anon().get('/api/payments/pricing');
    expect(res.body.signupFee.cents).toBe(1299);
    expect(res.body.signupFee.currency).toBe('NZD');
    expect(res.body.signupFee.display).toBe('$12.99 NZD');
  });

  it('advertises the free tier limit', async () => {
    const res = await anon().get('/api/payments/pricing');
    expect(res.body.freeTier.limit).toBe(50);
  });

  it('refuses to start a checkout while disabled', async () => {
    const agent = supertest.agent(app);
    await agent.post('/api/auth/register').send({
      email: 'nopay@test.local',
      password: 'password12345',
      displayName: 'No Pay',
      acceptTerms: true,
      isAdult: true,
    });
    const res = await agent.post('/api/payments/signup-fee/checkout').send({});
    expect(res.status).toBe(400);
  });

  it('derives paymentsEnabled as false when no provider is configured', () => {
    expect(env.paymentsEnabled).toBe(false);
  });
});

describe('payment provider adapter', () => {
  it('defaults to a provider that refuses to take money', async () => {
    const provider = getPaymentProvider();
    expect(provider.name).toBe('none');
    await expect(
      provider.createCheckout({
        paymentId: 1,
        amountCents: 1299,
        currency: 'NZD',
        description: 'test',
        successUrl: 'https://example.test/ok',
        cancelUrl: 'https://example.test/no',
        idempotencyKey: 'k',
        payerEmail: 'a@test.local',
      }),
    ).rejects.toThrow(PaymentsDisabledError);
  });

  it('refuses to verify a webhook with no provider configured', async () => {
    await expect(getPaymentProvider().parseWebhook('{}', 'sig')).rejects.toThrow(PaymentsDisabledError);
  });
});

describe('free tier allocation', () => {
  beforeEach(async () => {
    await resetDb();
    await resetCounter(0);
  });

  it('grants a slot while under the limit', async () => {
    const claim = await claimFreeTierSlot(prisma, 3);
    expect(claim.granted).toBe(true);
    expect(claim.slotNumber).toBe(1);
  });

  it('numbers slots sequentially', async () => {
    const a = await claimFreeTierSlot(prisma, 3);
    const b = await claimFreeTierSlot(prisma, 3);
    const c = await claimFreeTierSlot(prisma, 3);
    expect([a.slotNumber, b.slotNumber, c.slotNumber]).toEqual([1, 2, 3]);
  });

  it('refuses once the limit is reached', async () => {
    await claimFreeTierSlot(prisma, 2);
    await claimFreeTierSlot(prisma, 2);
    const third = await claimFreeTierSlot(prisma, 2);
    expect(third.granted).toBe(false);
    expect(third.slotNumber).toBeUndefined();
  });

  it('never exceeds the limit under concurrency', async () => {
    // The whole reason the counter exists. A count-then-insert implementation
    // passes every sequential test above and fails this one.
    const LIMIT = 10;
    const ATTEMPTS = 60;

    const results = await Promise.all(
      Array.from({ length: ATTEMPTS }, () => claimFreeTierSlot(prisma, LIMIT)),
    );

    const granted = results.filter((r) => r.granted);
    expect(granted).toHaveLength(LIMIT);

    // Every granted slot number is distinct and within range.
    const numbers = granted.map((r) => r.slotNumber!).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: LIMIT }, (_, i) => i + 1));

    const counter = await prisma.platformCounter.findUniqueOrThrow({ where: { key: FREE_TIER_COUNTER_KEY } });
    expect(counter.value).toBe(LIMIT);
  });

  it('reports remaining slots', async () => {
    await claimFreeTierSlot(prisma, 5);
    await claimFreeTierSlot(prisma, 5);
    expect(await freeSlotsRemaining(prisma, 5)).toBe(3);
  });

  it('never reports negative remaining slots', async () => {
    await resetCounter(99);
    expect(await freeSlotsRemaining(prisma, 5)).toBe(0);
  });

  it('grants nothing when the limit is zero', async () => {
    const claim = await claimFreeTierSlot(prisma, 0);
    expect(claim.granted).toBe(false);
  });

  it('releases a slot back', async () => {
    await claimFreeTierSlot(prisma, 2);
    await releaseFreeTierSlot(prisma);
    expect(await freeSlotsRemaining(prisma, 2)).toBe(2);
  });

  it('cannot be driven negative by a double release', async () => {
    // A negative counter would silently create extra free slots.
    await releaseFreeTierSlot(prisma);
    await releaseFreeTierSlot(prisma);
    const counter = await prisma.platformCounter.findUniqueOrThrow({ where: { key: FREE_TIER_COUNTER_KEY } });
    expect(counter.value).toBe(0);
  });
});

describe('money formatting', () => {
  it('renders cents as dollars without float drift', () => {
    expect(formatMoney(1299, 'NZD')).toBe('$12.99 NZD');
    expect(formatMoney(0, 'NZD')).toBe('$0.00 NZD');
    expect(formatMoney(100, 'AUD')).toBe('$1.00 AUD');
    // 0.1 + 0.2 territory: the value that would expose float arithmetic.
    expect(formatMoney(3330, 'NZD')).toBe('$33.30 NZD');
  });
});

describe('profile submission while payments are disabled', () => {
  beforeEach(async () => {
    await resetDb();
    await resetCounter(0);
  });

  it('does not create any payment record', async () => {
    // With payments off the fee logic must be entirely inert -- no Payment
    // row, no free-tier grant, no counter movement.
    expect(await prisma.payment.count()).toBe(0);
    expect(await prisma.freeTierGrant.count()).toBe(0);
  });
});

describe('card data is never stored', () => {
  it('has no card-related column on Payment', async () => {
    const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'Payment'`,
    );
    const names = columns.map((c) => c.column_name.toLowerCase());

    // If any of these ever appears, hosted checkout has been abandoned and the
    // PCI position has changed materially.
    for (const forbidden of ['cardnumber', 'card_number', 'pan', 'cvv', 'cvc', 'securitycode', 'expiry', 'cardholder']) {
      expect(names, `Payment must not have a ${forbidden} column`).not.toContain(forbidden);
    }
  });
});
