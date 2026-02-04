const { supabaseFetch } = require("./_supabase");

module.exports = async (req, res) => {
  if (req.method === "GET") {
    try {
      const { name, pass } = req.query || {};
      if (!name || !pass) {
        res.status(400).json({ error: "Missing credentials" });
        return;
      }
      const query = `?select=id,name,admin&limit=1&name=eq.${encodeURIComponent(
        name
      )}&pass=eq.${encodeURIComponent(pass)}`;
      const response = await supabaseFetch("users", { method: "GET", query });
      if (!response.ok) {
        const detail = await response.text();
        res.status(response.status).json({ error: detail || "Supabase error" });
        return;
      }
      const data = await response.json();
      if (!data[0]) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      res.status(200).json(data[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Supabase env vars missing or request failed" });
    }
    return;
  }

  if (req.method === "PATCH") {
    try {
      const { id, name, pass } = req.body || {};
      if (!id) {
        res.status(400).json({ error: "Missing id" });
        return;
      }
      const payload = {};
      if (name) payload.name = name;
      if (pass) payload.pass = pass;
      if (Object.keys(payload).length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }
      const query = `?id=eq.${encodeURIComponent(id)}&select=id,name,admin`;
      const response = await supabaseFetch("users", {
        method: "PATCH",
        body: payload,
        query,
        prefer: "return=representation"
      });
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

  res.status(405).json({ error: "Method not allowed" });
};
