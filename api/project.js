const { supabaseFetch } = require("./_supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

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
};
