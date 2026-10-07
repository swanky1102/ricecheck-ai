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
  results:[...DEMO_PRODUCTS],
  saved:JSON.parse(localStorage.getItem("pc_saved_v3") || "[]"),
  alerts:JSON.parse(localStorage.getItem("pc_alerts_v3") || "[]")
};
let lastProduct=null;

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

function normalizeProduct(p,index){
  return {
    id:String(p.id ?? "remote-"+index),
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
    source:p.source || "backend"
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

function localSearch(){
  const q=state.query.toLowerCase();
  return DEMO_PRODUCTS.filter(p=>{
    const hay=(p.name+" "+p.spec+" "+p.store+" "+p.category).toLowerCase();
    return (!q || q.split(/\s+/).filter(x=>x.length>2 && !["under","below","less","than"].includes(x)).some(w=>hay.includes(w))) &&
      (state.filter==="all" || p.category===state.filter);
  });
}

function sorted(list){
  const out=[...list];
  if(state.sort==="price-low") out.sort((a,b)=>a.price-b.price);
  else if(state.sort==="price-high") out.sort((a,b)=>b.price-a.price);
  else if(state.sort==="name") out.sort((a,b)=>a.name.localeCompare(b.name));
  else out.sort((a,b)=>dealScore(b)-dealScore(a));
  return out;
}

function render(list=state.results){
  const visible=sorted(list).filter(p=>state.filter==="all" || p.category===state.filter);
  $("results").innerHTML=visible.map(p=>{
    const saved=state.saved.includes(p.id);
    const pct=p.typical>0?Math.max(8,Math.min(100,Math.round((p.typical-p.price)/p.typical*100))):8;
    const stock=p.in_stock===false?"Out of stock":p.stale?"Price may be stale":(apiBase()?"Backend offer":"Demo availability");
    return `<article class="card">
      <div class="thumb">${escapeHtml(p.icon)}</div>
      <span class="score">${dealScore(p)}/100</span>
      <h3>${escapeHtml(p.name)}</h3>
      <div class="store">${escapeHtml(p.store)} • ${escapeHtml(stock)}</div>
      <div class="price">${money(p.price)}</div>
      <span class="tag">✓ ${escapeHtml(p.tag)}</span>
      <div class="store" style="margin-top:10px">${escapeHtml(p.spec)}</div>
      <div class="history">Price position • reference ${money(p.typical)}
        <div class="bar"><i style="width:${pct}%"></i></div>
      </div>
      <div class="card-actions">
        <button onclick="compatById('${escapeHtml(p.id)}')">Check fit</button>
        <button onclick="historyById('${escapeHtml(p.id)}')">History</button>
        <button class="buy ${saved?"saved":""}" onclick="toggleSave('${escapeHtml(p.id)}')">${saved?"✓ Saved":"Save"}</button>
      </div>
      ${p.url?'<a class="offer-link" target="_blank" rel="noopener noreferrer" href="'+escapeHtml(p.url)+'">View offer ↗</a>':""}
    </article>`;
  }).join("");
  $("resultCount").textContent=visible.length+" results";
  $("emptyState").classList.toggle("hidden",visible.length>0);
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
      state.results=localSearch();
      render(state.results);
      $("resultCount").textContent=state.results.length+" demo results • backend unavailable";
    }
  }else{
    state.results=localSearch();
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

async function processScan(file){
  if(!file.type.startsWith("image/")){alert("Please choose an image file.");return}
  $("scanStatus").textContent="🔎 Preparing secure identification…";
  if(apiBase()){
    try{
      const data=await fetch(fnUrl("identify-product"),{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({image_name:file.name})
      }).then(r=>r.json());
      if(data?.product?.name){
        $("scanStatus").textContent="✓ "+data.product.name;
        $("searchInput").value=data.product.name;
        search(data.product.name);
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
render(state.results);
