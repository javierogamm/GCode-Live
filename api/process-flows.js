const { supabaseFetch } = require("./_supabase");

function pushLog(logs, stage, detail, level = "info") {
  logs.push({
    at: new Date().toISOString(),
    level,
    stage,
    detail
  });
}

async function getNextSyncCode(logs) {
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
      pushLog(logs, "get_next_sync_code", `Error leyendo ${source.path}: ${detail || "sin detalle"}`, "error");
      throw new Error(detail || `Error reading ${source.path}`);
    }
    const data = await response.json();
    const value = Array.isArray(data) && data.length ? Number(data[0]?.sync_code || 0) : 0;
    if (Number.isFinite(value) && value > maxCode) {
      maxCode = value;
    }
  }

  const nextCode = String(maxCode + 1);
  pushLog(logs, "get_next_sync_code", `Nuevo sync_code calculado: ${nextCode}`);
  return nextCode;
}

async function syncFlowWithCode(req, res) {
  const logs = [];
  const { flowId, projectId, assignSyncCode, flowJson, plantilla } = req.body || {};
  const normalizedFlowId = typeof flowId === "string" ? flowId.trim() : String(flowId || "").trim();
  const normalizedProjectId = typeof projectId === "string" ? projectId.trim() : String(projectId || "").trim();

  pushLog(logs, "sync_start", `Inicio de sincronización flow=${normalizedFlowId || "-"} project=${normalizedProjectId || "-"}`);

  if (!normalizedFlowId || !normalizedProjectId) {
    pushLog(logs, "validate", "Faltan flowId o projectId", "error");
    res.status(400).json({ error: "Missing flowId or projectId", logs });
    return;
  }

  let syncCode = typeof assignSyncCode === "string" && assignSyncCode.trim()
    ? assignSyncCode.trim()
    : "";
  if (!syncCode) {
    syncCode = await getNextSyncCode(logs);
  } else {
    pushLog(logs, "sync_code", `Se reutiliza sync_code recibido: ${syncCode}`);
  }

  const patchProject = await supabaseFetch("Code_Markdowns", {
    method: "PATCH",
    body: { sync_code: syncCode },
    query: `?id=eq.${encodeURIComponent(normalizedProjectId)}&select=id,sync_code`,
    prefer: "return=representation"
  });

  if (!patchProject.ok) {
    const detail = await patchProject.text();
    pushLog(logs, "patch_code_markdowns", detail || "Error actualizando Code_Markdowns", "error");
    res.status(patchProject.status).json({ error: detail || "Failed updating Code_Markdowns", logs });
    return;
  }
  pushLog(logs, "patch_code_markdowns", "Code_Markdowns actualizado");

  const patchBackup = await supabaseFetch("Code_Markdowns_BACKUP", {
    method: "PATCH",
    body: { sync_code: syncCode },
    query: `?%22ID_Origen%22=eq.${encodeURIComponent(normalizedProjectId)}&select=id,sync_code`,
    prefer: "return=representation"
  });
  if (!patchBackup.ok) {
    const detail = await patchBackup.text();
    pushLog(logs, "patch_code_markdowns_backup", detail || "Error actualizando backup", "error");
    res.status(patchBackup.status).json({ error: detail || "Failed updating Code_Markdowns_BACKUP", logs });
    return;
  }
  pushLog(logs, "patch_code_markdowns_backup", "Backups actualizados");

  const flowBody = { sync_code: syncCode };
  if (flowJson !== undefined) {
    flowBody.flow = flowJson;
    pushLog(logs, "flow_payload", "Se incluye payload en columna flow para consolidar plantillas");
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
    pushLog(logs, "patch_process_flows", detail || "Error actualizando Process_Flows", "error");
    res.status(patchFlow.status).json({ error: detail || "Failed updating Process_Flows", logs });
    return;
  }
  pushLog(logs, "patch_process_flows", "Process_Flows actualizado");

  const projectRows = await patchProject.json();
  const backupRows = await patchBackup.json();
  const flowRows = await patchFlow.json();

  pushLog(logs, "sync_complete", "Sincronización finalizada correctamente");
  res.status(200).json({
    sync_code: syncCode,
    code_markdowns: Array.isArray(projectRows) ? projectRows[0] || null : projectRows,
    backups_updated: Array.isArray(backupRows) ? backupRows.length : 0,
    process_flow: Array.isArray(flowRows) ? flowRows[0] || null : flowRows,
    logs
  });
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    try {
      const { subfuncion, id, sync_code } = req.query || {};
      const filters = ["select=*"];
      if (id) {
        filters.push(`id=eq.${encodeURIComponent(id)}`);
      }
      if (subfuncion) {
        filters.push(`subfuncion=eq.${encodeURIComponent(subfuncion)}`);
      }
      if (sync_code) {
        filters.push(`sync_code=eq.${encodeURIComponent(sync_code)}`);
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

  if (req.method === "PATCH" || req.method === "POST") {
    try {
      await syncFlowWithCode(req, res);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Supabase env vars missing or request failed" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
