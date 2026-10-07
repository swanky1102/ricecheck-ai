type NormalizedOffer = {
  external_id?: string;
  product_key?: string;
  name: string;
  brand?: string;
  model?: string;
  category?: string;
  spec?: string;
  price: number;
  currency: "ZAR";
  store: string;
  url: string;
  image?: string;
  in_stock?: boolean | null;
  last_seen_at?: string;
  source: string;
};

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normalizeGenericItem(item: any, retailer: string, source: string): NormalizedOffer | null {
  const price = numberValue(item.price ?? item.selling_price ?? item.sale_price ?? item.current_price);
  const url = cleanText(item.url ?? item.link ?? item.product_url);
  const name = cleanText(item.name ?? item.title ?? item.product_name);
  if (price == null || !name || !url) return null;
  const stock = item.in_stock ?? item.available ?? item.stock;
  return {
    external_id: cleanText(item.id ?? item.sku ?? item.product_id ?? item.gtin ?? item.barcode) || undefined,
    product_key: cleanText(item.gtin ?? item.ean ?? item.barcode ?? item.mpn ?? item.model) || undefined,
    name,
    brand: cleanText(item.brand) || undefined,
    model: cleanText(item.model ?? item.mpn) || undefined,
    category: cleanText(item.category) || undefined,
    spec: cleanText(item.spec ?? item.description) || undefined,
    price,
    currency: "ZAR",
    store: retailer,
    url,
    image: cleanText(item.image ?? item.image_url) || undefined,
    in_stock: typeof stock === "boolean" ? stock : null,
    last_seen_at: new Date().toISOString(),
    source
  };
}

async function awinFeed(url: string, retailer: string) {
  const response = await fetch(url, { headers: { Accept: "application/json, text/csv, text/plain" } });
  if (!response.ok) throw new Error(retailer + " Awin feed returned HTTP " + response.status);
  const text = await response.text();
  const lines = text.split(/\\r?\\n/).map((line) => line.trim()).filter(Boolean);
  const offers: NormalizedOffer[] = [];
  for (const line of lines) {
    try {
      const item = JSON.parse(line);
      if (item.error) continue;
      const basic = item.product_basic ?? item.product ?? item;
      const detail = item.product_details ?? {};
      const merged = { ...basic, ...detail };
      const offer = normalizeGenericItem({
        id: merged.id ?? merged.aw_product_id ?? merged.merchant_product_id,
        name: merged.title ?? merged.product_name ?? merged.name,
        price: merged.price ?? merged.search_price ?? merged.sale_price ?? merged.store_price,
        url: merged.aw_deep_link ?? merged.merchant_deep_link ?? merged.link,
        image: merged.merchant_image_url ?? merged.large_image ?? merged.image_url,
        brand: merged.brand_name ?? merged.brand,
        model: merged.product_model ?? merged.model_number ?? merged.mpn,
        category: merged.category_name ?? merged.merchant_category,
        description: merged.description ?? merged.product_short_description,
        in_stock: merged.in_stock ?? merged.stock_status,
        gtin: merged.product_GTIN ?? merged.ean ?? merged.upc,
        mpn: merged.mpn
      }, retailer, "awin");
      if (offer) offers.push(offer);
    } catch (_) {
      // Ignore malformed/non-product lines so one bad record does not kill a feed.
    }
  }
  return offers;
}

async function jsonFeed(url: string, retailer: string) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(retailer + " feed returned HTTP " + response.status);
  const payload = await response.json();
  const items = Array.isArray(payload) ? payload : (payload.products ?? payload.items ?? payload.data ?? []);
  return (Array.isArray(items) ? items : [])
    .map((item) => normalizeGenericItem(item, retailer, "json-feed"))
    .filter(Boolean) as NormalizedOffer[];
}

async function reefTakealot(query: string) {
  const key = Deno.env.get("REEFAPI_KEY");
  if (!key) return [];
  const response = await fetch("https://api.reefapi.com/takealot/v1/search", {
    method: "POST",
    headers: { "x-api-key": key, "content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, in_stock: true })
  });
  if (!response.ok) throw new Error("Takealot connector returned HTTP " + response.status);
  const payload = await response.json();
  const rows = payload?.data?.results ?? payload?.data?.products ?? payload?.results ?? [];
  return (Array.isArray(rows) ? rows : []).map((item: any) => normalizeGenericItem({
    ...item,
    url: item.url ?? (item.plid ? "https://www.takealot.com/search?search=" + encodeURIComponent(item.title ?? query) : "")
  }, "Takealot", "reefapi")).filter(Boolean) as NormalizedOffer[];
}

export async function searchRetailers(query: string) {
  const jobs: Promise<NormalizedOffer[]>[] = [];
  const configuredFeeds = [
    ["Makro", Deno.env.get("MAKRO_FEED_URL")],
    ["Game", Deno.env.get("GAME_FEED_URL")],
    ["Woolworths", Deno.env.get("WOOLWORTHS_FEED_URL")],
    ["Checkers", Deno.env.get("CHECKERS_FEED_URL")],
    ["Shoprite", Deno.env.get("SHOPRITE_FEED_URL")],
    ["Pick n Pay", Deno.env.get("PICKNPAY_FEED_URL")],
    ["Incredible Connection", Deno.env.get("INCREDIBLE_FEED_URL")],
    ["Computer Mania", Deno.env.get("COMPUTERMANIA_FEED_URL")],
    ["HiFi Corp", Deno.env.get("HIFICORP_FEED_URL")],
    ["Loot", Deno.env.get("LOOT_FEED_URL")],
    ["Wootware", Deno.env.get("WOOTWARE_FEED_URL")],
    ["Evetech", Deno.env.get("EVETECH_FEED_URL")]
  ] as const;

  const awinFeeds = [
    ["Awin", Deno.env.get("AWIN_FEED_URL")]
  ] as const;
  for (const [retailer, url] of awinFeeds) {
    if (url) jobs.push(awinFeed(url, retailer).catch(() => []));
  }

  for (const [retailer, url] of configuredFeeds) {
    if (url) jobs.push(jsonFeed(url, retailer).catch(() => []));
  }

  jobs.push(reefTakealot(query).catch(() => []));
  const batches = await Promise.all(jobs);
  return batches.flat();
}
