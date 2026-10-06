# PriceCheck AI V4 Edge Functions

The search function is the first working backend path for PriceCheck AI.

It accepts GET requests with a q parameter, reads normalized products and offers from Supabase, applies basic category detection, sorts offers by price, and returns JSON.

Deploy it only after linking this repository to your Supabase project and applying the database schema.

Keep AI and retailer credentials in Supabase Edge Function secrets.