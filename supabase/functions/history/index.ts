import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const productId = new URL(req.url).searchParams.get("product_id");
  if (!productId) return Response.json({ error: "product_id is required" }, { status: 400, headers: cors });

  const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  const key = keys ? JSON.parse(keys).default : Deno.env.get("SUPABASE_ANON_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!url || !key) return Response.json({ error: "Supabase is not configured." }, { status: 503, headers: cors });

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("offers")
    .select("id, price_zar, last_seen_at, price_history(price_zar, recorded_at)")
    .eq("product_id", productId);

  if (error) return Response.json({ error: error.message }, { status: 500, headers: cors });
  return Response.json({ product_id: productId, offers: data || [], generated_at: new Date().toISOString() }, { headers: cors });
});
