const API_BASE="/api";
const $=s=>document.querySelector(s);
function showPanel(id){document.querySelectorAll(".panel").forEach(x=>x.classList.add("hidden"));$("#"+id).classList.remove("hidden");window.scrollTo({top:$("#"+id).offsetTop-20,behavior:"smooth"});if(id==="directory")loadDirectory();}
function renderCategoryFields(){
  const c=$("#category").value, box=$("#categoryFields"); box.innerHTML="";
  const common={seniman:["Nama Seniman"],sanggar:["Nama Sanggar"],komunitas:["Nama Komunitas"],"pelaku-budaya":["Nama Pelaku Budaya"]};
  if(c==="band"){
    box.innerHTML=`<div class="common-grid">
      <div class="field"><label>Nama Band *</label><input name="nama" required></div>
      <div class="field"><label>Jumlah Personil *</label><input id="jumlahPersonil" name="jumlah_personil" type="number" min="1" max="50" required oninput="renderPersonnel()"></div>
      <div class="field"><label>Genre Musik / Bidang Seni *</label><input name="genre_bidang" required></div>
      <div class="field"><label>Tahun Berdiri</label><input name="tahun_berdiri" type="number" min="1900" max="2100"></div>
      <div id="personnelFields" class="field" style="grid-column:1/-1"></div>
      <div class="field"><label>Logo Band</label><input type="file" name="logo" accept="image/*"></div>
    </div>`; return;
  }
  if(!c)return;
  box.innerHTML=`<div class="field"><label>${common[c][0]} *</label><input name="nama" required></div>
  <div class="field"><label>Bidang Seni/Budaya *</label><input name="genre_bidang" required></div>`;
}
function renderPersonnel(){
  const n=Math.max(0,Math.min(50,Number($("#jumlahPersonil")?.value||0))), box=$("#personnelFields"); if(!box)return;
  box.innerHTML="";
  for(let i=1;i<=n;i++)box.insertAdjacentHTML("beforeend",`<div class="field"><label>Nama Personil ${i} *</label><input name="personil_${i}" required></div>`);
}
async function loadDirectory(){
  const cat=$("#directoryCategory").value, grid=$("#directoryGrid"); grid.innerHTML='<div class="empty">Memuat data…</div>';
  try{
    const r=await fetch(`${API_BASE}/directory${cat?`?category=${encodeURIComponent(cat)}`:""}`); if(!r.ok)throw 0;
    const rows=await r.json(); if(!rows.length){grid.innerHTML='<div class="empty">Belum ada data yang dipublikasikan.</div>';return;}
    grid.innerHTML=rows.map(x=>`<article class="card">${x.photo_url?`<img class="photo" src="${esc(x.photo_url)}" alt="">`:""}<div class="card-body"><h3>${esc(x.nama||"-")}</h3><div class="meta">${esc(x.category_label||x.category||"")}<br>${esc(x.kecamatan||"")} — ${esc(x.desa_kelurahan||"")}<br>${esc(x.genre_bidang||"")}</div></div></article>`).join("");
  }catch(e){grid.innerHTML='<div class="empty">Direktori belum terhubung ke API. Halaman tetap dapat dipakai sebagai tampilan awal.</div>';}
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
$("#registrationForm").addEventListener("submit",async e=>{
  e.preventDefault(); const msg=$("#formMessage"); msg.style.display="block"; msg.textContent="Mengirim data…";
  try{const r=await fetch(`${API_BASE}/submit`,{method:"POST",body:new FormData(e.target)});const d=await r.json();if(!r.ok)throw new Error(d.error||"Gagal mengirim");msg.textContent="Terima kasih. Data berhasil dikirim dan menunggu verifikasi admin.";e.target.reset();$("#categoryFields").innerHTML="";}
  catch(err){msg.textContent="Data belum terkirim. Pastikan API Cloudflare sudah dipasang."; }
});
showPanel("directory"); loadDirectory();
