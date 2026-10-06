import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const url = new URL(req.url);
    const query = (url.searchParams.get("q") || "").trim();

    if (!query) {
      return Response.json({ query: "", products: [], generated_at: new Date().toISOString() }, { headers: cors });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    const publishableKey = keys ? JSON.parse(keys).default : Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !publishableKey) {
      return Response.json({ error: "Supabase is not configured." }, { status: 503, headers: cors });
    }

    const supabase = createClient(supabaseUrl, publishableKey);
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const category = words.includes("ram") || words.includes("ddr4") || words.includes("ddr5")
      ? "ram"
      : words.includes("ssd") || words.includes("nvme")
      ? "ssd"
      : words.includes("gpu") || words.includes("rtx") || words.includes("graphics")
      ? "gpu"
      : null;

    let productQuery = supabase
      .from("products")
      .select("id, canonical_name, brand, model, category, specs, offers(id, price_zar, url, in_stock, retailer:retailers(name))")
      .limit(30);

    if (category) productQuery = productQuery.eq("category", category);

    const { data, error } = await productQuery;
    if (error) throw error;

    const products = (data || []).flatMap((p: any) =>
      (p.offers || []).map((offer: any) => ({
        id: offer.id,
        name: p.canonical_name,
        store: offer.retailer?.name || "Unknown retailer",
        price: Number(offer.price_zar),
        category: p.category,
        spec: Object.entries(p.specs || {}).map(([k, v]) => String(k) + ": " + String(v)).join(" • "),
        url: offer.url,
        in_stock: offer.in_stock
      }))
    );

    products.sort((a, b) => a.price - b.price);

    return Response.json({ query, products, generated_at: new Date().toISOString() }, { headers: cors });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Search failed." },
      { status: 500, headers: cors }
    );
  }
});
