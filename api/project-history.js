const { supabaseFetch } = require("./_supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { projectId } = req.query || {};
    const normalizedId = typeof projectId === "string" ? projectId.trim() : "";

    if (!normalizedId) {
      res.status(400).json({ error: "Missing projectId" });
      return;
    }

    const select = [
      "id",
      "created_at",
      "proyecto",
      "plantilla",
      "user",
      "subfuncion",
      "fecha_guardado",
      "%22ID_Origen%22",
      "json"
    ].join(",");

    const query = `?select=${select}&%22ID_Origen%22=eq.${encodeURIComponent(normalizedId)}&order=fecha_guardado.desc.nullslast,created_at.desc`;

    const response = await supabaseFetch("Code_Markdowns_BACKUP", {
      method: "GET",
      query
    });

    if (!response.ok) {
      const detail = await response.text();
      res.status(response.status).json({ error: detail || "Supabase error" });
      return;
    }

    const data = await response.json();
    res.status(200).json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Supabase env vars missing or request failed" });
  }
};
