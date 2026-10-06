# PriceCheck AI API Contract

Base URL: Supabase Edge Functions deployment URL.

## Search
`GET /search?q=<query>`
Returns normalized product offers sorted by price.

## Product identification
`POST /identify-product`
Accepts an image-identification request. Claude credentials remain server-side.

## Compatibility
`POST /compatibility`
Accepts `{ device, product }` and returns advisory compatibility checks. It must not guarantee hardware compatibility.

## Price history
`GET /history?product_id=<uuid>`
Returns offers and recorded price history.

## Alerts
`GET /alerts` — authenticated; returns the current user's alerts.
`POST /alerts` — authenticated; body `{ product_id, target_price_zar }` creates an alert owned by the signed-in user.
`DELETE /alerts?id=<uuid>` — authenticated; deletes only the signed-in user's alert.

## Security requirements
- Browser clients may use only the public Supabase publishable/anon key.
- Supabase service-role/secret keys must stay server-side.
- Alert routes require a valid Supabase Auth bearer token.
- Database RLS remains the final authorization boundary.
- Retailer credentials and private feeds must never be exposed to the browser.