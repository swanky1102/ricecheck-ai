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

## Live-data boundary
Demo prices are not live retailer quotes. Real South African prices must come from retailer APIs, feeds, affiliate/developer programs, or another source that permits the intended use.

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