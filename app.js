async function backendSearchV4(q){
  const base=window.PRICECHECK_API_URL;
  if(!base)return null;
  try{
    const r=await fetch(base+"?q="+encodeURIComponent(q),{headers:{Accept:"application/json"}});
    if(!r.ok)throw new Error("API "+r.status);
    const d=await r.json();
    return Array.isArray(d.products)?d.products:null;
  }catch(e){return null;}
}
function normalizeRemoteProduct(p,index){
  const price=Number(p.price||0);
  return {
    id:"remote:"+String(p.id||index),
    backendId:p.id,
    name:p.name||"Unknown product",
    store:p.store||"Unknown retailer",
    price,
    typical:Number(p.typical||price),
    icon:p.icon||"🛒",
    tag:p.tag||(p.stale?"Price may be stale":"Backend offer"),
    category:p.category||"other",
    spec:p.spec||"Specifications unavailable",
    compat:p.compat||p.category||"other",
    value:Number(p.value||70),
    url:p.url||"",
    in_stock:p.in_stock,
    stale:!!p.stale
  };
}
const products=[
{id:1,name:"SK hynix 16GB DDR4-3200 SO-DIMM",store:"Wootware",price:699,typical:849,icon:"🧠",tag:"Best value",category:"ram",spec:"16GB • DDR4 • 3200 MT/s • SO-DIMM",compat:"ram",value:92},
{id:2,name:"Crucial 16GB DDR4-3200 SO-DIMM",store:"Takealot",price:749,typical:849,icon:"💾",tag:"Compatible",category:"ram",spec:"16GB • DDR4 • 3200 MT/s • SO-DIMM",compat:"ram",value:87},
{id:3,name:"Kingston 16GB DDR4-3200 SO-DIMM",store:"Evetech",price:799,typical:849,icon:"🧩",tag:"Popular",category:"ram",spec:"16GB • DDR4 • 3200 MT/s • SO-DIMM",compat:"ram",value:81},
{id:4,name:"Samsung 1TB NVMe SSD",store:"Wootware",price:1199,typical:1399,icon:"💿",tag:"Good deal",category:"ssd",spec:"1TB • NVMe • M.2",compat:"ssd",value:88},
{id:5,name:"RTX 4060 8GB Graphics Card",store:"Evetech",price:6499,typical:7299,icon:"🎮",tag:"Good deal",category:"gpu",spec:"8GB • GDDR6 • PCIe",compat:"gpu",value:85},
{id:6,name:"Kingston 1TB NVMe SSD",store:"Takealot",price:1099,typical:1399,icon:"💽",tag:"Lowest price",category:"ssd",spec:"1TB • NVMe • M.2",compat:"ssd",value:94}
];
const state={saved:JSON.parse(localStorage.getItem("pc_saved_v2")||"[]"),query:"",filter:"all",sort:"value"};
let lastProduct=null;
const $=id=>document.getElementById(id);
const money=n=>"R"+n.toLocaleString("en-ZA");
function saveState(){localStorage.setItem("pc_saved_v2",JSON.stringify(state.saved));updateBadge();renderSaved()}
function updateBadge(){$("savedBadge").textContent=state.saved.length}
function dealScore(p){return Math.max(1,Math.min(99,p.value+Math.round((p.typical-p.price)/50)))}
function render(list){
 $("results").innerHTML=list.map(p=>{
   const isSaved=state.saved.includes(p.id);
   const pct=Math.min(100,Math.round((p.typical-p.price)/p.typical*100));
   return `<article class="card">
   <div class="thumb">${p.icon}</div><span class="score">${dealScore(p)}/100</span>
   <h3>${p.name}</h3><div class="store">${p.store} • Demo availability</div>
   <div class="price">${money(p.price)}</div><span class="tag">✓ ${p.tag}</span>
   <div class="store" style="margin-top:10px">${p.spec}</div>
   <div class="history">Demo price position • typical ${money(p.typical)}<div class="bar"><i style="width:${Math.max(8,pct)}%"></i></div></div>
   <div class="card-actions"><button onclick="compat(${p.id})">Check fit</button><button class="buy ${isSaved?"saved":""}" onclick="save(${p.id})">${isSaved?"✓ Saved":"Save deal"}</button></div>
   </article>`
 }).join("");
 $("resultCount").textContent=list.length+" results";
 $("emptyState").classList.toggle("hidden",list.length>0);
}
function filtered(){
 let list=products.filter(p=>{
   const hay=(p.name+" "+p.spec+" "+p.store+" "+p.category).toLowerCase();
   return (!state.query||hay.includes(state.query))&&(state.filter==="all"||p.category===state.filter);
 });
 if(state.sort==="price-low")list.sort((a,b)=>a.price-b.price);
 else if(state.sort==="price-high")list.sort((a,b)=>b.price-a.price);
 else if(state.sort==="name")list.sort((a,b)=>a.name.localeCompare(b.name));
 else list.sort((a,b)=>dealScore(b)-dealScore(a));
 return list;
}
async function search(q){
 state.query=(q||"").trim().toLowerCase();
 $("resultTitle").textContent=state.query?`Results for “${q.trim()}”`:"Popular deals";
 const remote=state.query?await backendSearchV4(state.query):null;
 if(remote){render(remote.map(normalizeRemoteProduct));}else{render(filtered());}
 document.querySelector(".section").scrollIntoView({behavior:"smooth",block:"start"});
}
$("searchBtn").onclick=()=>search($("searchInput").value);
$("searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")search(e.target.value)});
document.querySelectorAll(".quick button").forEach(b=>b.onclick=()=>{$("searchInput").value=b.dataset.q;search(b.dataset.q)});
document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.filter=b.dataset.filter;render(filtered())});
$("sortSelect").onchange=e=>{state.sort=e.target.value;render(filtered())};

function save(id){
 if(!state.saved.includes(id))state.saved.push(id); else state.saved=state.saved.filter(x=>x!==id);
 saveState();render(filtered());
}
function renderSaved(){
 const el=$("savedList");
 if(!state.saved.length){el.innerHTML='<div class="saved-item">No saved products yet. Save a deal from the comparison results.</div>';return}
 el.innerHTML=state.saved.map(id=>{const p=products.find(x=>x.id===id);return `<div class="saved-item"><div><b>${p.name}</b><small>${p.store} • Demo price ${money(p.price)} • Value ${dealScore(p)}/100</small></div><button onclick="setAlert(${p.id})">🔔 Set alert</button></div>`}).join("");
}
function setAlert(id){
 const p=products.find(x=>x.id===id);
 const alerts=JSON.parse(localStorage.getItem("pc_alerts_v2")||"[]");
 if(!alerts.includes(id))alerts.push(id);
 localStorage.setItem("pc_alerts_v2",JSON.stringify(alerts));
 alert("Demo alert saved for "+p.name+". Real notifications require a backend.");
}
function compat(id){
 lastProduct=products.find(p=>p.id===id);
 $("modalTitle").textContent="Compatibility check";
 const text=lastProduct.compat==="ram"
 ? "This product is laptop SO-DIMM DDR4. It may fit a DDR4 laptop, but capacity, slot count and supported speed must be verified against the exact laptop model."
 : lastProduct.compat==="ssd"
 ? "This is an M.2 NVMe SSD. Your device needs an M.2 slot with NVMe/PCIe support; physical size and BIOS support should also be checked."
 : "This PCIe graphics card needs a compatible PCIe x16 slot, enough PSU capacity and sufficient case clearance.";
 $("modalText").textContent=text;
 $("compatBox").className="compat "+(lastProduct.compat==="ram"||lastProduct.compat==="ssd"?"warn":"warn");
 $("compatBox").textContent="⚠ Demo assistant: not a guaranteed fit. Verify the exact device specifications before buying.";
 $("modal").classList.remove("hidden");
}
function closeModal(){$("modal").classList.add("hidden")}
$("closeModal").onclick=closeModal;$("closeModal2").onclick=closeModal;
$("modalSave").onclick=()=>{if(lastProduct)save(lastProduct.id);closeModal()};

const fileInput=$("fileInput"),dropZone=$("dropZone");
function startScan(){fileInput.click()}
$("scanBtn").onclick=startScan;
$("scanNav").onclick=()=>{$("scanner").scrollIntoView({behavior:"smooth"});setTimeout(startScan,450)};
dropZone.onclick=startScan;
["dragenter","dragover"].forEach(e=>dropZone.addEventListener(e,x=>{x.preventDefault();dropZone.classList.add("drag")}));
["dragleave","drop"].forEach(e=>dropZone.addEventListener(e,x=>{x.preventDefault();dropZone.classList.remove("drag")}));
dropZone.addEventListener("drop",e=>{const f=e.dataTransfer.files[0];if(f)processScan(f)});
fileInput.onchange=()=>{if(fileInput.files[0])processScan(fileInput.files[0])};
function processScan(file){
 $("scanStatus").textContent="🔎 Reading image…";
 setTimeout(()=>{
   $("scanStatus").innerHTML='<b>✓ Demo identification:</b> 16GB DDR4-3200 SO-DIMM. V2 can now show matching demo offers. A real AI scan needs a secure vision backend.';
   $("searchInput").value="16GB DDR4 RAM";search("16GB DDR4 RAM");
 },900);
}
updateBadge();render(filtered());renderSaved();
