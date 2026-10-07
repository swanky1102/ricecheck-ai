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
  if (isSameProduct(a,b)) return 1;
  const ak = key(a), bk = key(b);
  if (!ak || !bk) return 0;
  if (ak === bk) return 1;
  const at = new Set(ak.split(" ")), bt = new Set(bk.split(" "));
  const inter = [...at].filter(x => bt.has(x)).length;
  return inter / Math.max(1, Math.min(at.size, bt.size));
}


function dealScore(item: any) {
  const offers = item.offers || [];
  if (!offers.length) return 0;
  const prices = offers.map((o:any)=>Number(o.price)).filter(Number.isFinite);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const priceScore = max > min ? 100 - ((Number(item.product.price)-min)/(max-min))*35 : 85;
  const stockScore = item.product.in_stock === false ? 0 : 20;
  const freshScore = item.product.stale ? 0 : 15;
  const confidenceScore = Number(item.confidence || 0) * 0.15;
  return Math.max(0, Math.min(100, Math.round(priceScore*0.5 + stockScore + freshScore + confidenceScore)));
}

function recommendation(item: any) {
  const best = item.product;
  if (best.in_stock === false) return "Unavailable";
  if (item.identity === "verified" && item.retailer_count >= 2) return "Best verified deal";
  if (item.retailer_count >= 2) return "Best compared deal";
  return "Lowest found";
}

export function think(offers: any[], intent: BrainIntent) {
  const eligible = offers.filter(o => Number.isFinite(Number(o.price)) && Number(o.price) >= 0 &&
    (intent.price_ceiling == null || Number(o.price) <= intent.price_ceiling));
  const groups: any[] = [];
  for (const offer of eligible) {
    let group = groups.find(g => isSameProduct(g.representative, offer));
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
    const identity = identifier(best) ? "verified" : "inferred";
    const item = { product: best, offers: group.offers, retailer_count: retailerCount, confidence, identity,
      savings_vs_next: group.offers.length > 1 ? Number(group.offers[1].price)-Number(best.price) : null };
    item.deal_score = dealScore(item);
    item.recommendation = recommendation(item);
    return item;
  });
  scored.sort((a,b) => b.deal_score - a.deal_score || Number(a.product.price)-Number(b.product.price));
  return scored;
}


function identifier(o: any) {
  const fields = [o.gtin, o.ean, o.upc, o.barcode, o.mpn, o.model, o.sku, o.external_id, o.product_key];
  for (const v of fields) {
    const s = norm(v);
    if (s && s.length >= 4) return s;
  }
  return "";
}

function exactIdentity(a: any, b: any) {
  const ai = identifier(a), bi = identifier(b);
  return !!ai && !!bi && ai === bi;
}

function variantSignature(o: any) {
  const s = norm([o.name, o.model, o.spec].join(" "));
  return s
    .replace(/\b(black|white|blue|red|green|silver|gold|grey|gray|pink|purple)\b/g, " ")
    .replace(/\b(128|256|512|1024|2048|4096)\s?(gb|tb)\b/g, "$1$2")
    .replace(/\b(4|8|16|32|64|128)\s?gb\b/g, "$1gb")
    .replace(/\s+/g, " ")
    .trim();
}

function identityScore(a: any, b: any) {
  if (exactIdentity(a,b)) return 1;
  const am = norm(a.model), bm = norm(b.model);
  if (am && bm && am === bm) return 0.96;
  const ak = variantSignature(a), bk = variantSignature(b);
  if (!ak || !bk) return 0;
  const at = new Set(ak.split(" ")), bt = new Set(bk.split(" "));
  const inter = [...at].filter(x => bt.has(x)).length;
  return inter / Math.max(1, Math.min(at.size, bt.size));
}

function isSameProduct(a: any, b: any) {
  if (exactIdentity(a,b)) return true;
  const am = norm(a.model), bm = norm(b.model);
  if (am && bm && am !== bm) return false;
  const ac = norm(a.category), bc = norm(b.category);
  if (ac && bc && ac !== bc) return false;
  return identityScore(a,b) >= 0.82;
}
