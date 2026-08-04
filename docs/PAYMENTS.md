# Tutor signup fee

**Status: rails built, charging DISABLED. No processor selected, no money has
ever moved.**

NZD 12.99 one-off to publish a tutor profile. First 50 tutors free.

---

## Current state

| | |
|---|---|
| `PAYMENTS_ENABLED` | `false` |
| `PAYMENT_PROVIDER` | `none` (a real provider that refuses to take money) |
| Fee | 1299 cents NZD |
| Free tier | 50 |
| Payments taken | **zero** |

With payments off the fee logic is entirely inert: no `Payment` row is
created, no free-tier slot is consumed, and nothing in the product mentions a
charge. Profile submission behaves exactly as it did before this existed.

## The two things that matter most

### 1. Card data never touches this system

There is **no column anywhere** for a card number, expiry or security code,
and there must never be one. Payment goes through the processor's **hosted
checkout**: the payer enters their card on the processor's page, and we are
told the outcome.

This is the difference between a PCI-DSS SAQ-A self-assessment and a
compliance project, and it is not worth trading for a slightly nicer form.

Guarded by a test (`payments.test.ts` → "card data is never stored") that
inspects `information_schema` and fails if a card-shaped column appears.

### 2. "First 50 free" is correct under concurrency

The obvious implementation is wrong:

```ts
const used = await prisma.freeTierGrant.count();
if (used < 50) await prisma.freeTierGrant.create(...);   // WRONG
```

That is check-then-act. Two simultaneous submissions both read 49 and both
insert. It passes every sequential test and gives away slot 51.

Instead a single-row counter is incremented with the guard in the same
statement:

```sql
UPDATE "PlatformCounter" SET value = value + 1
WHERE key = 'free_tutor_signups' AND value < 50
RETURNING value
```

Postgres holds a row lock for the UPDATE, so concurrent callers serialise.
Exactly 50 get a row back. No retry loop, no advisory locks, no serializable
isolation.

`FreeTierGrant.slotNumber` is additionally `UNIQUE`, so even if that function
were bypassed the database still refuses to issue a slot twice.

Proven by a test that fires 60 concurrent claims against a limit of 10 and
asserts exactly 10 grants with distinct sequential numbers.

## When the fee applies

At **profile submission**, not at registration — so slots go to people who
actually finished a profile, not to anyone who registered an email and left.

Entitlement and the status change share a transaction, so a failure after a
slot is claimed releases it rather than burning it.

Order of checks in `entitleForSubmission`:

1. Payments disabled → allow.
2. Profile already has a `FreeTierGrant` → allow.
3. Profile has a `SUCCEEDED` payment → allow.
4. A free slot is available → claim it, allow.
5. Otherwise → **HTTP 402**, with the amount.

402 rather than 403 on purpose: the request is valid and the user is
permitted, they just have to pay. The distinct code lets the frontend route to
checkout instead of showing a generic refusal.

---

## What you still have to decide

### Choose a processor

**Recommendation: Stripe**, unless you have a reason to prefer a local
acquirer. Widely used in NZ, good hosted Checkout, good webhook tooling,
straightforward test mode.

**Windcave** is the NZ-local alternative and worth comparing if you want a
domestic acquirer relationship or better local card-present rates later.

The adapter interface in `src/lib/payments/provider.ts` means this choice
costs one file, not a refactor. Both are currently `notImplemented()` stubs
that throw — selecting one without implementing it fails loudly rather than
silently not charging.

### GST

**Get advice.** NZ GST registration is compulsory above a turnover threshold,
and voluntary below it. It matters here because:

- 50 free signups produce **no revenue at all**;
- at $12.99 a head you would need a lot of tutors to approach the threshold;
- but the price shown must state whether GST is included, and changing that
  later means changing the price or absorbing the tax.

Decide before the first charge, not after.

### Refunds

Terms s9.4 currently promises a refund if a profile is **rejected at review**.
That is the honest position — you would be charging for a service not
supplied — but it means:

- someone has to actually process refunds;
- a refund path through the processor needs implementing (`Payment.refundedAt`
  and `refundReason` exist; nothing writes them yet).

### The liability cap

Charging changes the analysis in `LEGAL_REVIEW_REQUIRED.md` question 1. A cap
expressed as "fees paid to SkillSplore" is currently a cap of **zero**, which
is likely unfair and unenforceable. Once you charge $12.99 it becomes a cap of
$12.99, which is barely better.

Tell the lawyer the fee is coming so they price the clause once.

---

## Still to build

- [ ] Implement the chosen provider adapter
- [ ] Webhook endpoint with **signature verification** and replay safety
      (`Payment.providerRef` is unique, which is what makes replay safe)
- [ ] Refund path
- [ ] Receipt emails — **blocked**: no production SMTP provider is configured
- [ ] Frontend checkout flow and the "you are number N of 50" message
- [ ] Admin view of payments
- [ ] Reconciliation: processor settlements vs `Payment` rows

## Webhook notes for whoever implements it

- Verify the signature against the **raw** body. A JSON-parsed body will not
  verify.
- Check the amount and currency on the webhook against the `Payment` row.
  Never trust an amount from the client.
- Webhooks arrive more than once, by design. `providerRef` is unique so a
  replay cannot create a second payment.
- Treat the browser redirect as a hint, never as proof of payment. The webhook
  is the source of truth.
