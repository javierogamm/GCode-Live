const { supabaseFetch } = require("./_supabase");

module.exports = async (req, res) => {
  if (req.method === "GET") {
    try {
      const { subfuncion, proyecto, nombre, user } = req.query || {};
      const projectName = proyecto || nombre;
      const filters = [
        "select=id,created_at,proyecto,plantilla,user,subfuncion",
        "order=created_at.desc"
      ];
      if (projectName) {
        filters.push(`proyecto=eq.${encodeURIComponent(projectName)}`);
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
      const payload = {
        proyecto,
        plantilla,
        user,
        subfuncion,
        json
      };
      const existingResponse = await supabaseFetch("Code_Markdowns", {
        method: "GET",
        query: `?select=id&limit=1&proyecto=eq.${encodeURIComponent(proyecto)}`
      });
      if (!existingResponse.ok) {
        const detail = await existingResponse.text();
        res.status(existingResponse.status).json({ error: detail || "Supabase error" });
        return;
      }
      const existing = await existingResponse.json();
      const existingId = existing[0]?.id;
      const request = existingId
        ? {
            method: "PATCH",
            body: payload,
            query: `?id=eq.${encodeURIComponent(existingId)}&select=id,created_at,proyecto,plantilla,user,subfuncion`,
            prefer: "return=representation"
          }
        : {
            method: "POST",
            body: payload,
            query: "?select=id,created_at,proyecto,plantilla,user,subfuncion",
            prefer: "return=representation"
          };
      const response = await supabaseFetch("Code_Markdowns", request);
      if (!response.ok) {
        const detail = await response.text();
        res.status(response.status).json({ error: detail || "Supabase error" });
        return;
      }
      const data = await response.json();
      res.status(existingId ? 200 : 201).json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Supabase env vars missing or request failed" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
