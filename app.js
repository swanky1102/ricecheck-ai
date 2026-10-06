const products=[
{id:1,name:"SK hynix 16GB DDR4-3200 SO-DIMM",store:"Wootware",price:699,icon:"🧠",tag:"Best value",spec:"16GB • DDR4 • 3200 MT/s • SO-DIMM"},
{id:2,name:"Crucial 16GB DDR4-3200 SO-DIMM",store:"Takealot",price:749,icon:"💾",tag:"Compatible",spec:"16GB • DDR4 • 3200 MT/s • SO-DIMM"},
{id:3,name:"Kingston 16GB DDR4-3200 SO-DIMM",store:"Evetech",price:799,icon:"🧩",tag:"Popular",spec:"16GB • DDR4 • 3200 MT/s • SO-DIMM"},
{id:4,name:"Samsung 1TB NVMe SSD",store:"Wootware",price:1199,icon:"💿",tag:"Good deal",spec:"1TB • NVMe • M.2"},
{id:5,name:"RTX 4060 8GB Graphics Card",store:"Evetech",price:6499,icon:"🎮",tag:"Good deal",spec:"8GB • GDDR6 • PCIe"},
{id:6,name:"Kingston 1TB NVMe SSD",store:"Takealot",price:1099,icon:"💽",tag:"Lowest price",spec:"1TB • NVMe • M.2"}
];
let saved=JSON.parse(localStorage.getItem("pc_saved")||"[]");
let lastProduct=null;

const results=document.getElementById("results");
function money(n){return "R"+n.toLocaleString("en-ZA")}
function render(list=products){
  results.innerHTML=list.map(p=>`<article class="card">
    <div class="thumb">${p.icon}</div>
    <h3>${p.name}</h3><div class="store">${p.store} • In stock</div>
    <div class="price">${money(p.price)}</div><span class="tag">✓ ${p.tag}</span>
    <div class="store" style="margin-top:10px">${p.spec}</div>
    <div class="card-actions"><button onclick="compat(${p.id})">Check fit</button><button class="buy" onclick="save(${p.id})">Save deal</button></div>
  </article>`).join("");
  document.getElementById("resultCount").textContent=list.length+" results";
}
function search(q){
 q=q.toLowerCase(); document.getElementById("resultTitle").textContent=q?`Results for “${q}”`:"Popular deals";
 let list=products.filter(p=>(p.name+" "+p.spec+" "+p.store).toLowerCase().includes(q));
 if(!list.length) list=products.slice(0,3);
 render(list);
}
document.getElementById("searchBtn").onclick=()=>search(document.getElementById("searchInput").value);
document.getElementById("searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")search(e.target.value)});
document.querySelectorAll(".quick button").forEach(b=>b.onclick=()=>{document.getElementById("searchInput").value=b.dataset.q;search(b.dataset.q)});

function save(id){
 if(!saved.includes(id)) saved.push(id);
 localStorage.setItem("pc_saved",JSON.stringify(saved)); renderSaved();
}
function renderSaved(){
 const el=document.getElementById("savedList");
 if(!saved.length){el.innerHTML='<div class="saved-item">No saved products yet. Save a deal from the results above.</div>';return}
 el.innerHTML=saved.map(id=>{let p=products.find(x=>x.id===id);return `<div class="saved-item"><div><b>${p.name}</b><small>${p.store} • Current price ${money(p.price)}</small></div><button onclick="alert('Price alert created for '+p.name+' at your target price.')">🔔 Set alert</button></div>`}).join("");
}
function compat(id){
 lastProduct=products.find(p=>p.id===id);
 document.getElementById("modalTitle").textContent="Will it work?";
 document.getElementById("modalText").textContent=`${lastProduct.name} matches the MVP compatibility profile for a typical DDR4 laptop: ${lastProduct.spec}. For a real purchase, confirm the exact device model and manufacturer specifications.`;
 document.getElementById("modal").classList.remove("hidden");
}
document.getElementById("closeModal").onclick=()=>document.getElementById("modal").classList.add("hidden");
document.getElementById("modalSave").onclick=()=>{if(lastProduct)save(lastProduct.id);document.getElementById("modal").classList.add("hidden")};

const fileInput=document.getElementById("fileInput");
function startScan(){fileInput.click()}
document.getElementById("scanBtn").onclick=startScan;
document.getElementById("scanNav").onclick=()=>{document.getElementById("scanner").scrollIntoView({behavior:"smooth"});setTimeout(startScan,500)};
fileInput.onchange=()=>{if(!fileInput.files[0])return;document.getElementById("scanStatus").textContent="🔎 AI identifying product…";setTimeout(()=>{document.getElementById("scanStatus").innerHTML='<b>✓ Identified:</b> 16GB DDR4-3200 SO-DIMM. Showing compatible price results below.';search("16GB DDR4 RAM");document.getElementById("search").scrollIntoView({behavior:"smooth"})},1100)};
render();renderSaved();