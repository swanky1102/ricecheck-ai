import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

function categoryFor(q: string) {
  const s = q.toLowerCase();
  if (/\b(ram|ddr3|ddr4|ddr5|sodimm|so-dimm)\b/.test(s)) return "ram";
  if (/\b(ssd|nvme|m\.2|storage)\b/.test(s)) return "ssd";
  if (/\b(gpu|rtx|gtx|radeon|graphics|graphics card)\b/.test(s)) return "gpu";
  if (/\b(cpu|processor|ryzen|core i[3579])\b/.test(s)) return "cpu";
  if (/\b(laptop|notebook)\b/.test(s)) return "laptop";
  return null;
}

function iconFor(category: string) {
  return category === "ram" ? "🧠" : category === "ssd" ? "💿" : category === "gpu" ? "🎮" : category === "cpu" ? "⚙️" : "💻";
}

function specText(specs: Record<string, unknown>) {
  return Object.entries(specs || {}).map(([k, v]) => String(k) + ": " + String(v)).join(" • ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  try {
    const query = (new URL(req.url).searchParams.get("q") || "").trim();
    if (!query) return json({ query: "", products: [], generated_at: new Date().toISOString() });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    const publishableKey = publishableKeys ? JSON.parse(publishableKeys).default : Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !publishableKey) return json({ error: "Supabase is not configured." }, 503);

    const supabase = createClient(supabaseUrl, publishableKey);
    const category = categoryFor(query);

    let productQuery = supabase
      .from("products")
      .select("id, canonical_name, brand, model, category, specs, offers(id, price_zar, url, in_stock, last_seen_at, retailer:retailers(name))")
      .limit(50);

    if (category) productQuery = productQuery.eq("category", category);

    const { data, error } = await productQuery;
    if (error) throw error;

    const qWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !/^(under|below|less|than|with|for|the)$/.test(w));
    const products = (data || []).flatMap((p: any) => (p.offers || []).map((offer: any) => {
      const haystack = [p.canonical_name, p.brand, p.model, p.category, specText(p.specs || {})].join(" ").toLowerCase();
      const matched = qWords.length === 0 || qWords.some(w => haystack.includes(w));
      if (!matched) return null;
      const price = Number(offer.price_zar);
      const ageHours = offer.last_seen_at ? (Date.now() - new Date(offer.last_seen_at).getTime()) / 36e5 : 9999;
      const stale = ageHours > 72;
      return {
        id: offer.id,
        product_id: p.id,
        name: p.canonical_name,
        store: offer.retailer?.name || "Unknown retailer",
        price,
        typical: price,
        icon: iconFor(p.category),
        tag: stale ? "Price may be stale" : (offer.in_stock === false ? "Out of stock" : "Verified offer"),
        category: p.category,
        spec: specText(p.specs || {}),
        compat: p.category,
        value: stale ? 50 : (offer.in_stock === false ? 55 : 80),
        url: offer.url,
        in_stock: offer.in_stock,
        last_seen_at: offer.last_seen_at,
        stale
      };
    }).filter(Boolean));

    products.sort((a: any, b: any) => a.price - b.price);
    return json({ query, products, generated_at: new Date().toISOString(), source: "supabase" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Search failed." }, 500);
  }
});
