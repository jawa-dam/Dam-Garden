# Dam Garden PayPal Setup

## Current state

The PayPal integration lives on `feature/paypal-commerce`.

The game remains static-first. Deploy this repository to Vercel (or another Node/serverless host) so `/api/paypal/*` can execute.

## Vercel environment variables

```text
PAYPAL_CLIENT_ID=<PayPal Sandbox REST Client ID>
PAYPAL_CLIENT_SECRET=<PayPal Sandbox Secret>
PAYPAL_WEBHOOK_ID=<PayPal Sandbox Webhook ID>
PAYPAL_ENVIRONMENT=sandbox
GEI_PAYPAL_VERSION=0.1.0
```

Never commit these values to GitHub.

## PayPal Sandbox webhook

After the Vercel deployment URL exists, create a Sandbox webhook in the PayPal Developer Dashboard targeting:

`https://YOUR-VERCEL-DOMAIN/api/paypal/webhook`

Subscribe to `PAYMENT.CAPTURE.COMPLETED` at minimum. Copy the resulting Webhook ID into Vercel as `PAYPAL_WEBHOOK_ID`.

## Health check

Open:

`https://YOUR-VERCEL-DOMAIN/api/paypal/health`

Expected before webhook setup:

`checkoutReady: true`, `webhookReady: false`

Expected after webhook setup:

`checkoutReady: true`, `webhookReady: true`

## Production warning

The entitlement/capture adapter in `api/paypal/index.js` is intentionally development-only in-memory storage. Before live money, replace it with a durable database and authenticated account/player identity. Do not treat a browser username or localStorage as payment identity.
