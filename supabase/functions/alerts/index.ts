import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, DELETE, OPTIONS","Content-Type":"application/json"};
const out=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});

async function clientFor(req:Request){
  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer ")) throw new Error("AUTH_REQUIRED");
  const raw=Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  const key=raw?JSON.parse(raw).default:Deno.env.get("SUPABASE_ANON_KEY");
  const url=Deno.env.get("SUPABASE_URL");
  if(!url||!key) throw new Error("NOT_CONFIGURED");
  const supabase=createClient(url,key,{global:{headers:{Authorization:auth}}});
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user) throw new Error("INVALID_SESSION");
  return {supabase,user};
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  try{
    const {supabase,user}=await clientFor(req);

    if(req.method==="GET"){
      const {data,error}=await supabase.from("alerts")
        .select("id,product_id,target_price_zar,active,created_at")
        .eq("user_id",user.id).order("created_at",{ascending:false});
      if(error)return out({error:error.message},500);
      return out({alerts:data||[]});
    }

    if(req.method==="POST"){
      const body=await req.json();
      const product_id=String(body.product_id||"");
      const target=Number(body.target_price_zar);
      if(!product_id||!Number.isFinite(target)||target<0)return out({error:"product_id and target_price_zar are required"},400);
      const {data,error}=await supabase.from("alerts")
        .insert({user_id:user.id,product_id,target_price_zar:target,active:true})
        .select("id,product_id,target_price_zar,active,created_at").single();
      if(error)return out({error:error.message},400);
      return out({alert:data},201);
    }

    if(req.method==="DELETE"){
      const id=new URL(req.url).searchParams.get("id");
      if(!id)return out({error:"id is required"},400);
      const {error}=await supabase.from("alerts").delete().eq("id",id).eq("user_id",user.id);
      if(error)return out({error:error.message},400);
      return out({deleted:true,id});
    }

    return out({error:"Method not allowed"},405);
  }catch(e){
    const code=e instanceof Error?e.message:"UNKNOWN";
    if(code==="AUTH_REQUIRED"||code==="INVALID_SESSION")return out({error:"Sign-in required"},401);
    if(code==="NOT_CONFIGURED")return out({error:"Supabase is not configured"},503);
    return out({error:"Invalid request"},400);
  }
});