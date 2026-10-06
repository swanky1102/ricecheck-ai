const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const b = await req.json();
    if (!b?.device || !b?.product) return json({ error: "device and product are required" }, 400);
    return json({
      status: "needs_verification",
      confidence: 0.5,
      checks: [
        "Match the exact device model and generation.",
        "Verify physical interface, size and supported standard.",
        "Verify power, firmware/BIOS and capacity limits where applicable."
      ],
      message: "PriceCheck AI cannot guarantee compatibility from incomplete specifications."
    });
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
});
