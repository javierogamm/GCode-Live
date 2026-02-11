const { supabaseFetch } = require("./_supabase");

module.exports = async (req, res) => {
  if (req.method === "GET") {
    try {
      const { id } = req.query || {};
      if (!id) {
        res.status(400).json({ error: "Missing id" });
        return;
      }
      const query = `?select=id,proyecto,plantilla,user,subfuncion,json&limit=1&id=eq.${encodeURIComponent(id)}`;
      const response = await supabaseFetch("Code_Markdowns", { method: "GET", query });
      if (!response.ok) {
        const detail = await response.text();
        res.status(response.status).json({ error: detail || "Supabase error" });
        return;
      }
      const data = await response.json();
      res.status(200).json(data[0] || {});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Supabase env vars missing or request failed" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const { id } = req.query || {};
      const { user } = req.body || {};
      const normalizedUser = typeof user === "string" ? user.trim() : "";
      if (!id) {
        res.status(400).json({ error: "Missing id" });
        return;
      }

      const lookupResponse = await supabaseFetch("Code_Markdowns", {
        method: "GET",
        query: `?select=id,user&limit=1&id=eq.${encodeURIComponent(id)}`
      });
      if (!lookupResponse.ok) {
        const detail = await lookupResponse.text();
        res.status(lookupResponse.status).json({ error: detail || "Supabase error" });
        return;
      }
      const lookupData = await lookupResponse.json();
      const existing = Array.isArray(lookupData) && lookupData.length ? lookupData[0] : null;
      if (!existing) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      const owner = typeof existing.user === "string" ? existing.user.trim() : "";
      if (!normalizedUser || normalizedUser !== owner) {
        res.status(403).json({ error: "Only owner can delete", code: "OWNER_REQUIRED", owner });
        return;
      }

      const response = await supabaseFetch("Code_Markdowns", {
        method: "DELETE",
        query: `?id=eq.${encodeURIComponent(id)}`
      });
      if (!response.ok) {
        const detail = await response.text();
        res.status(response.status).json({ error: detail || "Supabase error" });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Supabase env vars missing or request failed" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
