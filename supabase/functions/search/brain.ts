export type BrainIntent = {
  original_query: string;
  normalized_query: string;
  category: string | null;
  price_ceiling: number | null;
  tokens: string[];
};

const STOP = new Set(["under","below","less","than","with","for","the","price","max","maximum","up","to","a","an","and","or","please","find","show","me","compare","best","cheapest"]);

export function understand(query: string): BrainIntent {
  const original_query = String(query || "").trim();
  const normalized_query = original_query.toLowerCase().replace(/[^a-z0-9+.-]+/g, " ").replace(/\s+/g, " ").trim();
  const priceMatch = original_query.match(/(?:under|below|less than|max(?:imum)?(?: price)?|up to)\s*r?\s*([\d\s,.]+)/i);
  const price_ceiling = priceMatch ? Number(priceMatch[1].replace(/[\s,]/g, "")) : null;
  const category = categoryFor(normalized_query);
  const tokens = normalized_query.split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w) && !/^r?\d+[\d,.]*$/.test(w));
  return { original_query, normalized_query, category, price_ceiling: Number.isFinite(price_ceiling) ? price_ceiling : null, tokens };
}

function categoryFor(s: string) {
  if (/\b(ram|ddr3|ddr4|ddr5|sodimm|so-dimm)\b/.test(s)) return "ram";
  if (/\b(ssd|nvme|m\.2|storage|hard drive|hdd)\b/.test(s)) return "ssd";
  if (/\b(gpu|rtx|gtx|radeon|graphics|graphics card)\b/.test(s)) return "gpu";
  if (/\b(cpu|processor|ryzen|core i[3579])\b/.test(s)) return "cpu";
  if (/\b(laptop|notebook)\b/.test(s)) return "laptop";
  if (/\b(phone|smartphone|iphone|galaxy)\b/.test(s)) return "phone";
  if (/\b(tv|television|oled|qled)\b/.test(s)) return "tv";
  if (/\b(headphone|headset|earbuds|speaker)\b/.test(s)) return "audio";
  if (/\b(fridge|refrigerator|freezer|microwave|washing machine|dishwasher)\b/.test(s)) return "appliance";
  if (/\b(shirt|jeans|dress|shoe|sneaker|jacket)\b/.test(s)) return "clothing";
  if (/\b(grocery|groceries|food)\b/.test(s)) return "grocery";
  return null;
}

function norm(s: unknown) {
  return String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function key(o: any) {
  return norm(o.product_key || o.external_id || [o.brand, o.model, o.name].filter(Boolean).join(" "));
}

function similarity(a: any, b: any) {
  const ak = key(a), bk = key(b);
  if (!ak || !bk) return 0;
  if (ak === bk) return 1;
  const at = new Set(ak.split(" ")), bt = new Set(bk.split(" "));
  const inter = [...at].filter(x => bt.has(x)).length;
  return inter / Math.max(1, Math.min(at.size, bt.size));
}

export function think(offers: any[], intent: BrainIntent) {
  const eligible = offers.filter(o => Number.isFinite(Number(o.price)) && Number(o.price) >= 0 &&
    (intent.price_ceiling == null || Number(o.price) <= intent.price_ceiling));
  const groups: any[] = [];
  for (const offer of eligible) {
    let group = groups.find(g => similarity(g.representative, offer) >= 0.75);
    if (!group) { group = { representative: offer, offers: [] }; groups.push(group); }
    group.offers.push(offer);
  }
  const scored = groups.map(group => {
    group.offers.sort((a: any,b: any) => Number(a.price)-Number(b.price));
    const best = group.offers[0];
    const retailerCount = new Set(group.offers.map((o: any)=>o.store)).size;
    const freshness = group.offers.reduce((s: number,o: any)=>s + (o.stale ? 0 : 1), 0) / group.offers.length;
    const stock = best.in_stock === false ? 0 : 1;
    const confidence = Math.min(100, Math.round(50 + Math.min(25, retailerCount*8) + freshness*15 + stock*10));
    return { product: best, offers: group.offers, retailer_count: retailerCount, confidence,
      savings_vs_next: group.offers.length > 1 ? Number(group.offers[1].price)-Number(best.price) : null };
  });
  scored.sort((a,b) => Number(a.product.price)-Number(b.product.price));
  return scored;
}
