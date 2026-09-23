// ============================================================
// DKD PPU - WORKER.JS
// Sistem Pendataan Pelaku Seni dan Budaya
// ============================================================


// ============================================================
// AUTENTIKASI ADMIN
// ============================================================

async function createAdminSession(env) {

  const data = {
    exp: Date.now() + (8 * 60 * 60 * 1000)
  };

  const payload =
    btoa(JSON.stringify(data));

  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(
        env.ADMIN_PASSWORD
      ),
      {
        name: "HMAC",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(
        payload
      )
    );

  const signatureBase64 =
    btoa(
      String.fromCharCode(
        ...new Uint8Array(signature)
      )
    );

  return `${payload}.${signatureBase64}`;
}


async function verifyAdminSession(
  request,
  env
) {

  const cookie =
    request.headers.get("Cookie") || "";

  const match =
    cookie.match(
      /admin_session=([^;]+)/
    );

  if (!match) {
    return false;
  }

  const parts =
    match[1].split(".");

  if (parts.length !== 2) {
    return false;
  }

  try {

    const payload =
      JSON.parse(
        atob(parts[0])
      );

    if (
      !payload.exp ||
      Date.now() > payload.exp
    ) {
      return false;
    }

    const key =
      await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(
          env.ADMIN_PASSWORD
        ),
        {
          name: "HMAC",
          hash: "SHA-256"
        },
        false,
        ["verify"]
      );

    const signature =
      Uint8Array.from(
        atob(parts[1]),
        c => c.charCodeAt(0)
      );

    return await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      new TextEncoder().encode(
        parts[0]
      )
    );

  } catch {

    return false;

  }
}


// ============================================================
// RESPONSE ADMIN
// ============================================================

function unauthorizedResponse() {

  return Response.json(
    {
      ok: false,
      error:
        "Tidak memiliki akses."
    },
    {
      status: 401
    }
  );

}


// ============================================================
// PENGATURAN WHATSAPP ADMIN
// ============================================================

async function ensureAdminSettingsTable(
  env
) {

  await env.DB
    .prepare(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INTEGER PRIMARY KEY,
        whatsapp_admin TEXT,
        updated_at TEXT
      )
    `)
    .run();


  const existing =
    await env.DB
      .prepare(`
        SELECT id
        FROM admin_settings
        WHERE id = 1
        LIMIT 1
      `)
      .first();


  if (!existing) {

    await env.DB
      .prepare(`
        INSERT INTO admin_settings (
          id,
          whatsapp_admin,
          updated_at
        )
        VALUES (
          1,
          NULL,
          ?
        )
      `)
      .bind(
        new Date().toISOString()
      )
      .run();

  }

}


// ============================================================
// NORMALISASI WHATSAPP
// ============================================================

function normalizeWhatsApp(
  number
) {

  if (!number) {
    return null;
  }

  let value =
    String(number)
      .trim()
      .replace(/\D/g, "");


  if (
    value.startsWith("0")
  ) {

    value =
      "62" +
      value.substring(1);

  }


  if (
    !value.startsWith("62")
  ) {

    return null;

  }


  if (
    value.length < 10 ||
    value.length > 15
  ) {

    return null;

  }


  return value;

}


// ============================================================
// LINK WHATSAPP
// ============================================================

function createWhatsAppLink(
  number,
  message
) {

  const normalized =
    normalizeWhatsApp(number);

  if (!normalized) {
    return null;
  }

  return (
    "https://wa.me/" +
    normalized +
    "?text=" +
    encodeURIComponent(message)
  );

}


// ============================================================
// UPDATE STATUS SEDERHANA
// ============================================================

async function updateSimpleStatus(
  env,
  id,
  fromStatus,
  toStatus,
  isPublished
) {

  const now =
    new Date().toISOString();


  return await env.DB
    .prepare(`
      UPDATE pendataan_pelaku_seni

      SET
        status = ?,
        is_published = ?,
        updated_at = ?

      WHERE
        id_pendataan = ?
        AND status = ?
    `)
    .bind(
      toStatus,
      isPublished,
      now,
      id,
      fromStatus
    )
    .run();

}


// ============================================================
// CEK ADMIN
// ============================================================

async function getAdmin(
  request,
  env
) {

  return await verifyAdminSession(
    request,
    env
  );

}


// ============================================================
// WORKER
// ============================================================

export default {

  async fetch(
    request,
    env
  ) {

    const url =
      new URL(request.url);


    // ========================================================
    // LOGIN ADMIN
    // ========================================================

    if (
      url.pathname ===
        "/api/admin/login" &&
      request.method === "POST"
    ) {

      try {

        const data =
          await request.json();


        if (!data.password) {

          return Response.json(
            {
              ok: false,
              error:
                "Password wajib diisi."
            },
            {
              status: 400
            }
          );

        }


        if (
          data.password !==
          env.ADMIN_PASSWORD
        ) {

          return Response.json(
            {
              ok: false,
              error:
                "Password admin salah."
            },
            {
              status: 401
            }
          );

        }


        const session =
          await createAdminSession(
            env
          );


        return new Response(
          JSON.stringify({
            ok: true,
            message:
              "Login berhasil."
          }),
          {
            status: 200,

            headers: {

              "Content-Type":
                "application/json",

              "Set-Cookie":
                `admin_session=${session}; ` +
                "HttpOnly; " +
                "Secure; " +
                "SameSite=Strict; " +
                "Path=/; " +
                "Max-Age=28800"

            }

          }
        );


      } catch {

        return Response.json(
          {
            ok: false,
            error:
              "Permintaan login tidak valid."
          },
          {
            status: 400
          }
        );

      }

    }


    // ========================================================
    // TEST DATABASE
    // ADMIN ONLY
    // ========================================================

    if (
      url.pathname ===
        "/api/db-test" &&
      request.method === "GET"
    ) {

      if (
        !(await getAdmin(
          request,
          env
        ))
      ) {

        return unauthorizedResponse();

      }


      try {

        const result =
          await env.DB
            .prepare(
              "SELECT 1 AS ok"
            )
            .first();


        return Response.json({

          ok: true,

          database:
            "dkd-ppu-data",

          result

        });


      } catch (error) {

        return Response.json(
          {
            ok: false,
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ========================================================
    // GET WHATSAPP ADMIN
    // ========================================================

    if (
      url.pathname ===
        "/api/admin/whatsapp" &&
      request.method === "GET"
    ) {

      if (
        !(await getAdmin(
          request,
          env
        ))
      ) {

        return unauthorizedResponse();

      }


      try {

        await ensureAdminSettingsTable(
          env
        );


        const result =
          await env.DB
            .prepare(`
              SELECT
                whatsapp_admin,
                updated_at

              FROM admin_settings

              WHERE id = 1

              LIMIT 1
            `)
            .first();


        return Response.json({

          ok: true,

          whatsapp_admin:
            result?.whatsapp_admin ||
            "",

          updated_at:
            result?.updated_at ||
            null

        });


      } catch (error) {

        return Response.json(
          {
            ok: false,
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ========================================================
    // SIMPAN WHATSAPP ADMIN
    // ========================================================

    if (
      url.pathname ===
        "/api/admin/whatsapp" &&
      request.method === "POST"
    ) {

      if (
        !(await getAdmin(
          request,
          env
        ))
      ) {

        return unauthorizedResponse();

      }


      try {

        const data =
          await request.json();


        const whatsapp =
          normalizeWhatsApp(
            data.whatsapp_admin
          );


        if (!whatsapp) {

          return Response.json(
            {
              ok: false,
              error:
                "Nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxxx atau 62xxxxxxxxxx."
            },
            {
              status: 400
            }
          );

        }


        await ensureAdminSettingsTable(
          env
        );


        const now =
          new Date().toISOString();


        await env.DB
          .prepare(`
            UPDATE admin_settings

            SET
              whatsapp_admin = ?,
              updated_at = ?

            WHERE id = 1
          `)
          .bind(
            whatsapp,
            now
          )
          .run();


        return Response.json({

          ok: true,

          message:
            "Nomor WhatsApp Admin berhasil disimpan.",

          whatsapp_admin:
            whatsapp,

          updated_at:
            now

        });


      } catch (error) {

        return Response.json(
          {
            ok: false,
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ========================================================
    // SIMPAN DATA PENDATAAN
    // PUBLIC
    // ========================================================

    if (
      url.pathname ===
        "/api/pendataan" &&
      request.method === "POST"
    ) {

      try {

        const data =
          await request.json();


        if (
          !data.nama_individu_group
        ) {

          return Response.json(
            {
              ok: false,
              error:
                "Nama Individu atau Group wajib diisi."
            },
            {
              status: 400
            }
          );

        }


        if (!data.kategori) {

          return Response.json(
            {
              ok: false,
              error:
                "Kategori Tradisional atau Modern wajib dipilih."
            },
            {
              status: 400
            }
          );

        }


        const tahun =
          new Date().getFullYear();


        const kode =
          crypto
            .randomUUID()
            .replace(
              /-/g,
              ""
            )
            .substring(
              0,
              8
            )
            .toUpperCase();


        const idPendataan =
          `DKD-${tahun}-${kode}`;


        // ====================================================
        // SIMPAN KE D1
        // ====================================================

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

            VALUES (
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?
            )
          `)
          .bind(

            idPendataan,

            data.nama_individu_group,

            data.kategori,

            data.jenis_pelaku ||
              null,

            data.bidang_seni ||
              null,

            data.kecamatan ||
              null,

            data.desa_kelurahan ||
              null,

            data.alamat ||
              null,

            data.nomor_whatsapp ||
              null,

            data.email ||
              null,

            data.deskripsi_singkat ||
              null,

            data.foto_profil ||
              null,

            data.lampiran_identitas ||
              null,

            data.nama_personil ||
              null,

            "MENUNGGU VERIFIKASI",

            0

          )
          .run();


        // ====================================================
        // NOMOR WHATSAPP ADMIN
        // ====================================================

        let whatsappAdmin =
          null;


        try {

          await ensureAdminSettingsTable(
            env
          );


          const setting =
            await env.DB
              .prepare(`
                SELECT
                  whatsapp_admin

                FROM admin_settings

                WHERE id = 1

                LIMIT 1
              `)
              .first();


          whatsappAdmin =
            setting?.whatsapp_admin ||
            null;


        } catch {

          whatsappAdmin =
            null;

        }


        // ====================================================
        // PESAN WHATSAPP
        // ====================================================

        const pesan =
`Halo Admin DKD PPU,

Ada pendataan pelaku seni dan budaya baru.

Nomor Pendataan:
${idPendataan}

Nama Individu / Group:
${data.nama_individu_group}

Kategori:
${data.kategori}

Jenis Pelaku:
${data.jenis_pelaku || "-"}

Bidang Seni:
${data.bidang_seni || "-"}

Kecamatan:
${data.kecamatan || "-"}

Desa/Kelurahan:
${data.desa_kelurahan || "-"}

Status:
MENUNGGU VERIFIKASI

Mohon dilakukan pemeriksaan dan verifikasi melalui Admin DKD PPU.`;


        const whatsappLink =
          createWhatsAppLink(
            whatsappAdmin,
            pesan
          );


        return Response.json({

          ok: true,

          message:
            "Data pendataan berhasil diterima.",

          id_pendataan:
            idPendataan,

          status:
            "MENUNGGU VERIFIKASI",

          whatsapp_admin_tersedia:
            !!whatsappAdmin,

          whatsapp_link:
            whatsappLink

        });


      } catch (error) {

        return Response.json(
          {
            ok: false,
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ========================================================
    // AMBIL DATA PENDATAAN
    // ADMIN ONLY
    // ========================================================

    if (
      url.pathname ===
        "/api/pendataan" &&
      request.method === "GET"
    ) {

      if (
        !(await getAdmin(
          request,
          env
        ))
      ) {

        return unauthorizedResponse();

      }


      try {

        const id =
          url.searchParams.get(
            "id"
          );


        // ====================================================
        // DETAIL
        // ====================================================

        if (id) {

          const result =
            await env.DB
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

                WHERE
                  id_pendataan = ?

                LIMIT 1
              `)
              .bind(id)
              .first();


          if (!result) {

            return Response.json(
              {
                ok: false,
                error:
                  "Data pendataan tidak ditemukan."
              },
              {
                status: 404
              }
            );

          }


          return Response.json({

            ok: true,

            data:
              result

          });

        }


        // ====================================================
        // SEMUA DATA
        // ====================================================

        const result =
          await env.DB
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

              ORDER BY
                id DESC
            `)
            .all();


        return Response.json({

          ok: true,

          data:
            result.results ||
            []

        });


      } catch (error) {

        return Response.json(
          {
            ok: false,
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ========================================================
    // VERIFIKASI
    // ========================================================

    if (
      url.pathname ===
        "/api/pendataan/verifikasi" &&
      request.method === "POST"
    ) {

      if (
        !(await getAdmin(
          request,
          env
        ))
      ) {

        return unauthorizedResponse();

      }


      try {

        const data =
          await request.json();


        if (!data.id_pendataan) {

          return Response.json(
            {
              ok: false,
              error:
                "Nomor pendataan wajib diisi."
            },
            {
              status: 400
            }
          );

        }


        const now =
          new Date().toISOString();


        // ====================================================
        // QUERY VERIFIKASI EKSPLISIT
        // Tidak menggunakan extraSet
        // ====================================================

        const result =
          await env.DB
            .prepare(`
              UPDATE pendataan_pelaku_seni

              SET
                status = 'TERVERIFIKASI',
                is_published = 0,
                updated_at = ?,
                verified_at = ?

              WHERE
                id_pendataan = ?
                AND status =
                  'MENUNGGU VERIFIKASI'
            `)
            .bind(
              now,
              now,
              data.id_pendataan
            )
            .run();


        if (
          result.meta.changes === 0
        ) {

          return Response.json(
            {
              ok: false,
              error:
                "Data tidak ditemukan atau belum berstatus MENUNGGU VERIFIKASI."
            },
            {
              status: 400
            }
          );

        }


        return Response.json({

          ok: true,

          message:
            "Data berhasil diverifikasi.",

          id_pendataan:
            data.id_pendataan,

          status:
            "TERVERIFIKASI"

        });


      } catch (error) {

        return Response.json(
          {
            ok: false,
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ========================================================
    // TOLAK
    // ========================================================

    if (
      url.pathname ===
        "/api/pendataan/tolak" &&
      request.method === "POST"
    ) {

      if (
        !(await getAdmin(
          request,
          env
        ))
      ) {

        return unauthorizedResponse();

      }


      try {

        const data =
          await request.json();


        if (!data.id_pendataan) {

          return Response.json(
            {
              ok: false,
              error:
                "Nomor pendataan wajib diisi."
            },
            {
              status: 400
            }
          );

        }


        const result =
          await updateSimpleStatus(
            env,
            data.id_pendataan,
            "MENUNGGU VERIFIKASI",
            "DITOLAK",
            0
          );


        if (
          result.meta.changes === 0
        ) {

          return Response.json(
            {
              ok: false,
              error:
                "Data tidak ditemukan atau statusnya bukan MENUNGGU VERIFIKASI."
            },
            {
              status: 400
            }
          );

        }


        return Response.json({

          ok: true,

          message:
            "Data berhasil ditolak.",

          id_pendataan:
            data.id_pendataan,

          status:
            "DITOLAK"

        });


      } catch (error) {

        return Response.json(
          {
            ok: false,
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ========================================================
    // PUBLIKASIKAN
    // ========================================================

    if (
      url.pathname ===
        "/api/pendataan/publikasikan" &&
      request.method === "POST"
    ) {

      if (
        !(await getAdmin(
          request,
          env
        ))
      ) {

        return unauthorizedResponse();

      }


      try {

        const data =
          await request.json();


        if (!data.id_pendataan) {

          return Response.json(
            {
              ok: false,
              error:
                "Nomor pendataan wajib diisi."
            },
            {
              status: 400
            }
          );

        }


        const now =
          new Date().toISOString();


        const result =
          await env.DB
            .prepare(`
              UPDATE pendataan_pelaku_seni

              SET
                status =
                  'DIPUBLIKASIKAN',

                is_published =
                  1,

                published_at = ?,

                updated_at = ?

              WHERE
                id_pendataan = ?

                AND status =
                  'TERVERIFIKASI'
            `)
            .bind(
              now,
              now,
              data.id_pendataan
            )
            .run();


        if (
          result.meta.changes === 0
        ) {

          return Response.json(
            {
              ok: false,
              error:
                "Data tidak ditemukan atau belum berstatus TERVERIFIKASI."
            },
            {
              status: 400
            }
          );

        }


        return Response.json({

          ok: true,

          message:
            "Data berhasil dipublikasikan.",

          id_pendataan:
            data.id_pendataan,

          status:
            "DIPUBLIKASIKAN"

        });


      } catch (error) {

        return Response.json(
          {
            ok: false,
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ========================================================
    // BATALKAN VERIFIKASI
    // ========================================================

    if (
      url.pathname ===
        "/api/pendataan/batal-verifikasi" &&
      request.method === "POST"
    ) {

      if (
        !(await getAdmin(
          request,
          env
        ))
      ) {

        return unauthorizedResponse();

      }


      try {

        const data =
          await request.json();


        if (!data.id_pendataan) {

          return Response.json(
            {
              ok: false,
              error:
                "Nomor pendataan wajib diisi."
            },
            {
              status: 400
            }
          );

        }


        const result =
          await updateSimpleStatus(
            env,
            data.id_pendataan,
            "TERVERIFIKASI",
            "MENUNGGU VERIFIKASI",
            0
          );


        if (
          result.meta.changes === 0
        ) {

          return Response.json(
            {
              ok: false,
              error:
                "Data tidak ditemukan atau statusnya bukan TERVERIFIKASI."
            },
            {
              status: 400
            }
          );

        }


        return Response.json({

          ok: true,

          message:
            "Verifikasi berhasil dibatalkan.",

          id_pendataan:
            data.id_pendataan,

          status:
            "MENUNGGU VERIFIKASI"

        });


      } catch (error) {

        return Response.json(
          {
            ok: false,
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ========================================================
    // TARIK DARI PUBLIKASI
    // ========================================================

    if (
      url.pathname ===
        "/api/pendataan/tarik-publikasi" &&
      request.method === "POST"
    ) {

      if (
        !(await getAdmin(
          request,
          env
        ))
      ) {

        return unauthorizedResponse();

      }


      try {

        const data =
          await request.json();


        if (!data.id_pendataan) {

          return Response.json(
            {
              ok: false,
              error:
                "Nomor pendataan wajib diisi."
            },
            {
              status: 400
            }
          );

        }


        const result =
          await updateSimpleStatus(
            env,
            data.id_pendataan,
            "DIPUBLIKASIKAN",
            "TERVERIFIKASI",
            0
          );


        if (
          result.meta.changes === 0
        ) {

          return Response.json(
            {
              ok: false,
              error:
                "Data tidak ditemukan atau belum berstatus DIPUBLIKASIKAN."
            },
            {
              status: 400
            }
          );

        }


        return Response.json({

          ok: true,

          message:
            "Data berhasil ditarik dari publikasi.",

          id_pendataan:
            data.id_pendataan,

          status:
            "TERVERIFIKASI"

        });


      } catch (error) {

        return Response.json(
          {
            ok: false,
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ========================================================
    // VERIFIKASI ULANG
    // ========================================================

    if (
      url.pathname ===
        "/api/pendataan/verifikasi-ulang" &&
      request.method === "POST"
    ) {

      if (
        !(await getAdmin(
          request,
          env
        ))
      ) {

        return unauthorizedResponse();

      }


      try {

        const data =
          await request.json();


        if (!data.id_pendataan) {

          return Response.json(
            {
              ok: false,
              error:
                "Nomor pendataan wajib diisi."
            },
            {
              status: 400
            }
          );

        }


        const result =
          await updateSimpleStatus(
            env,
            data.id_pendataan,
            "DITOLAK",
            "MENUNGGU VERIFIKASI",
            0
          );


        if (
          result.meta.changes === 0
        ) {

          return Response.json(
            {
              ok: false,
              error:
                "Data tidak ditemukan atau statusnya bukan DITOLAK."
            },
            {
              status: 400
            }
          );

        }


        return Response.json({

          ok: true,

          message:
            "Data berhasil dikembalikan ke tahap verifikasi.",

          id_pendataan:
            data.id_pendataan,

          status:
            "MENUNGGU VERIFIKASI"

        });


      } catch (error) {

        return Response.json(
          {
            ok: false,
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ========================================================
    // API PUBLIK
    // HANYA DATA YANG SUDAH DIPUBLIKASIKAN
    // ========================================================

    if (
      url.pathname ===
        "/api/public/pendataan" &&
      request.method === "GET"
    ) {

      try {

        const id =
          url.searchParams.get(
            "id"
          );


        // ====================================================
        // DETAIL PUBLIK
        // ====================================================

        if (id) {

          const result =
            await env.DB
              .prepare(`
                SELECT

                  id_pendataan,
                  nama_individu_group,
                  kategori,
                  jenis_pelaku,
                  bidang_seni,
                  kecamatan,
                  desa_kelurahan,
                  deskripsi_singkat,
                  nama_personil

                FROM pendataan_pelaku_seni

                WHERE
                  id_pendataan = ?

                  AND status =
                    'DIPUBLIKASIKAN'

                  AND is_published = 1

                LIMIT 1
              `)
              .bind(id)
              .first();


          if (!result) {

            return Response.json(
              {
                ok: false,
                error:
                  "Data publik tidak ditemukan."
              },
              {
                status: 404
              }
            );

          }


          return Response.json({

            ok: true,

            data:
              result

          });

        }


        // ====================================================
        // SEMUA DATA PUBLIK
        // ====================================================

        const result =
          await env.DB
            .prepare(`
              SELECT

                id_pendataan,
                nama_individu_group,
                kategori,
                jenis_pelaku,
                bidang_seni,
                kecamatan,
                desa_kelurahan,
                deskripsi_singkat,
                nama_personil

              FROM pendataan_pelaku_seni

              WHERE
                status =
                  'DIPUBLIKASIKAN'

                AND is_published = 1

              ORDER BY
                nama_individu_group ASC
            `)
            .all();


        return Response.json({

          ok: true,

          data:
            result.results ||
            []

        });


      } catch (error) {

        return Response.json(
          {
            ok: false,
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ========================================================
    // WEBSITE STATIS
    // ========================================================

    return env.ASSETS.fetch(
      request
    );

  }

};
