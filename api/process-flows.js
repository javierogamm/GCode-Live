const { supabaseFetch } = require("./_supabase");

async function getNextSyncCode() {
  const sources = [
    { path: "Code_Markdowns", query: "?select=sync_code&sync_code=not.is.null&order=sync_code.desc&limit=1" },
    { path: "Code_Markdowns_BACKUP", query: "?select=sync_code&sync_code=not.is.null&order=sync_code.desc&limit=1" },
    { path: "Process_Flows", query: "?select=sync_code&sync_code=not.is.null&order=sync_code.desc&limit=1" }
  ];

  let maxCode = 0;
  for (const source of sources) {
    const response = await supabaseFetch(source.path, { method: "GET", query: source.query });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Error reading ${source.path}`);
    }
    const data = await response.json();
    const value = Array.isArray(data) && data.length ? Number(data[0]?.sync_code || 0) : 0;
    if (Number.isFinite(value) && value > maxCode) {
      maxCode = value;
    }
  }

  return String(maxCode + 1);
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    try {
      const { subfuncion, id } = req.query || {};
      const filters = ["select=*"];
      if (id) {
        filters.push(`id=eq.${encodeURIComponent(id)}`);
      }
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
    return;
  }

  if (req.method === "PATCH") {
    try {
      const { flowId, projectId, assignSyncCode, flowJson, plantilla } = req.body || {};
      const normalizedFlowId = typeof flowId === "string" ? flowId.trim() : String(flowId || "").trim();
      const normalizedProjectId = typeof projectId === "string" ? projectId.trim() : String(projectId || "").trim();

      if (!normalizedFlowId || !normalizedProjectId) {
        res.status(400).json({ error: "Missing flowId or projectId" });
        return;
      }

      let syncCode = typeof assignSyncCode === "string" && assignSyncCode.trim()
        ? assignSyncCode.trim()
        : "";
      if (!syncCode) {
        syncCode = await getNextSyncCode();
      }

      const patchProject = await supabaseFetch("Code_Markdowns", {
        method: "PATCH",
        body: { sync_code: syncCode },
        query: `?id=eq.${encodeURIComponent(normalizedProjectId)}&select=id,sync_code`,
        prefer: "return=representation"
      });

      if (!patchProject.ok) {
        const detail = await patchProject.text();
        res.status(patchProject.status).json({ error: detail || "Failed updating Code_Markdowns" });
        return;
      }

      const patchBackup = await supabaseFetch("Code_Markdowns_BACKUP", {
        method: "PATCH",
        body: { sync_code: syncCode },
        query: `?%22ID_Origen%22=eq.${encodeURIComponent(normalizedProjectId)}&select=id,sync_code`,
        prefer: "return=representation"
      });
      if (!patchBackup.ok) {
        const detail = await patchBackup.text();
        res.status(patchBackup.status).json({ error: detail || "Failed updating Code_Markdowns_BACKUP" });
        return;
      }

      const flowBody = { sync_code: syncCode };
      if (flowJson !== undefined) {
        flowBody.json = flowJson;
      }
      if (typeof plantilla === "string") {
        flowBody.plantilla = plantilla;
      }

      const patchFlow = await supabaseFetch("Process_Flows", {
        method: "PATCH",
        body: flowBody,
        query: `?id=eq.${encodeURIComponent(normalizedFlowId)}&select=id,sync_code`,
        prefer: "return=representation"
      });
      if (!patchFlow.ok) {
        const detail = await patchFlow.text();
        res.status(patchFlow.status).json({ error: detail || "Failed updating Process_Flows" });
        return;
      }

      const projectRows = await patchProject.json();
      const backupRows = await patchBackup.json();
      const flowRows = await patchFlow.json();

      res.status(200).json({
        sync_code: syncCode,
        code_markdowns: Array.isArray(projectRows) ? projectRows[0] || null : projectRows,
        backups_updated: Array.isArray(backupRows) ? backupRows.length : 0,
        process_flow: Array.isArray(flowRows) ? flowRows[0] || null : flowRows
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Supabase env vars missing or request failed" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
