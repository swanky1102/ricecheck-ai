# PriceCheck AI MVP

A responsive browser MVP for the PriceCheck AI concept.

## Run

No build system is required.

1. Extract the ZIP.
2. Open `index.html` in Chrome/Edge.
3. Try searches such as:
   - `16GB DDR4 RAM`
   - `1TB NVMe SSD`
   - `RTX 4060`
4. Click **Scan Product** to test the scanner flow.
5. Save deals and test the local price-alert UI.

## What's implemented

- Responsive UI
- Product search
- Product comparison cards
- South African Rand pricing
- Compatibility-check interaction
- Product scanner interaction
- Saved products using browser localStorage
- Price-alert interaction
- Mobile layout

## Important

This is an MVP prototype using demo product/price data. It does not yet fetch live retailer prices.

## Production next steps

- Add Supabase/PostgreSQL
- Connect permitted retailer APIs/feeds
- Add real product normalization
- Add image/vision model
- Build device-specific compatibility database
- Add authentication
- Add real price history
- Add notifications
- Add affiliate links where permitted
