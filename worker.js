export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =========================
    // TEST KONEKSI DATABASE
    // =========================
    if (url.pathname === "/api/db-test" && request.method === "GET") {
      try {
        const result = await env.DB
          .prepare("SELECT 1 AS ok")
          .first();

        return Response.json({
          ok: true,
          database: "dkd-ppu-data",
          result
        });
      } catch (error) {
        return Response.json(
          {
            ok: false,
            error: error.message
          },
          { status: 500 }
        );
      }
    }

    // =========================
    // SIMPAN DATA PENDATAAN
    // =========================
    if (url.pathname === "/api/pendataan" && request.method === "POST") {
      try {
        const data = await request.json();

        // Validasi data wajib
        if (!data.nama_individu_group) {
          return Response.json(
            {
              ok: false,
              error: "Nama Individu atau Group wajib diisi."
            },
            { status: 400 }
          );
        }

        if (!data.kategori) {
          return Response.json(
            {
              ok: false,
              error: "Kategori Tradisional atau Modern wajib dipilih."
            },
            { status: 400 }
          );
        }

        // Membuat ID Pendataan
        const tahun = new Date().getFullYear();
        const kode = crypto.randomUUID()
          .replace(/-/g, "")
          .substring(0, 8)
          .toUpperCase();

        const idPendataan = `DKD-${tahun}-${kode}`;

        // Simpan ke D1
        await env.DB
          .prepare(`
            INSERT INTO pendataan_pelaku_seni (
              id_pendataan,
              nama_individu_group,
              kategori,
              jenis_pelaku,
              bidang_seni,
              kecamatan,
              desa_kelurahan,
              alamat,
              nomor_whatsapp,
              email,
              deskripsi_singkat,
              foto_profil,
              lampiran_identitas,
              nama_personil,
              status,
              is_published
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            idPendataan,
            data.nama_individu_group,
            data.kategori,
            data.jenis_pelaku || null,
            data.bidang_seni || null,
            data.kecamatan || null,
            data.desa_kelurahan || null,
            data.alamat || null,
            data.nomor_whatsapp || null,
            data.email || null,
            data.deskripsi_singkat || null,
            data.foto_profil || null,
            data.lampiran_identitas || null,
            data.nama_personil || null,
            "MENUNGGU VERIFIKASI",
            0
          )
          .run();

        return Response.json({
          ok: true,
          message: "Data pendataan berhasil diterima.",
          id_pendataan: idPendataan,
          status: "MENUNGGU VERIFIKASI"
        });

      } catch (error) {
        return Response.json(
          {
            ok: false,
            error: error.message
          },
          { status: 500 }
        );
      }
    }
// =========================
// AMBIL DATA PENDATAAN
// =========================
if (url.pathname === "/api/pendataan" && request.method === "GET") {
  try {

    const id = url.searchParams.get("id");

    // =========================
    // DETAIL SATU DATA
    // =========================
    if (id) {

      const result = await env.DB
        .prepare(`
          SELECT
            id,
            id_pendataan,
            nama_individu_group,
            kategori,
            jenis_pelaku,
            bidang_seni,
            kecamatan,
            desa_kelurahan,
            alamat,
            nomor_whatsapp,
            email,
            deskripsi_singkat,
            foto_profil,
            lampiran_identitas,
            nama_personil,
            status,
            catatan_admin,
            is_published,
            created_at,
            updated_at,
            verified_at,
            published_at
          FROM pendataan_pelaku_seni
          WHERE id_pendataan = ?
          LIMIT 1
        `)
        .bind(id)
        .first();

      if (!result) {
        return Response.json(
          {
            ok: false,
            error: "Data pendataan tidak ditemukan."
          },
          { status: 404 }
        );
      }

      return Response.json({
        ok: true,
        data: result
      });
    }

    // =========================
    // SEMUA DATA
    // =========================
const result = await env.DB
  .prepare(`
    SELECT
      id,
      id_pendataan,
      nama_individu_group,
      kategori,
      jenis_pelaku,
      bidang_seni,
      kecamatan,
      desa_kelurahan,
      status,
      is_published,
      created_at
    FROM pendataan_pelaku_seni
    ORDER BY id DESC
  `)
  .all();

return Response.json({
  ok: true,
  data: result.results
});

} catch (error) {

  return Response.json(
    {
      ok: false,
      error: error.message
    },
    { status: 500 }
  );

  }
}
    // =========================
    // WEBSITE STATIS
    // =========================
    return env.ASSETS.fetch(request);
  }
};
