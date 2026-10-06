import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const out=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});

Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return out({error:"Method not allowed"},405);
  try {
    const auth=req.headers.get("Authorization")||"";
    if(!auth.startsWith("Bearer ")) return out({error:"Sign-in required"},401);
    const key=Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    const anon=key?JSON.parse(key).default:Deno.env.get("SUPABASE_ANON_KEY");
    const url=Deno.env.get("SUPABASE_URL");
    if(!url||!anon) return out({error:"Supabase is not configured"},503);
    const supabase=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user) return out({error:"Invalid session"},401);
    const body=await req.json();
    const product_id=String(body.product_id||"");
    const target=Number(body.target_price_zar);
    if(!product_id||!Number.isFinite(target)||target<0) return out({error:"product_id and target_price_zar are required"},400);
    const {data,error}=await supabase.from("alerts").insert({user_id:user.id,product_id,target_price_zar:target,active:true}).select("id,product_id,target_price_zar,active,created_at").single();
    if(error) return out({error:error.message},400);
    return out({alert:data});
  } catch { return out({error:"Invalid request"},400); }
});