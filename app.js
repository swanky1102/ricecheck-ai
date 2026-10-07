const DEMO_PRODUCTS = [
  {id:"demo-1",name:"SK hynix 16GB DDR4-3200 SO-DIMM",store:"Wootware",price:699,typical:849,icon:"🧠",tag:"Best value",category:"ram",spec:"16GB • DDR4 • 3200 MT/s • SO-DIMM",compat:"ram",value:92},
  {id:"demo-2",name:"Crucial 16GB DDR4-3200 SO-DIMM",store:"Takealot",price:749,typical:849,icon:"💾",tag:"Compatible",category:"ram",spec:"16GB • DDR4 • 3200 MT/s • SO-DIMM",compat:"ram",value:87},
  {id:"demo-3",name:"Kingston 16GB DDR4-3200 SO-DIMM",store:"Evetech",price:799,typical:849,icon:"🧩",tag:"Popular",category:"ram",spec:"16GB • DDR4 • 3200 MT/s • SO-DIMM",compat:"ram",value:81},
  {id:"demo-4",name:"Samsung 1TB NVMe SSD",store:"Wootware",price:1199,typical:1399,icon:"💿",tag:"Good deal",category:"ssd",spec:"1TB • NVMe • M.2",compat:"ssd",value:88},
  {id:"demo-5",name:"RTX 4060 8GB Graphics Card",store:"Evetech",price:6499,typical:7299,icon:"🎮",tag:"Good deal",category:"gpu",spec:"8GB • GDDR6 • PCIe",compat:"gpu",value:85},
  {id:"demo-6",name:"Kingston 1TB NVMe SSD",store:"Takealot",price:1099,typical:1399,icon:"💽",tag:"Lowest price",category:"ssd",spec:"1TB • NVMe • M.2",compat:"ssd",value:94}
];

const state = {
  query:"",
  filter:"all",
  sort:"value",
  results:[],
  saved:JSON.parse(localStorage.getItem("pc_saved_v3") || "[]"),
  alerts:JSON.parse(localStorage.getItem("pc_alerts_v3") || "[]")
};
let lastProduct=null;
let authUser=null;
const authTokenKey="pricecheck_access_token_v1";
window.PRICECHECK_SUPABASE_ACCESS_TOKEN=localStorage.getItem(authTokenKey)||"";

const $ = id => document.getElementById(id);
const money = n => "R" + Number(n || 0).toLocaleString("en-ZA",{minimumFractionDigits:0,maximumFractionDigits:2});
const apiBase = () => String(window.PRICECHECK_API_URL || "").replace(/\/$/,"");

// PRICECHECK_API_URL points at /search. All sibling Edge Functions are derived from it.
const fnUrl = name => apiBase().replace(/\/search$/,"/"+String(name).replace(/^\//,""));

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function dealScore(p){
  const price=Number(p.price||0), typical=Number(p.typical||price);
  return Math.max(1,Math.min(99,Number(p.value||70)+Math.round(Math.max(0,typical-price)/50)));
}
function saveLocal(){
  localStorage.setItem("pc_saved_v3",JSON.stringify(state.saved));
  localStorage.setItem("pc_alerts_v3",JSON.stringify(state.alerts));
  updateBadge();
  renderSaved();
}
function updateBadge(){$("savedBadge").textContent=String(state.saved.length)}
function supabaseUrl(){return String(window.PRICECHECK_SUPABASE_URL||"").replace(/\/$/,"")}
function supabaseHeaders(){return {"Content-Type":"application/json","apikey":String(window.PRICECHECK_SUPABASE_PUBLISHABLE_KEY||"")}}
async function authRequest(path,body){
  const url=supabaseUrl()+"/auth/v1/"+path;
  const r=await fetch(url,{method:"POST",headers:supabaseHeaders(),body:JSON.stringify(body)});
  const text=await r.text(); let data={}; try{data=text?JSON.parse(text):{}}catch(_){data={error_description:text}};
  if(!r.ok) throw new Error(data.error_description||data.msg||data.message||data.error||"Authentication failed");
  return data;
}
function setAuthSession(data){
  const token=data?.access_token||"";
  authUser=data?.user||null;
  window.PRICECHECK_SUPABASE_ACCESS_TOKEN=token;
  if(token)localStorage.setItem(authTokenKey,token); else localStorage.removeItem(authTokenKey);
  renderAuth();
}
function renderAuth(){
  const signed=Boolean(window.PRICECHECK_SUPABASE_ACCESS_TOKEN);
  $("authTitle").textContent=signed?"Signed in to PriceCheck AI":"Sign in to PriceCheck AI";
  $("authStatus").textContent=signed?"Your account can create server-side price alerts.":"Create an account to sync price alerts securely.";
  $("signInBtn").classList.toggle("hidden",signed);
  $("signUpBtn").classList.toggle("hidden",signed);
  $("signOutBtn").classList.toggle("hidden",!signed);
}
async function signIn(){
  const email=$("authEmail").value.trim(), password=$("authPassword").value;
  if(!email||!password){alert("Enter your email and password.");return}
  try{setAuthSession(await authRequest("token?grant_type=password",{email,password}));alert("Signed in.");}
  catch(e){alert(e.message)}
}
async function signUp(){
  const email=$("authEmail").value.trim(), password=$("authPassword").value;
  if(!email||password.length<6){alert("Enter an email and a password with at least 6 characters.");return}
  try{
    const data=await authRequest("signup",{email,password});
    if(data.access_token)setAuthSession(data);
    alert(data.access_token?"Account created and signed in.":"Account created. Check your email if confirmation is required.");
  }catch(e){alert(e.message)}
}
async function loadServerAlerts(){
  if(!window.PRICECHECK_SUPABASE_ACCESS_TOKEN||!apiBase())return;
  try{
    const r=await fetch(fnUrl("alerts"),{headers:{Accept:"application/json",Authorization:"Bearer "+window.PRICECHECK_SUPABASE_ACCESS_TOKEN}});
    if(r.status===401){setAuthSession({});return}
    const d=await r.json();
    if(Array.isArray(d.alerts)){state.alerts=d.alerts.map(a=>({...a,product_id:String(a.product_id)}));saveLocal()}
  }catch(_){}
}
$("signInBtn").onclick=signIn;
$("signUpBtn").onclick=signUp;
$("signOutBtn").onclick=()=>{setAuthSession({});alert("Signed out.")};
$("accountBtn").onclick=()=>{$("account").scrollIntoView({behavior:"smooth",block:"center"});$("authEmail").focus()};
renderAuth();

function normalizeProduct(p,index){
  return {
    id:String(p.id ?? p.product_id ?? "remote-"+index),
    product_id:String(p.product_id ?? p.productId ?? p.id ?? ""),
    name:p.name || "Unknown product",
    store:p.store || "Unknown retailer",
    price:Number(p.price || 0),
    typical:Number(p.typical || p.price || 0),
    icon:p.icon || "🛒",
    tag:p.tag || (p.stale ? "Price may be stale" : "Verified offer"),
    category:p.category || "other",
    spec:p.spec || "Specifications unavailable",
    compat:p.compat || p.category || "other",
    value:Number(p.value || 70),
    url:p.url || "",
    in_stock:p.in_stock,
    stale:Boolean(p.stale),
    source:p.source || "backend",
    identity:p.identity || "inferred",
    deal_score:Number(p.deal_score ?? p.value ?? 70),
    recommendation:p.recommendation || (p.identity==="verified" ? "Best verified deal" : "Best compared deal"),
    confidence:Number(p.confidence || 0),
    savings_vs_next:Number(p.savings_vs_next || 0),
    offers:Array.isArray(p.offers)?p.offers:[]
  };
}

async function backendGet(path){
  const base=apiBase();
  if(!base) return null;
  const r=await fetch(base+path,{headers:{Accept:"application/json"}});
  if(!r.ok) throw new Error("API "+r.status);
  return r.json();
}

async function backendSearch(q){
  const data=await backendGet("?q="+encodeURIComponent(q));
  return Array.isArray(data?.products) ? data.products.map(normalizeProduct) : [];
}

function priceCeiling(query){
  const m=String(query||"").match(/(?:under|below|less than|max(?:imum)?(?: price)?|up to)\s*r?\s*([\d\s,.]+)/i);
  if(!m)return null;
  const n=Number(m[1].replace(/[\s,]/g,""));
  return Number.isFinite(n)?n:null;
}
function localSearch(){
  const q=state.query.toLowerCase();
  const ceiling=priceCeiling(state.query);
  return DEMO_PRODUCTS.filter(p=>{
    const hay=(p.name+" "+p.spec+" "+p.store+" "+p.category).toLowerCase();
    return (!q || q.split(/\s+/).filter(x=>x.length>2 && !["under","below","less","than"].includes(x)).some(w=>hay.includes(w))) &&
      (state.filter==="all" || p.category===state.filter) &&
      (ceiling===null || Number(p.price)<=ceiling);
  });
}

function applyPriceLimit(list){
  const ceiling=priceCeiling(state.query);
  return ceiling===null?list:list.filter(p=>Number(p.price||0)<=ceiling);
}
function sorted(list){
  const out=[...list];
  if(state.sort==="price-low") out.sort((a,b)=>a.price-b.price);
  else if(state.sort==="price-high") out.sort((a,b)=>b.price-a.price);
  else if(state.sort==="name") out.sort((a,b)=>a.name.localeCompare(b.name));
  else out.sort((a,b)=>(Number(b.deal_score||dealScore(b))-Number(a.deal_score||dealScore(a))) || (a.price-b.price));
  return out;
}

function renderShoppingCard(p){
  const saved=state.saved.includes(p.id);
  const offers=(p.offers||[]).length?[...p.offers].sort((a,b)=>Number(a.price)-Number(b.price)):[p];
  const best=offers[0]||p;
  const bestPrice=Number(best.price||0);
  const next=offers.length>1?Number(offers[1].price):0;
  const saving=next>bestPrice?next-bestPrice:Number(p.savings_vs_next||0);
  const productName=escapeHtml(p.name||'Product');
  const buy=best.url||p.url||'';
  const rows=offers.map((o,n)=>'<div class="offer-row"><div class="offer-store"><span class="rank">'+(n===0?'★':n+1)+'</span><div><b>'+escapeHtml(o.store||'Shop')+'</b><small>'+(o.in_stock===false?'Out of stock':o.stale?'Price may be stale':'Available')+'</small></div></div><strong>'+money(o.price)+'</strong>'+(o.url?'<a class="offer-buy" target="_blank" rel="noopener noreferrer" href="'+escapeHtml(o.url)+'">'+(n===0?'Best price':'View shop')+' ↗</a>':'')+'</div>').join('');
  return '<article class="shop-card"><div class="shop-head"><div class="thumb">'+escapeHtml(p.icon||'🛒')+'</div><div class="shop-title"><div class="eyebrow">'+escapeHtml(p.brand||p.category||'Product')+' • '+(p.identity==='verified'?'✓ Verified match':'AI match')+'</div><h3>'+productName+'</h3><div class="shop-spec">'+escapeHtml(p.spec||'')+'</div></div><span class="score">'+Math.round(Number(p.deal_score||dealScore(p)))+'/100</span></div>'
    +'<div class="best-deal"><div><span class="mini-label">BEST PRICE</span><strong>'+money(bestPrice)+'</strong><small>'+escapeHtml(best.store||p.store||'Shop')+' • '+(best.in_stock===false?'Out of stock':'Available')+'</small></div><div class="best-meta"><b>'+escapeHtml(p.recommendation||'Best price found')+'</b>'+(saving>0?'<span>Save '+money(saving)+' vs next price</span>':'')+'</div>'+(buy?'<a class="buy-now" target="_blank" rel="noopener noreferrer" href="'+escapeHtml(buy)+'">Buy at '+escapeHtml(best.store||'shop')+' ↗</a>':'')+'</div>'
    +'<div class="offer-title"><b>Compare shops</b><span>'+offers.length+' price'+(offers.length===1?'':'s')+'</span></div><div class="offers">'+rows+'</div>'
    +'<div class="shop-actions"><button onclick="compatById(\''+escapeHtml(p.id)+'\')">Check fit</button><button onclick="historyById(\''+escapeHtml(p.id)+'\')">Price history</button><button onclick="toggleSave(\''+escapeHtml(p.id)+'\')">'+(saved?'✓ Saved':'♡ Save')+'</button></div>'
    +'<div class="confidence">'+(p.confidence?'AI match confidence <b>'+Math.round(p.confidence)+'%</b>':'')+(p.savings_vs_next>0?'<span>Next price '+money(bestPrice+Number(p.savings_vs_next))+'</span>':'')+'</div></article>';
}
function render(list=state.results){
  const visible=sorted(applyPriceLimit(list)).filter(p=>state.filter==='all'||p.category===state.filter);
  const hasLive=visible.some(p=>p.source==="retailers" || (p.offers||[]).some(o=>o.source==="retailers" || o.source==="awin"));
  $("liveStatus")?.classList.toggle("hidden", hasLive || visible.length===0);
  $('results').innerHTML=visible.map(renderShoppingCard).join('');
  $('resultCount').textContent=visible.length+' product'+(visible.length===1?'':'s')+' found';
  $('emptyState').classList.toggle('hidden',visible.length>0);
}
function findProduct(id){return state.results.find(p=>p.id===id)||DEMO_PRODUCTS.find(p=>p.id===id)}

function toggleSave(id){
  if(state.saved.includes(id)) state.saved=state.saved.filter(x=>x!==id);
  else state.saved.push(id);
  saveLocal(); render(state.results);
}

function renderSaved(){
  const el=$("savedList");
  if(!state.saved.length){
    el.innerHTML='<div class="saved-item">No saved products yet. Save a deal from the comparison results.</div>';
    return;
  }
  el.innerHTML=state.saved.map(id=>{
    const p=findProduct(id);
    if(!p) return "";
    const hasAlert=state.alerts.some(a=>a.product_id===id||a.id===id);
    return `<div class="saved-item">
      <div><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.store)} • ${money(p.price)} • Value ${dealScore(p)}/100</small></div>
      <button onclick="setAlertById('${escapeHtml(p.id)}')">${hasAlert?"🔔 Alert set":"🔔 Set alert"}</button>
    </div>`;
  }).join("");
}

async function setAlertById(id){
  const p=findProduct(id);
  if(!p) return;
  const raw=prompt("Alert me when this product reaches what price in ZAR?",String(Math.max(1,Math.floor(p.price))));
  if(raw===null)return;
  const target=Number(raw);
  if(!Number.isFinite(target)||target<0){alert("Enter a valid price.");return;}
  const base=apiBase();
  if(base){
    try{
      const token=window.PRICECHECK_SUPABASE_ACCESS_TOKEN || "";
      if(!token) throw new Error("Sign in is required before creating a server alert.");
      const r=await fetch(fnUrl("alerts"),{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
        body:JSON.stringify({product_id:p.product_id||p.id,target_price_zar:target})
      });
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||"Alert failed");
      if(d.alert){state.alerts=[d.alert,...state.alerts.filter(a=>a.id!==d.alert.id)];saveLocal()}
      alert("Price alert created.");
      return;
    }catch(e){alert(e.message+" Local demo alert was saved instead.");}
  }
  state.alerts=state.alerts.filter(a=>a.product_id!==id);
  state.alerts.push({id,product_id:id,target_price_zar:target,created_at:new Date().toISOString(),demo:true});
  saveLocal();
  alert("Demo alert saved. Real notifications require Supabase Auth and a deployed alert worker.");
}

async function historyById(id){
  const p=findProduct(id);
  if(!p)return;
  if(!apiBase()||!p.product_id||p.product_id.startsWith("demo-")){
    alert("Demo history: no live price history is available for this demo offer yet.");
    return;
  }
  try{
    const d=await backendGetSibling("history","?product_id="+encodeURIComponent(p.product_id));
    const rows=(d.offers||[]).flatMap(o=>o.price_history||[]).sort((a,b)=>new Date(a.recorded_at)-new Date(b.recorded_at));
    if(!rows.length){alert("No price history has been recorded for this product yet.");return;}
    alert(rows.slice(-10).map(x=>new Date(x.recorded_at).toLocaleDateString("en-ZA")+" — "+money(x.price_zar)).join("\n"));
  }catch(e){alert("Could not load price history: "+e.message);}
}

async function backendGetSibling(name,path=""){
  const url=fnUrl(name)+path;
  if(!apiBase()) return null;
  const r=await fetch(url,{headers:{Accept:"application/json"}});
  const text=await r.text();
  let data=null;
  try{data=text?JSON.parse(text):null}catch(_){data={error:text||"Invalid API response"}}
  if(!r.ok) throw new Error(data?.error||("API "+r.status));
  return data;
}

async function compatById(id){
  const p=findProduct(id);
  if(!p)return;
  $("modalTitle").textContent="Compatibility check";
  $("modalText").textContent="Checking "+p.name+" against your device requires the exact device model/specification.";
  $("compatBox").className="compat warn";
  $("compatBox").textContent="⚠ Compatibility is advisory, not a guarantee. Verify slots, interface, capacity, power and physical dimensions before buying.";
  $("modalSave").onclick=()=>{toggleSave(p.id);closeModal()};
  $("modal").classList.remove("hidden");
  if(apiBase() && p.product_id && !p.product_id.startsWith("demo-")){
    try{
      const r=await fetch(fnUrl("compatibility"),{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({product:{id:p.product_id,name:p.name,category:p.category,spec:p.spec}})
      });
      const text=await r.text();
      let data=null;
      try{data=text?JSON.parse(text):null}catch(_){data={error:text||"Invalid API response"}}
      if(!r.ok) throw new Error(data?.error||("API "+r.status));
      if(data?.summary) $("modalText").textContent=data.summary;
    }catch(e){
      $("compatBox").className="compat warn";
      $("compatBox").textContent="Compatibility service unavailable: "+e.message;
    }
  }
}

function parseVisionResult(result){const blocks=Array.isArray(result?.content)?result.content:[];const text=blocks.map(x=>x?.text||"").join("\n").trim();if(!text)return null;try{return JSON.parse(text)}catch(_){const m=text.match(/\{[\s\S]*\}/);if(!m)return null;try{return JSON.parse(m[0])}catch(_){return null}}}

function closeModal(){$("modal").classList.add("hidden")}
$("closeModal").onclick=closeModal;
$("closeModal2").onclick=closeModal;

async function search(q){
  state.query=(q||"").trim();
  $("resultTitle").textContent=state.query?`Results for “${state.query}”`:"Popular deals";
  $("scanStatus").textContent="";
  if(state.query && apiBase()){
    $("resultCount").textContent="Searching…";
    try{
      const remote=await backendSearch(state.query);
      state.results=remote;
      render(state.results);
    }catch(e){
      state.results=[];
      render(state.results);
      $("resultCount").textContent="Live search unavailable";
    }
  }else{
    state.results=[];
    render(state.results);
  }
  document.querySelector(".section").scrollIntoView({behavior:"smooth",block:"start"});
}

$("searchBtn").onclick=()=>search($("searchInput").value);
$("searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")search(e.target.value)});
document.querySelectorAll(".quick button").forEach(b=>b.onclick=()=>{$("searchInput").value=b.dataset.q;search(b.dataset.q)});
document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); state.filter=b.dataset.filter; render(state.results);
});
$("sortSelect").onchange=e=>{state.sort=e.target.value;render(state.results)};

const fileInput=$("fileInput"),dropZone=$("dropZone");
function startScan(){fileInput.click()}
$("scanBtn").onclick=startScan;
$("scanNav").onclick=()=>{$("scanner").scrollIntoView({behavior:"smooth"});setTimeout(startScan,450)};
dropZone.onclick=startScan;
["dragenter","dragover"].forEach(ev=>dropZone.addEventListener(ev,e=>{e.preventDefault();dropZone.classList.add("drag")}));
["dragleave","drop"].forEach(ev=>dropZone.addEventListener(ev,e=>{e.preventDefault();dropZone.classList.remove("drag")}));
dropZone.addEventListener("drop",e=>{const file=e.dataTransfer.files[0];if(file)processScan(file)});
fileInput.onchange=()=>{if(fileInput.files[0])processScan(fileInput.files[0])};

function fileToBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const value=String(reader.result||"");resolve(value.includes(",")?value.split(",")[1]:value)};reader.onerror=()=>reject(new Error("Could not read image"));reader.readAsDataURL(file)})}
async function prepareScanImage(file){
  if(file.size<=4*1024*1024)return {base64:await fileToBase64(file),mediaType:file.type||"image/jpeg"};
  const url=URL.createObjectURL(file);
  try{const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error("Could not decode image"));i.src=url});
    const max=1600,scale=Math.min(1,max/Math.max(img.width,img.height));
    const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
    canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
    const blob=await new Promise(r=>canvas.toBlob(r,"image/jpeg",.82));
    return {base64:await fileToBase64(blob),mediaType:"image/jpeg"};
  }finally{URL.revokeObjectURL(url)}
}

async function processScan(file){
  if(!file.type.startsWith("image/")){alert("Please choose an image file.");return}
  $("scanStatus").textContent="🔎 Preparing secure identification…";
  if(apiBase()){
    try{
      const prepared=await prepareScanImage(file);
      const data=await fetch(fnUrl("identify-product"),{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({image_base64:prepared.base64,media_type:prepared.mediaType})
      }).then(r=>r.json());
      const identified=data?.product || parseVisionResult(data?.result);
      if(identified?.name){
        const label=[identified.brand,identified.model,identified.name].filter(Boolean).join(" ").replace(/\s+/g," ").trim();
        $("scanStatus").textContent="✓ Identified: "+label;
        $("searchInput").value=label;
        search(label);
        return;
      }
    }catch(_){}
  }
  $("scanStatus").innerHTML="<b>Demo identification:</b> 16GB DDR4-3200 SO-DIMM. Connect the secure vision backend for real image identification.";
  $("searchInput").value="16GB DDR4 RAM";
  search("16GB DDR4 RAM");
}

updateBadge();
renderSaved();
loadServerAlerts();
render(state.results);
