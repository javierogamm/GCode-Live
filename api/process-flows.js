const { supabaseFetch } = require("./_supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { subfuncion } = req.query || {};
    const filters = ["select=*"];
    if (subfuncion) {
      filters.push(`subfuncion=eq.${encodeURIComponent(subfuncion)}`);
    }
    filters.push("order=created_at.desc");

    const response = await supabaseFetch("Process_Flows", {
      method: "GET",
      query: `?${filters.join("&")}`
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
