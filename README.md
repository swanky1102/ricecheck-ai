# PriceCheck AI V3

South Africa-focused price comparison MVP, published as a static site.

## V2 features
- Natural-language-style product search
- Budget phrases can be entered and searched against the demo catalog
- RAM / SSD / GPU filters
- Best-value, lowest-price, highest-price and name sorting
- Deal/value scoring
- Demo price-position indicator
- Saved products with browser persistence
- Demo price-alert storage
- Compatibility assistant with safer verification wording
- Drag-and-drop product image scanner UI
- Mobile-responsive layout
- No private API keys in the browser

## Live site
https://swanky1102.github.io/ricecheck-ai/

## Important
The current catalog still contains **demo data**. Prices and stock shown in the UI are not live retailer quotes.

The frontend intentionally does not contain Claude/OpenAI/Anthropic API keys. AI vision, natural-language product extraction, live retailer data, alerts and price history should be implemented behind a secure backend.

## Recommended V3 architecture
1. Frontend: this static site.
2. Backend: serverless API or Supabase Edge Functions.
3. Database: normalized products, offers, retailers, price history and user alerts.
4. Data: permitted retailer APIs, affiliate feeds or other compliant sources.
5. AI: secure server-side model call for query parsing, product identification and compatibility reasoning.
6. Authentication: optional account system for cross-device saved products.
7. Monitoring: validate retailer feeds and mark stale prices.

## Local development
Open `index.html` in a browser, or serve the folder with any simple static HTTP server.

## Roadmap
- V3: secure backend + real product schema
- V4: compliant South African retailer feeds
- V5: real AI vision and compatibility database
- V6: accounts, alerts and price history
- V7: affiliate links and retailer integrations


## V3 foundation

V3 is the backend-ready stage. The frontend remains deployable on GitHub Pages while a future secure API can provide live search results. Private AI keys and retailer credentials must remain server-side.

Next: connect a database, permitted retailer feeds, secure AI query parsing, product vision, compatibility data, price history, and real alerts.
