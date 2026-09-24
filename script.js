const navItems=[["Beranda","#beranda"],["Profil","#profil"],["Program","#program"],["Berita","#berita"],["Galeri","#galeri"],["Agenda","#agenda"],["Kontak","#kontak"]];
const $=s=>document.querySelector(s);
async function get(name){const r=await fetch(`content/${name}.json`,{cache:"no-store"});if(!r.ok)throw new Error(name);return r.json();}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
async function init(){
  const [site,programsRaw,newsRaw,galleryRaw,agendaRaw,contact]=await Promise.all(["site","programs","news","gallery","agenda","contact"].map(get));
const programs=programsRaw.programs||programsRaw;
const news=newsRaw.news||newsRaw;
const gallery=galleryRaw.gallery||galleryRaw;
const agenda=agendaRaw.agenda||agendaRaw;
  document.title=site.shortName+" — "+site.name;
  $("#brand-name").textContent=site.shortName;$("#brand-tagline").textContent=site.tagline;
  $("#hero-eyebrow").textContent=site.heroEyebrow;$("#hero-title").textContent=site.heroTitle;$("#hero-text").textContent=site.heroText;
  const logo=site.logo||"assets/logo-dkd-ppu.png";
document.querySelectorAll(".brand img,.footer-logo").forEach(img=>img.src=logo);
const favicon=document.querySelector('link[rel="icon"]');
if(favicon) favicon.href=logo;
  $("#profile-title").textContent=site.profileTitle;$("#profile-text").textContent=site.profileText;
  $("#stats").innerHTML=(site.stats||[]).map(x=>`<div><strong>${esc(x.number)}</strong><span>${esc(x.label)}</span></div>`).join("");
  $("#nav").innerHTML=navItems.map(x=>`<a href="${x[1]}">${x[0]}</a>`).join("");
  $("#footer-links").innerHTML=navItems.map(x=>`<a href="${x[1]}">${x[0]}</a>`).join("");
  $("#program-list").innerHTML=programs.map((p,i)=>`<article class="program-card reveal-card" style="--delay:${i*90}ms"><div class="card-top"><span class="number">0${i+1}</span><span class="tag">${esc(p.tag)}</span></div><div class="program-icon">${esc(p.icon||"✦")}</div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></article>`).join("");
  function markdownToHtml(text=""){
  let html=esc(text);
  html=html.replace(/^### (.*)$/gm,"<h4>$1</h4>");
  html=html.replace(/^## (.*)$/gm,"<h3>$1</h3>");
  html=html.replace(/^# (.*)$/gm,"<h2>$1</h2>");
  html=html.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>");
  html=html.replace(/\*(.*?)\*/g,"<em>$1</em>");
  html=html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  html=html.replace(/\n\n+/g,"</p><p>");
  html=html.replace(/\n/g,"<br>");
  return "<p>"+html+"</p>";
}

$("#news-list").innerHTML=news.map((n,i)=>`
<article class="news-card news-clickable reveal-card" data-news="${i}" tabindex="0"
    ${n.image
      ? `<img class="news-img" src="${esc(n.image)}" alt="${esc(n.title)}">`
      : `<div class="news-art tone-${i%3}"><span>${["✦","♫","◈"][i%3]}</span></div>`
    }
    <div class="news-body">
      <div class="meta">
        ${new Date(n.date+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase()}
        · ${esc(n.category)}
      </div>
      <h3>${esc(n.title)}</h3>
      <p>${esc(n.excerpt)}</p>
      <span class="news-read">Baca selengkapnya →</span>
    </div>
  </article>
`).join("");
  $("#gallery-list").innerHTML=gallery.map((g,i)=>`<button class="gallery-card reveal-card tone-${esc(g.tone||"green")}" data-i="${i}" style="--delay:${i*90}ms">${g.image?`<img src="${esc(g.image)}" alt="">`:`<span class="gallery-symbol">${["✦","♫","❯","◈"][i%4]}</span>`}<strong>${esc(g.title)}</strong><small>${esc(g.caption)}</small></button>`).join("");
    // ===============================
  // VIDEO KEGIATAN DKD PPU
  // ===============================
  async function loadPublicVideos() {

    const videoList =
      document.getElementById("video-list");

    if (!videoList) return;

    try {

      const response =
        await fetch(
          "https://dkd-ppu-media-api.dewankeseniandaerah-kabppu.workers.dev/api/videos"
        );

      if (!response.ok) {
        throw new Error("Gagal mengambil video.");
      }

      const data =
        await response.json();

      const videos =
        data.videos || [];

      if (!videos.length) {

        videoList.innerHTML =
          '<p class="video-loading">Belum ada video kegiatan.</p>';

        return;
      }

      videoList.innerHTML =
        videos.map(video => `

          <article class="video-card">

            <video
              controls
              preload="metadata"
              playsinline
              src="${esc(video.source_url)}">
            </video>

            <div class="video-card-body">

              <span class="video-category">
                ${esc(video.category || "Dokumentasi")}
              </span>

              <h3>
                ${esc(video.title || "Video Kegiatan DKD PPU")}
              </h3>

              ${
                video.description
                  ? `<p>${esc(video.description)}</p>`
                  : ""
              }

            </div>

          </article>

        `).join("");

    } catch (error) {

      console.error(
        "Video kegiatan:",
        error
      );

      videoList.innerHTML =
        '<p class="video-loading">Video kegiatan belum dapat dimuat.</p>';

    }

  }

  loadPublicVideos();
  $("#agenda-list").innerHTML=agenda.map((a,i)=>{let d=new Date(a.date+"T00:00:00");return `<article class="agenda-item reveal-card" style="--delay:${i*90}ms"><div class="agenda-date"><strong>${String(d.getDate()).padStart(2,"0")}</strong><span>${d.toLocaleDateString("id-ID",{month:"short"}).toUpperCase()}</span></div><div><h3>${esc(a.title)}</h3><p>${esc(a.place)}</p></div></article>`}).join("");
  $("#contact-title").textContent=contact.title;$("#contact-intro").textContent=contact.intro;
  $("#contact-details").innerHTML=[["Alamat",contact.address],["WhatsApp / Telepon",contact.phone],["Email",contact.email],["Jam Layanan",contact.hours]].map(x=>`<div><small>${x[0]}</small><strong>${esc(x[1])}</strong></div>`).join("");
  $("#social-links").innerHTML=[["Instagram",contact.instagram],["Facebook",contact.facebook],["YouTube",contact.youtube]].map(x=>`<a href="${esc(x[1])}" target="_blank" rel="noopener">${x[0]}</a>`).join("");
  document.querySelectorAll(".nav a").forEach(a=>a.onclick=()=>$("#nav").classList.remove("open"));
  document.querySelector(".menu-toggle").onclick=()=>$("#nav").classList.toggle("open");
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");io.unobserve(e.target)}}),{threshold:.12});
  document.querySelectorAll(".reveal,.reveal-card").forEach(x=>io.observe(x));
  const modal=$("#modal");

document.querySelectorAll(".gallery-card").forEach(x=>x.onclick=()=>{
  let g=gallery[+x.dataset.i];
  $("#modal-art").innerHTML=g.image
    ? `<img src="${esc(g.image)}" alt="${esc(g.title)}">`
    : `<span>✦</span>`;
  $("#modal-meta").textContent=g.category||"GALERI";
  $("#modal-title").textContent=g.title;
  $("#modal-excerpt").textContent="";
  $("#modal-content").innerHTML="";
  modal.classList.add("show");
  document.body.style.overflow="hidden";
});

document.querySelectorAll(".news-clickable").forEach(x=>{
  const openNews=()=>{
    const n=news[+x.dataset.news];

    $("#modal-art").innerHTML=n.image
      ? `<img src="${esc(n.image)}" alt="${esc(n.title)}">`
      : `<span>✦</span>`;

    $("#modal-meta").textContent=
      `${new Date(n.date+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})} · ${n.category}`;

    $("#modal-title").textContent=n.title;
    $("#modal-excerpt").textContent=n.excerpt||"";
    $("#modal-content").innerHTML=markdownToHtml(n.body||"");

    modal.classList.add("show");
    document.body.style.overflow="hidden";
  };

  x.onclick=openNews;

  x.onkeydown=e=>{
    if(e.key==="Enter" || e.key===" "){
      e.preventDefault();
      openNews();
    }
  };
});

const closeModal=()=>{
  modal.classList.remove("show");
  document.body.style.overflow="";
};

document.querySelector(".modal-close").onclick=closeModal;
document.querySelector(".modal-backdrop").onclick=closeModal;
}
init().catch(e=>{document.body.insertAdjacentHTML("afterbegin",`<div style="padding:16px;background:#fee;color:#900;text-align:center">Konten belum dapat dimuat. Pastikan website diakses melalui Netlify/GitHub, bukan file lokal.</div>`);console.error(e)});
window.addEventListener("scroll",()=>$("#to-top").classList.toggle("show",scrollY>500));$("#to-top").onclick=()=>scrollTo({top:0,behavior:"smooth"});


// ===============================
// PENDATAAN PELAKU SENI
// ===============================

window.pilihKategori = function(kategori) {
  const formWrap = document.getElementById("form-pendataan");
  const kategoriInput = document.getElementById("kategori");
  const kategoriTerpilih = document.getElementById("kategoriTerpilih");

  kategoriInput.value = kategori;

  kategoriTerpilih.textContent =
    "Kategori yang dipilih: " + kategori;

  formWrap.style.display = "block";

  formWrap.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
};


const formPelakuSeni =
  document.getElementById("formPelakuSeni");

if (formPelakuSeni) {

  formPelakuSeni.addEventListener("submit", async function(e) {

    e.preventDefault();

    const hasil =
      document.getElementById("hasilPendataan");

    const tombol =
      formPelakuSeni.querySelector(".btn-submit");

    tombol.disabled = true;
    tombol.textContent = "MENGIRIM DATA...";

    hasil.innerHTML =
      "<p>Data sedang dikirim, mohon tunggu...</p>";

    const data = {
      nama_individu_group:
        document.getElementById("nama_individu_group").value.trim(),

      kategori:
        document.getElementById("kategori").value,

      jenis_pelaku:
        document.getElementById("jenis_pelaku").value,

      bidang_seni:
        document.getElementById("bidang_seni").value,

      kecamatan:
        document.getElementById("kecamatan").value.trim(),

      desa_kelurahan:
        document.getElementById("desa_kelurahan").value.trim(),

      alamat:
        document.getElementById("alamat").value.trim(),

      nomor_whatsapp:
        document.getElementById("nomor_whatsapp").value.trim(),

      email:
        document.getElementById("email").value.trim(),

      deskripsi_singkat:
        document.getElementById("deskripsi_singkat").value.trim(),

      foto_profil: null,

      lampiran_identitas: null,

      nama_personil: null
    };

    try {

      const response = await fetch(
        "/api/pendataan",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(data)
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "Data gagal dikirim."
        );
      }

      hasil.innerHTML = `
        <div class="pendataan-success">
          <strong>Data berhasil dikirim.</strong>
          <p>
            Nomor Pendataan:
            <strong>${result.id_pendataan}</strong>
          </p>
          <p>
            Status:
            <strong>${result.status}</strong>
          </p>
          <p>
            Data Anda akan melalui proses verifikasi
            oleh Admin DKD PPU.
          </p>
        </div>
      `;

      formPelakuSeni.reset();

      document.getElementById("kategori").value =
        data.kategori;

    } catch (error) {

      hasil.innerHTML = `
        <div class="pendataan-error">
          <strong>Data belum berhasil dikirim.</strong>
          <p>${error.message}</p>
        </div>
      `;

    } finally {

      tombol.disabled = false;
      tombol.textContent = "KIRIM DATA PENDATAAN";

    }

  });

}
