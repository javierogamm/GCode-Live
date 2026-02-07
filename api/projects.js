const { supabaseFetch } = require("./_supabase");

module.exports = async (req, res) => {
  if (req.method === "GET") {
    try {
      const { subfuncion, nombre, proyecto, user } = req.query || {};
      const filters = [
        "select=id,created_at,proyecto,plantilla,user,subfuncion",
        "order=created_at.desc"
      ];
      const nombreProyecto = proyecto || nombre;
      if (nombreProyecto) {
        filters.push(`proyecto=eq.${encodeURIComponent(nombreProyecto)}`);
      }
      if (subfuncion) {
        filters.push(`subfuncion=eq.${encodeURIComponent(subfuncion)}`);
      }
      if (user) {
        filters.push(`user=eq.${encodeURIComponent(user)}`);
      }
      const query = `?${filters.join("&")}`;
      const response = await supabaseFetch("Code_Markdowns", { method: "GET", query });
      if (!response.ok) {
        const detail = await response.text();
        res.status(response.status).json({ error: detail || "Supabase error" });
        return;
      }
      const data = await response.json();
      res.status(200).json(data);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Supabase env vars missing or request failed" });
      return;
    }
  }

  if (req.method === "POST") {
    try {
      const { proyecto, plantilla, user, subfuncion, json } = req.body || {};
      if (!proyecto || !json) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }
      const lookupFilters = [
        `proyecto=eq.${encodeURIComponent(proyecto)}`,
        "limit=1",
        "select=id"
      ];
      const lookupQuery = `?${lookupFilters.join("&")}`;
      const lookupResponse = await supabaseFetch("Code_Markdowns", {
        method: "GET",
        query: lookupQuery
      });
      if (!lookupResponse.ok) {
        const detail = await lookupResponse.text();
        res.status(lookupResponse.status).json({ error: detail || "Supabase error" });
        return;
      }
      const lookupData = await lookupResponse.json();
      const payload = { proyecto, plantilla, user, subfuncion, json };
      let response = null;
      if (Array.isArray(lookupData) && lookupData.length) {
        const existingId = lookupData[0].id;
        response = await supabaseFetch("Code_Markdowns", {
          method: "PATCH",
          body: payload,
          query: `?id=eq.${encodeURIComponent(existingId)}&select=id,created_at,proyecto,plantilla,user,subfuncion`,
          prefer: "return=representation"
        });
      } else {
        response = await supabaseFetch("Code_Markdowns", {
          method: "POST",
          body: payload,
          query: "?select=id,created_at,proyecto,plantilla,user,subfuncion",
          prefer: "return=representation"
        });
      }
      if (!response.ok) {
        const detail = await response.text();
        res.status(response.status).json({ error: detail || "Supabase error" });
        return;
      }
      const data = await response.json();
      res.status(201).json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Supabase env vars missing or request failed" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
