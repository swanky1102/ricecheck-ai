import { createClient } from "npm:@supabase/supabase-js@2";
import { searchRetailers } from "./retailers.ts";
import { understand, think } from "./brain.ts";

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
  if (/\b(ssd|nvme|m\.2|storage|hard drive|hdd)\b/.test(s)) return "ssd";
  if (/\b(gpu|rtx|gtx|radeon|graphics|graphics card)\b/.test(s)) return "gpu";
  if (/\b(cpu|processor|ryzen|core i[3579])\b/.test(s)) return "cpu";
  if (/\b(laptop|notebook)\b/.test(s)) return "laptop";
  if (/\b(phone|smartphone|iphone|galaxy)\b/.test(s)) return "phone";
  if (/\b(tv|television|oled|qled)\b/.test(s)) return "tv";
  return null;
}

function iconFor(category: string) {
  return category === "ram" ? "🧠" : category === "ssd" ? "💿" : category === "gpu" ? "🎮" :
    category === "cpu" ? "⚙️" : category === "phone" ? "📱" : category === "tv" ? "📺" : "🛒";
}

function specText(specs: Record<string, unknown>) {
  return Object.entries(specs || {}).map(([k, v]) => String(k) + ": " + String(v)).join(" • ");
}

function normalizeLive(offer: any) {
  const price = Number(offer.price);
  const ageHours = offer.last_seen_at ? (Date.now() - new Date(offer.last_seen_at).getTime()) / 36e5 : 0;
  return {
    id: "live:" + (offer.store || "retailer") + ":" + (offer.external_id || offer.product_key || offer.name),
    product_id: offer.product_key || offer.external_id || offer.name,
    name: offer.name,
    store: offer.store,
    price,
    typical: price,
    icon: iconFor(offer.category || ""),
    tag: offer.in_stock === false ? "Out of stock" : "Live retailer offer",
    category: offer.category || categoryFor(offer.name) || "other",
    spec: offer.spec || [offer.brand, offer.model].filter(Boolean).join(" "),
    compat: offer.category || "other",
    value: offer.in_stock === false ? 55 : 90,
    url: offer.url,
    image: offer.image,
    in_stock: offer.in_stock,
    last_seen_at: offer.last_seen_at,
    stale: ageHours > 72,
    source: offer.source
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  try {
    const query = (new URL(req.url).searchParams.get("q") || "").trim();
    if (!query) return json({ query: "", products: [], generated_at: new Date().toISOString() });

    const liveOffers = await searchRetailers(query);
    const intent = understand(query);
    const qWords = intent.tokens;
    const liveProducts = liveOffers
      .filter((offer: any) => {
        const haystack = [offer.name, offer.brand, offer.model, offer.category, offer.spec].join(" ").toLowerCase();
        return (qWords.length === 0 || qWords.some(w => haystack.includes(w)));
      })
      .map(normalizeLive)
      .filter((p: any) => Number.isFinite(p.price) && p.price >= 0);

    if (liveProducts.length) {
      const decisions = think(liveProducts, intent);
      return json({
        query,
        products: decisions.map((d: any) => ({ ...d.product, offers: d.offers, retailer_count: d.retailer_count, confidence: d.confidence, identity: d.identity, deal_score: d.deal_score, recommendation: d.recommendation, savings_vs_next: d.savings_vs_next })),
        generated_at: new Date().toISOString(),
        source: "retailers",
        brain: { intent, matched_products: decisions.length },
        retailer_count: new Set(liveProducts.map((p: any) => p.store)).size
      });
    }

    // Keep the database as a controlled fallback while connectors are being configured.
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    const publishableKey = publishableKeys ? JSON.parse(publishableKeys).default : Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !publishableKey) return json({ query, products: [], generated_at: new Date().toISOString(), source: "retailers", message: "No live retailer connector returned results." });

    const supabase = createClient(supabaseUrl, publishableKey);
    const category = intent.category;
    let productQuery = supabase.from("products")
      .select("id, canonical_name, brand, model, category, specs, offers(id, price_zar, url, in_stock, last_seen_at, retailer:retailers(name))")
      .limit(50);
    if (category) productQuery = productQuery.eq("category", category);
    const { data, error } = await productQuery;
    if (error) throw error;

    const products = (data || []).flatMap((p: any) => (p.offers || []).map((offer: any) => {
      const haystack = [p.canonical_name, p.brand, p.model, p.category, specText(p.specs || {})].join(" ").toLowerCase();
      if (qWords.length && !qWords.some(w => haystack.includes(w))) return null;
      const price = Number(offer.price_zar);
      if (intent.price_ceiling != null && price > intent.price_ceiling) return null;
      return {
        id: offer.id, product_id: p.id, name: p.canonical_name, store: offer.retailer?.name || "Database",
        price, typical: price, icon: iconFor(p.category), tag: "Demo database offer",
        category: p.category, spec: specText(p.specs || {}), compat: p.category, value: 50,
        url: offer.url, in_stock: offer.in_stock, last_seen_at: offer.last_seen_at, stale: true, source: "database-demo"
      };
    }).filter(Boolean));
    products.sort((a: any, b: any) => a.price - b.price);
    return json({
      query,
      products,
      generated_at: new Date().toISOString(),
      source: "database-fallback",
      message: "No live retailer connector returned results; database fallback shown."
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Search failed." }, 500);
  }
});
