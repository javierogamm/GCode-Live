const { supabaseFetch } = require("./_supabase");

module.exports = async (req, res) => {
  if (req.method === "GET") {
    try {
      const { subfuncion } = req.query || {};
      const filters = ["select=id,created_at,nombre,subfuncion", "order=created_at.desc"];
      if (subfuncion) {
        filters.push(`subfuncion=eq.${encodeURIComponent(subfuncion)}`);
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
      const { nombre, subfuncion, procedimiento } = req.body || {};
      if (!nombre || !subfuncion || !procedimiento) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }
      const response = await supabaseFetch("Code_Markdowns", {
        method: "POST",
        body: {
          nombre,
          subfuncion,
          procedimiento
        },
        query: "?select=id,created_at,nombre,subfuncion",
        prefer: "return=representation"
      });
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
