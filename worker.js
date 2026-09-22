// =========================
// AUTHENTIKASI ADMIN
// =========================

async function createAdminSession(env) {
  const data = {
    exp: Date.now() + (8 * 60 * 60 * 1000)
  };

  const payload = btoa(JSON.stringify(data));

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.ADMIN_PASSWORD),
    { name: "HMAC", hash: "SHA-256" },
    false,
        ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  const signatureBase64 = btoa(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${payload}.${signatureBase64}`;
}

async function verifyAdminSession(request, env) {
  const cookie = request.headers.get("Cookie") || "";

  const match = cookie.match(
    /admin_session=([^;]+)/
  );

  if (!match) {
    return false;
  }

  const token = match[1];
  const parts = token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  try {
    const payload = JSON.parse(
      atob(parts[0])
    );

    if (!payload.exp || Date.now() > payload.exp) {
      return false;
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env.ADMIN_PASSWORD),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signature = Uint8Array.from(
      atob(parts[1]),
      c => c.charCodeAt(0)
    );

    return await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      new TextEncoder().encode(parts[0])
    );

  } catch {
    return false;
  }
}

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
// VERIFIKASI DATA PENDATAAN
// =========================
if (
  url.pathname === "/api/pendataan/verifikasi" &&
  request.method === "POST"
) {
  try {

    // Cek token admin
    const authHeader = request.headers.get("Authorization");

    if (
      !authHeader ||
      authHeader !== `Bearer ${env.ADMIN_API_TOKEN}`
    ) {
      return Response.json(
        {
          ok: false,
          error: "Tidak memiliki akses."
        },
        { status: 401 }
      );
    }

    const data = await request.json();

    if (!data.id_pendataan) {
      return Response.json(
        {
          ok: false,
          error: "Nomor pendataan wajib diisi."
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const result = await env.DB
      .prepare(`
        UPDATE pendataan_pelaku_seni
        SET
          status = 'TERVERIFIKASI',
          verified_at = ?,
          updated_at = ?
        WHERE id_pendataan = ?
      `)
      .bind(
        now,
        now,
        data.id_pendataan
      )
      .run();

    if (result.meta.changes === 0) {
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
      message: "Data berhasil diverifikasi.",
      id_pendataan: data.id_pendataan,
      status: "TERVERIFIKASI"
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
