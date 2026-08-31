# GEI Dam Garden — PayPal Commerce

This directory provides the server-side PayPal Sandbox/Live foundation for the game.

## Routes

- GET `/api/paypal/config`
- GET `/api/paypal/health`
- GET `/api/paypal/entitlements?player=...`
- POST `/api/paypal/create-order`
- POST `/api/paypal/capture-order`
- POST `/api/paypal/webhook`

## Environment variables

```text
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
PAYPAL_ENVIRONMENT=sandbox
GEI_PAYPAL_VERSION=0.1.0
```

Never commit `.env` files or secrets.

## Products

- GEI Discovery Pack — $10.00 USD
- GEI Builder Pack — $25.00 USD
- GEI Master Blueprint — $69.00 USD

Prices are authoritative on the server.

## Deployment

The repository is static-first, but these Node handlers require a serverless/Node host. Vercel can execute the API while GitHub Pages or another static host serves the game UI.

The included entitlement adapter is development-only in-memory storage. Before Live money is enabled, replace it with a persistent database and bind entitlements to an authenticated account/player ID rather than the editable display name.
