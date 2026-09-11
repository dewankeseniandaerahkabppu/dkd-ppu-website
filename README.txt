DKD PPU — VERSI CMS / ADMIN
=============================

VERSI INI MENAMBAHKAN DASHBOARD ADMIN:
    https://DOMAIN-ANDA/admin/

Dari admin, pengelola dapat:
- tambah/edit/hapus berita
- tambah/edit/hapus agenda
- tambah/edit/hapus program
- tambah/edit/hapus galeri
- upload foto galeri/berita
- edit kontak dan media sosial
- edit teks beranda dan profil

TEKNOLOGI
---------
Website statis + Decap CMS + repository GitHub + Netlify.

CATATAN PENTING TENTANG NETLIFY
--------------------------------
Konfigurasi Git Gateway lama dari Netlify saat ini sudah deprecated untuk
konfigurasi baru. Karena itu versi ini menggunakan backend GitHub Decap CMS.
Dokumentasi resmi Decap menjelaskan backend GitHub dan konfigurasi OAuth.

SETUP SATU KALI
---------------
1. Buat repository GitHub bernama:
       dkd-ppu-website

2. Upload seluruh isi folder website ini ke repository tersebut.

3. Buka:
       admin/config.yml

4. Ganti:
       YOUR_GITHUB_USERNAME/dkd-ppu-website
   dengan username GitHub dan nama repository Anda.

5. Di Netlify, deploy site dari repository GitHub tersebut.

6. Di Netlify, konfigurasi OAuth provider GitHub sesuai panduan Decap CMS.
   Callback URL yang digunakan oleh Netlify adalah:
       https://api.netlify.com/auth/done

7. Setelah konfigurasi selesai, buka:
       https://DOMAIN-ANDA/admin/

8. Login dan kelola isi website melalui dashboard.

STRUKTUR KONTEN
---------------
content/site.json       -> Beranda + Profil
content/programs.json   -> Program
content/news.json       -> Berita
content/gallery.json    -> Galeri
content/agenda.json     -> Agenda
content/contact.json    -> Kontak + sosial

MEDIA
-----
Foto yang diupload dari admin disimpan ke:
    assets/uploads/

Jika Anda mengganti foto melalui dashboard, website akan ikut berubah
setelah Netlify menyelesaikan deploy otomatis.

PENTING
-------
Versi ini sudah disiapkan agar pengelolaan konten tidak menyentuh desain.
Jangan menghapus file style.css, script.js, index.html, atau folder admin.

Jika Anda ingin saya bantu tahap berikutnya, Anda hanya perlu memberikan
nama repository GitHub dan URL situs Netlify setelah dibuat; jangan kirim
password atau token.
