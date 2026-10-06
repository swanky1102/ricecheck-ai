# PriceCheck AI V3 API contract

## GET /api/search

Query: q=<plain-language shopping request>

Example request: /api/search?q=16GB%20DDR4%20RAM%20under%20R800

Response JSON should contain:
- query
- products[]
- generated_at

Each product should provide a normalized name, retailer, price in ZAR, category, specifications, availability state, and source URL.

The server is responsible for query parsing, retailer feed access, product normalization, deal scoring, and stale-price handling.

Future endpoints: product identification, compatibility checks, price history, and alerts.
