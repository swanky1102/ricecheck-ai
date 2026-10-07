# PriceCheck AI

South Africa-focused price comparison app with a static frontend and a Supabase Edge Function backend.

## Production-ready foundation
- Natural-language product search with local fallback
- Normalized backend offer responses
- RAM, SSD, GPU, CPU and laptop category detection
- Sorting and category filtering
- Persistent saved products
- Backend price-history endpoint
- Backend authenticated alert creation
- Compatibility endpoint with explicit verification warnings
- Secure Claude vision endpoint kept server-side
- Stale-offer detection after 72 hours
- Supabase Row Level Security schema
- Demo catalog clearly separated from live retailer data
- No private API/database secrets in browser code
- GitHub Actions JavaScript syntax validation

## Live retailer architecture
The `/search` Edge Function now has a modular retailer connector layer. It can consume permitted retailer JSON feeds and an optional Takealot connector through ReefAPI. Every connector is server-side; retailer/API credentials never go into the browser.

Supported connector slots are prepared for: Takealot, Makro, Game, Woolworths, Checkers, Shoprite, Pick n Pay, Incredible Connection, Computer Mania, HiFi Corp, Loot, Wootware and Evetech. Adding a retailer is a connector/configuration change rather than a frontend rewrite.

### Connector configuration
Set server-side Supabase Edge Function secrets for any feeds you are authorized to use:
- `REEFAPI_KEY` for the optional Takealot read connector.
- `AWIN_FEED_URL` for an authorized Awin product feed URL (comparison-site product feeds are supported by Awin).
- `MAKRO_FEED_URL`
- `GAME_FEED_URL`
- `WOOLWORTHS_FEED_URL`
- `CHECKERS_FEED_URL`
- `SHOPRITE_FEED_URL`
- `PICKNPAY_FEED_URL`
- `INCREDIBLE_FEED_URL`
- `COMPUTERMANIA_FEED_URL`
- `HIFICORP_FEED_URL`
- `LOOT_FEED_URL`
- `WOOTWARE_FEED_URL`
- `EVETECH_FEED_URL`

Only use feeds/APIs whose terms permit price/product-data aggregation and linking. Do not scrape behind authentication or bypass retailer controls.

Live results take priority. The existing Supabase demo catalog is retained only as a clearly labelled fallback until live connectors are configured.

Never put an Anthropic API key, Supabase service-role/secret key, retailer credential, or other private credential in frontend code.

## Frontend configuration
Set the public search Edge Function URL in backend-config.js, or leave it empty to use the local demo catalog.

Available backend routes: /search?q=..., /history?product_id=..., /alerts, /compatibility, /identify-product

## Supabase setup
1. Create a Supabase project.
2. Run supabase/schema.sql.
3. Optionally run supabase/seed.sql for demo records.
4. Deploy the Edge Functions.
5. Set server-side ANTHROPIC_API_KEY only if Claude vision is enabled.
6. Configure Supabase Auth before using real user alerts.
7. Replace demo seed offers with permitted retailer data feeds.

## Security
- RLS is enabled on database tables.
- Alert creation is authenticated server-side.
- Service-role/secret credentials never belong in the browser.
- Compatibility output is advisory and does not guarantee hardware fit.
- Stale offers are marked instead of silently presented as current.
- External offer links use noopener noreferrer.

## Validation
GitHub Actions checks browser JavaScript syntax on pushes and pull requests.

## Live site
https://swanky1102.github.io/ricecheck-ai/