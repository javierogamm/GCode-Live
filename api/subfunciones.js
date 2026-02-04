const { supabaseFetch } = require("./_supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const response = await supabaseFetch(
      "Code_Markdowns",
      {
        method: "GET",
        query: "?select=subfuncion&subfuncion=not.is.null&order=subfuncion.asc"
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      res.status(response.status).json({ error: detail || "Supabase error" });
      return;
    }

    const data = await response.json();
    const subfunciones = [...new Set(data.map((row) => row.subfuncion).filter(Boolean))];
    res.status(200).json(subfunciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Supabase env vars missing or request failed" });
  }
};
