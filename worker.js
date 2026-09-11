export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/directory" && request.method === "GET") {
      const category = url.searchParams.get("category");
      let q = "SELECT id, category, nama, data_json, photo_url FROM submissions WHERE status='published'";
      const args = [];
      if (category) { q += " AND category=?"; args.push(category); }
      q += " ORDER BY id DESC LIMIT 500";
      const stmt = env.DB.prepare(q);
      const result = args.length ? await stmt.bind(...args).all() : await stmt.all();
      const rows = (result.results || []).map(r => {
        let d={}; try { d=JSON.parse(r.data_json||"{}"); } catch {}
        return {...r, ...d, category_label: ({seniman:"Seniman",sanggar:"Sanggar",komunitas:"Komunitas",band:"Band","pelaku-budaya":"Pelaku Budaya"})[r.category]||r.category};
      });
      return Response.json(rows, {headers:{"Cache-Control":"no-store"}});
    }
    if (url.pathname === "/api/submit" && request.method === "POST") {
      const form = await request.formData();
      const category = String(form.get("category")||"").trim();
      const nama = String(form.get("nama")||"").trim();
      if(!category || !nama) return Response.json({error:"Kategori dan nama wajib diisi."},{status:400});
      const data = {};
      for (const [k,v] of form.entries()) if (typeof v === "string" && k !== "category" && k !== "nama") data[k]=v;
      await env.DB.prepare("INSERT INTO submissions(category,nama,data_json,status) VALUES(?,?,?,'pending')").bind(category,nama,JSON.stringify(data)).run();
      return Response.json({ok:true},{status:201});
    }
    return env.ASSETS.fetch(request);
  }
};
