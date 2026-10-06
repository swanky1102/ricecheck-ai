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
    const body = await req.json();
    if (!body?.image_base64) return json({ error: "image_base64 is required" }, 400);

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return json({
        mode: "demo",
        product: { name: "16GB DDR4-3200 SO-DIMM", category: "ram", confidence: 0.50 },
        message: "Vision backend is not configured yet."
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: body.media_type || "image/jpeg", data: body.image_base64 } },
            { type: "text", text: "Identify this computer product. Return only JSON with name, brand, model, category, key_specs, confidence. Do not invent details." }
          ]
        }]
      })
    });

    if (!response.ok) return json({ error: "Vision provider request failed." }, 502);
    const result = await response.json();
    return json({ mode: "ai", result, generated_at: new Date().toISOString() });
  } catch {
    return json({ error: "Invalid image request." }, 400);
  }
});
