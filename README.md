# PriceCheck AI V10

South Africa-focused price comparison app with a static frontend and secure-backend foundation.

## V10 upgrades
- Normalized frontend handling for backend search results
- Supabase Edge Function search endpoint
- Server-side Claude vision endpoint (identify-product)
- Compatibility API endpoint
- Price-history API endpoint
- Hardened Supabase schema with indexes and Row Level Security
- Safe demo seed data
- Stale-price detection after 72 hours
- Stock and retailer metadata in search responses
- No private AI, retailer or database secrets in the browser

## Current status
The GitHub Pages frontend still works without a backend and falls back to demo data. The Supabase backend files are ready, but they are not connected to your Supabase project until you deploy them and set the frontend function URL.

Demo prices are examples and are not live retailer quotes.

## V10 API layout
- GET /functions/v1/search?q=...
- POST /functions/v1/identify-product
- POST /functions/v1/compatibility
- GET /functions/v1/history?product_id=...

## Supabase setup
1. Create a Supabase project.
2. Run supabase/schema.sql in the SQL editor.
3. Run supabase/seed.sql if you want the demo catalog in the database.
4. Link/deploy the Edge Functions in supabase/functions/.
5. Add ANTHROPIC_API_KEY as a server-side Edge Function secret before using real Claude vision.
6. Put your public search function URL in backend-config.js.
7. Never put an Anthropic API key, retailer secret, or Supabase secret/service-role key in frontend JavaScript.

## Live retailer data
Do not scrape or publish retailer prices unless the source permits it. Replace the demo seed with permitted retailer APIs, feeds, affiliate data, or other compliant sources and record last_seen_at so stale offers can be marked.

## Live site
https://swanky1102.github.io/ricecheck-ai/

## Next production milestones
1. Connect the Supabase project.
2. Deploy and smoke-test all Edge Functions.
3. Add authenticated accounts and server-side alerts.
4. Add permitted South African retailer feeds.
5. Add real Claude product identification and structured query parsing.
6. Add price-history charts and affiliate/deep links.