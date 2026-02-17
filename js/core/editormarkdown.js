console.log("🚀 Editor Markdown básico iniciado");

/* =======================================
   REFERENCIAS
======================================= */
const markdownText = document.getElementById("markdownText");
const lineNumbers = document.getElementById("lineNumbers");
const btnNuevo = document.getElementById("btnNuevo");
const btnPegarAuto = document.getElementById("btnPegarAuto");
const btnCopiar = document.getElementById("btnCopiar");
const btnDescargar = document.getElementById("btnDescargar");
const btnExportProyecto = document.getElementById("btnExportProyecto");
const btnImportProyecto = document.getElementById("btnImportProyecto");
const btnGuardarProyecto = document.getElementById("btnGuardarProyecto");
const btnCargarProyecto = document.getElementById("btnCargarProyecto");
const btnExportCsv = document.getElementById("btnExportCsv");
const btnValidarTesauros = document.getElementById("btnValidarTesauros");
const projectNameInput = document.getElementById("projectNameInput");
const templateNameInput = document.getElementById("templateNameInput");
const templateTypeSelect = document.getElementById("templateTypeSelect");

function getCurrentAuthUserName() {
    const stored = localStorage.getItem("gcUser");
    if (!stored) return "";
    try {
        const parsed = JSON.parse(stored);
        return parsed?.name || "";
    } catch (error) {
        return "";
    }
}

function ensureLineNumbersContent() {
    if (!lineNumbers) return null;
    let content = lineNumbers.querySelector(".line-numbers-content");
    if (!content) {
        content = document.createElement("div");
        content.className = "line-numbers-content";
        lineNumbers.appendChild(content);
    }
    return content;
}

function updateLineNumbers() {
    if (!lineNumbers || !markdownText) return;
    const content = ensureLineNumbersContent();
    if (!content) return;
    const computedStyles = window.getComputedStyle(markdownText);
    let lineHeight = parseFloat(computedStyles.lineHeight);
    if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
        lineHeight = 20;
    }
    const visualLineCount = Math.max(1, Math.ceil(markdownText.scrollHeight / lineHeight));
    let html = "";
    for (let i = 1; i <= visualLineCount; i++) {
        html += `<div class="line-number">${i}</div>`;
    }
    content.innerHTML = html;
    content.style.height = markdownText.scrollHeight + "px";
}

const lineSelectionState = {
    isSelecting: false,
    startLine: null,
    lastLine: null
};

function getLineNumberFromElement(element) {
    if (!element) return null;
    const lineEl = element.closest(".line-number");
    if (!lineEl) return null;
    const value = parseInt(lineEl.textContent, 10);
    return Number.isFinite(value) ? value : null;
}

function getLineRangeSelection(text, startLine, endLine) {
    const lines = text.split("\n");
    const safeStart = Math.max(1, Math.min(startLine, lines.length));
    const safeEnd = Math.max(1, Math.min(endLine, lines.length));
    const minLine = Math.min(safeStart, safeEnd);
    const maxLine = Math.max(safeStart, safeEnd);
    let startIndex = 0;
    for (let i = 0; i < minLine - 1; i++) {
        startIndex += lines[i].length + 1;
    }
    let endIndex = startIndex;
    for (let i = minLine - 1; i < maxLine; i++) {
        endIndex += lines[i].length;
        if (i < lines.length - 1) {
            endIndex += 1;
        }
    }
    return { startIndex, endIndex };
}

function applyLineSelection(startLine, endLine) {
    if (!markdownText) return;
    const text = markdownText.value || "";
    const { startIndex, endIndex } = getLineRangeSelection(text, startLine, endLine);
    markdownText.focus();
    markdownText.setSelectionRange(startIndex, endIndex);
}

function handleLineNumberMouseDown(event) {
    if (event.button !== 0) return;
    const line = getLineNumberFromElement(event.target);
    if (!line) return;
    event.preventDefault();
    lineSelectionState.isSelecting = true;
    lineSelectionState.startLine = line;
    lineSelectionState.lastLine = line;
    applyLineSelection(line, line);
}

function handleLineNumberMouseMove(event) {
    if (!lineSelectionState.isSelecting) return;
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const line = getLineNumberFromElement(element);
    if (!line || line === lineSelectionState.lastLine) return;
    lineSelectionState.lastLine = line;
    applyLineSelection(lineSelectionState.startLine, line);
}

function handleLineNumberMouseUp() {
    lineSelectionState.isSelecting = false;
    lineSelectionState.startLine = null;
    lineSelectionState.lastLine = null;
}

if (lineNumbers && markdownText) {
    lineNumbers.addEventListener("mousedown", handleLineNumberMouseDown);
    document.addEventListener("mousemove", handleLineNumberMouseMove);
    document.addEventListener("mouseup", handleLineNumberMouseUp);
}

// Barra de acciones flotantes (Sections, LET, Definition, Tesauro)
function ensureFloatingActionRow() {
    const toolbar = document.getElementById("toolbar") || document.querySelector(".toolbar");
    if (!toolbar || !toolbar.parentElement) return null;

    let row = document.getElementById("floatingActionRow");
    if (!row) {
        row = document.createElement("div");
        row.id = "floatingActionRow";
        toolbar.parentElement.insertBefore(row, toolbar);
    }
    return row;
}

// Exponer helper para otros módulos
window.ensureFloatingActionRow = ensureFloatingActionRow;

const projectState = {
    name: "",
    templates: [],
    activeTemplateId: null
};

const TEMPLATE_TYPES = ["Formulario", "Documento"];

const normalizeTemplateType = (value) => TEMPLATE_TYPES.includes(value) ? value : "Documento";

const composePlantillaResumen = () => projectState.templates
    .map((tpl) => {
        const name = (tpl.name || "").trim();
        if (!name) return "";
        return `${name} (${normalizeTemplateType(tpl.type)})`;
    })
    .filter(Boolean)
    .join(", ");

const templateManagerState = {
    modal: null
};

const createTemplateId = () => `tpl_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

const getActiveTemplate = () => projectState.templates.find((tpl) => tpl.id === projectState.activeTemplateId) || null;

const syncActiveTemplateMarkdown = () => {
    const active = getActiveTemplate();
    if (active && markdownText) {
        active.markdown = markdownText.value || "";
    }
};

window.getProjectTemplatesSnapshot = () => {
    syncActiveTemplateMarkdown();
    return (projectState.templates || []).map((tpl) => ({
        id: tpl.id,
        name: tpl.name || "",
        type: normalizeTemplateType(tpl.type || "Documento"),
        markdown: typeof tpl.markdown === "string" ? tpl.markdown : ""
    }));
};

const resetUndoStacks = (value) => {
    UndoManager.undoStack = [];
    UndoManager.redoStack = [];
    UndoManager.lastValue = value || "";
};

const getUniqueTemplateName = (baseName) => {
    const safeBase = (baseName || "").trim() || `Plantilla ${projectState.templates.length + 1}`;
    if (!projectState.templates.some((tpl) => tpl.name === safeBase)) {
        return safeBase;
    }
    let idx = 2;
    let candidate = `${safeBase} (${idx})`;
    while (projectState.templates.some((tpl) => tpl.name === candidate)) {
        idx += 1;
        candidate = `${safeBase} (${idx})`;
    }
    return candidate;
};

const setProjectName = (name) => {
    projectState.name = (name || "").trim();
    if (projectNameInput) {
        projectNameInput.value = projectState.name;
    }
};

const setTemplates = (templates = [], activeName = "") => {
    projectState.templates = templates.map((tpl) => ({
        id: tpl.id || createTemplateId(),
        name: tpl.name || tpl.nombre || "Plantilla",
        type: normalizeTemplateType(tpl.type || tpl.tipo),
        markdown: typeof tpl.markdown === "string" ? tpl.markdown : ""
    }));
    if (!projectState.templates.length) {
        const fallback = {
            id: createTemplateId(),
            name: "Plantilla 1",
            type: "Documento",
            markdown: markdownText ? markdownText.value || "" : ""
        };
        projectState.templates = [fallback];
    }
    const active = projectState.templates.find((tpl) => tpl.name === activeName) || projectState.templates[0];
    projectState.activeTemplateId = active.id;
    if (markdownText) {
        markdownText.value = active.markdown || "";
        resetUndoStacks(markdownText.value);
        if (typeof window.updateHighlight === "function") {
            updateHighlight();
        }
        updateLineNumbers();
    }
    renderActiveTemplateDetails();
};

const addTemplate = (name, markdown = "", type = "Documento") => {
    const finalName = getUniqueTemplateName(name);
    const template = {
        id: createTemplateId(),
        name: finalName,
        type: normalizeTemplateType(type),
        markdown
    };
    projectState.templates.push(template);
    projectState.activeTemplateId = template.id;
    if (markdownText) {
        markdownText.value = template.markdown;
        resetUndoStacks(markdownText.value);
        updateHighlight();
        updateLineNumbers();
    }
    renderActiveTemplateDetails();
    return template;
};

const renderActiveTemplateDetails = () => {
    const active = getActiveTemplate();
    if (templateNameInput) {
        templateNameInput.value = active ? active.name || "" : "";
    }
    if (templateTypeSelect) {
        templateTypeSelect.value = normalizeTemplateType(active ? active.type : "Documento");
    }
};

const applyProjectData = (data) => {
    if (!data || typeof data !== "object") return;
    const tesauros = Array.isArray(data.tesauros) ? data.tesauros : [];
    const proyecto = data.proyecto || {};
    const plantillas = proyecto.plantillas || data.plantillas || data.templates || null;
    const projectName = proyecto.nombre || data.nombreProyecto || data.projectName || "";

    if (typeof data.markdown === "string" && !plantillas) {
        const fallbackName = proyecto.plantilla || data.plantilla || "Plantilla 1";
        setTemplates([
            { name: fallbackName, markdown: data.markdown }
        ], fallbackName);
    } else if (Array.isArray(plantillas)) {
        const mapped = plantillas.map((tpl, index) => ({
            name: tpl.nombre || tpl.name || `Plantilla ${index + 1}`,
            type: tpl.tipo || tpl.type || "Documento",
            markdown: tpl.markdown || ""
        }));
        setTemplates(mapped, proyecto.plantillaActiva || data.plantillaActiva || "");
    }

    if (projectName) {
        setProjectName(projectName);
    }

    if (tesauros.length && window.DataTesauro) {
        DataTesauro.campos = tesauros;
        if (typeof DataTesauro.renderList === "function") {
            DataTesauro.renderList();
        } else if (typeof DataTesauro.render === "function") {
            DataTesauro.render();
        }
    }
};

function ensureTemplateManagerModal() {
    if (templateManagerState.modal) return templateManagerState.modal;

    const modal = document.createElement("div");
    modal.id = "templateManagerModal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal-card template-manager-card">
            <div class="modal-header">
                <div>
                    <h3>Plantillas del proyecto</h3>
                    <p class="muted">Selecciona o crea plantillas para este proyecto.</p>
                </div>
                <button type="button" class="modal-close" aria-label="Cerrar">✕</button>
            </div>
            <div class="modal-body template-manager-body">
                <div id="templateManagerList" class="template-list"></div>
                <div class="template-create-row">
                    <input id="templateManagerNameInput" type="text" placeholder="Nombre de la nueva plantilla" />
                    <select id="templateManagerTypeSelect">
                        <option value="Formulario">Formulario</option>
                        <option value="Documento" selected>Documento</option>
                    </select>
                    <button type="button" data-action="create-template">Añadir plantilla</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector(".modal-close");
    const list = modal.querySelector("#templateManagerList");
    const nameInput = modal.querySelector("#templateManagerNameInput");
    const typeSelect = modal.querySelector("#templateManagerTypeSelect");
    const createBtn = modal.querySelector("[data-action='create-template']");

    const render = () => {
        if (!list) return;
        list.innerHTML = "";
        if (!projectState.templates.length) {
            list.innerHTML = `<div class="muted">Aún no hay plantillas.</div>`;
            return;
        }
        projectState.templates.forEach((tpl) => {
            const row = document.createElement("div");
            row.className = "template-item" + (tpl.id === projectState.activeTemplateId ? " active" : "");
            const name = document.createElement("span");
            name.textContent = `${tpl.name} (${normalizeTemplateType(tpl.type)})`;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = "Usar";
            btn.addEventListener("click", () => {
                syncActiveTemplateMarkdown();
                projectState.activeTemplateId = tpl.id;
                if (markdownText) {
                    markdownText.value = tpl.markdown || "";
                    resetUndoStacks(markdownText.value);
                    updateHighlight();
                    updateLineNumbers();
                }
                renderActiveTemplateDetails();
                render();
                modal.style.display = "none";
            });
            row.appendChild(name);
            row.appendChild(btn);
            list.appendChild(row);
        });
    };

    const handleCreate = () => {
        const value = nameInput ? nameInput.value.trim() : "";
        const type = typeSelect ? typeSelect.value : "Documento";
        if (!value) return;
        syncActiveTemplateMarkdown();
        const template = addTemplate(value, "", type);
        if (nameInput) nameInput.value = "";
        if (typeSelect) typeSelect.value = "Documento";
        if (markdownText) {
            markdownText.value = template.markdown;
            resetUndoStacks(markdownText.value);
            updateHighlight();
            updateLineNumbers();
        }
        renderActiveTemplateDetails();
        render();
        modal.style.display = "none";
    };

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
    });

    if (createBtn) {
        createBtn.addEventListener("click", handleCreate);
    }
    if (nameInput) {
        nameInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
            }
        });
    }

    modal.renderList = render;
    modal.focusCreateInput = () => {
        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
    };

    templateManagerState.modal = modal;
    return modal;
}

function ensureTemplateButtons() {
    const row = ensureFloatingActionRow();
    if (!row) return;
    if (!document.getElementById("btnSelectTemplate")) {
        const selectBtn = document.createElement("button");
        selectBtn.id = "btnSelectTemplate";
        selectBtn.className = "floating-action-btn template-action-btn";
        selectBtn.textContent = "🧾 Seleccionar plantilla";
        selectBtn.addEventListener("click", () => {
            syncActiveTemplateMarkdown();
            const modal = ensureTemplateManagerModal();
            if (typeof modal.renderList === "function") modal.renderList();
            modal.style.display = "flex";
        });
        row.appendChild(selectBtn);
    }
    if (!document.getElementById("btnAddTemplate")) {
        const addBtn = document.createElement("button");
        addBtn.id = "btnAddTemplate";
        addBtn.className = "floating-action-btn template-action-btn";
        addBtn.textContent = "➕ Añadir plantilla";
        addBtn.addEventListener("click", () => {
            syncActiveTemplateMarkdown();
            const modal = ensureTemplateManagerModal();
            if (typeof modal.renderList === "function") modal.renderList();
            modal.style.display = "flex";
            if (typeof modal.focusCreateInput === "function") {
                modal.focusCreateInput();
            }
        });
        row.appendChild(addBtn);
    }
}

window.ensureTemplateButtons = ensureTemplateButtons;

if (projectNameInput) {
    projectNameInput.addEventListener("input", (event) => {
        const value = event.target ? event.target.value : "";
        setProjectName(value);
    });
}
if (templateNameInput) {
    templateNameInput.addEventListener("input", (event) => {
        const active = getActiveTemplate();
        if (!active) return;
        active.name = (event.target ? event.target.value : "").trim() || "Plantilla";
        if (saveProjectState.modal && saveProjectState.modal.style.display === "flex" && typeof saveProjectState.modal.renderLocalTemplates === "function") {
            saveProjectState.modal.renderLocalTemplates();
        }
    });
}
if (templateTypeSelect) {
    templateTypeSelect.addEventListener("change", (event) => {
        const active = getActiveTemplate();
        if (!active) return;
        active.type = normalizeTemplateType(event.target ? event.target.value : "Documento");
        if (saveProjectState.modal && saveProjectState.modal.style.display === "flex" && typeof saveProjectState.modal.renderLocalTemplates === "function") {
            saveProjectState.modal.renderLocalTemplates();
        }
    });
}
if (btnExportProyecto) {
    btnExportProyecto.addEventListener("click", () => {
        syncActiveTemplateMarkdown();
        const projectName = projectState.name || (projectNameInput ? projectNameInput.value.trim() : "");

        // Coger lista completa de tesauros desde DataTesauro
        const tesauros = (window.DataTesauro && Array.isArray(DataTesauro.campos))
            ? DataTesauro.campos
            : [];

        const proyecto = {
            proyecto: {
                nombre: projectName,
                plantillas: projectState.templates.map((tpl) => ({
                    nombre: tpl.name,
                    tipo: normalizeTemplateType(tpl.type),
                    markdown: tpl.markdown
                })),
                plantillaActiva: getActiveTemplate() ? getActiveTemplate().name : ""
            },
            tesauros: tesauros
        };

        const jsonStr = JSON.stringify(proyecto, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "proyecto_markdown_tesauros.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}
if (btnImportProyecto) {
    btnImportProyecto.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json";

        input.addEventListener("change", (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const raw = reader.result || "";
                    const data = JSON.parse(raw);

                    // 1) Restaurar markdown
                    applyProjectData(data);
                    saveProjectState.loadedProject = null;

                    alert("✔ Proyecto importado correctamente.");
                } catch (err) {
                    console.error(err);
                    alert("No se ha podido leer el JSON del proyecto.");
                }
            };

            reader.readAsText(file, "utf-8");
        });

        input.click();
    });
}

const saveProjectState = {
    modal: null,
    subfunciones: [],
    activeSubfuncion: "",
    projects: [],
    loadedProject: null
};

function ensureSaveProjectModal() {
    if (saveProjectState.modal) return saveProjectState.modal;

    const modal = document.createElement("div");
    modal.id = "saveProjectModal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal-card save-project-modal-card">
            <div class="modal-header">
                <div>
                    <h3>Guardar proyecto en base de datos</h3>
                    <p class="muted">Se guarda una fila por proyecto.</p>
                </div>
                <button type="button" class="modal-close" aria-label="Cerrar">✕</button>
            </div>
            <div class="modal-body save-project-body">
                <div class="save-project-sidebar">
                    <h4>Carpetas guardadas</h4>
                    <div class="save-project-folder-list" id="saveProjectFolderList"></div>
                </div>
                <div class="save-project-main">
                    <div class="save-project-input-row">
                        <input id="saveProjectProjectInput" type="text" placeholder="Nombre del proyecto" />
                        <input id="saveProjectSubfuncionInput" type="text" placeholder="Carpeta (subfunción)" />
                    </div>
                    <div class="save-project-list" id="saveProjectList"></div>
                    <div class="save-project-status" id="saveProjectStatus"></div>
                    <div class="save-project-footer">
                        <button type="button" class="save-project-save-btn" data-action="guardar">Guardar proyecto</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector(".modal-close");
    const statusEl = modal.querySelector("#saveProjectStatus");
    const folderList = modal.querySelector("#saveProjectFolderList");
    const projectInput = modal.querySelector("#saveProjectProjectInput");
    const subfuncionInput = modal.querySelector("#saveProjectSubfuncionInput");
    const saveBtn = modal.querySelector("[data-action='guardar']");

    const setStatus = (msg, isError = true) => {
        if (!statusEl) return;
        statusEl.textContent = msg || "";
        statusEl.style.color = isError ? "#b91c1c" : "#15803d";
    };

    const renderSubfunciones = () => {
        if (!folderList) return;
        folderList.innerHTML = "";
        if (!saveProjectState.subfunciones.length) {
            folderList.innerHTML = `<div class="muted">Sin carpetas guardadas.</div>`;
            return;
        }
        saveProjectState.subfunciones.forEach((subfuncion) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "save-project-folder-item";
            const label = subfuncion || "Sin carpeta";
            item.innerHTML = `📁 ${label}`;
            item.addEventListener("click", () => {
                saveProjectState.activeSubfuncion = label;
                if (subfuncionInput) {
                    subfuncionInput.value = label === "Sin carpeta" ? "" : label;
                }
                renderSubfunciones();
                if (typeof modal.loadProjects === "function") {
                    modal.loadProjects(subfuncionInput ? subfuncionInput.value.trim() : "");
                }
            });
            if (saveProjectState.activeSubfuncion === label) {
                item.classList.add("active");
            }
            folderList.appendChild(item);
        });
    };

    const renderLocalTemplates = () => {
        const list = modal.querySelector("#saveProjectList");
        if (!list) return;
        list.innerHTML = "";
        if (!projectState.templates.length) {
            list.innerHTML = `<div class="muted">No hay plantillas locales aún.</div>`;
            return;
        }
        projectState.templates.forEach((tpl) => {
            const row = document.createElement("div");
            row.className = "save-project-item";
            const name = document.createElement("span");
            name.textContent = `${tpl.name || "Sin nombre"} (${normalizeTemplateType(tpl.type)})`;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "save-project-use-btn";
            button.textContent = "Usar plantilla";
            button.addEventListener("click", async () => {
                syncActiveTemplateMarkdown();
                projectState.activeTemplateId = tpl.id;
                if (markdownText) {
                    markdownText.value = tpl.markdown || "";
                    resetUndoStacks(markdownText.value);
                    updateHighlight();
                    updateLineNumbers();
                }
            });
            row.appendChild(name);
            row.appendChild(button);
            list.appendChild(row);
        });
    };

    const removeProject = async (project) => {
        const currentUser = getCurrentAuthUserName();
        if (!currentUser) {
            setStatus("Debes iniciar sesión para eliminar.");
            return;
        }
        const owner = (project?.user || "").trim();
        if (!owner || currentUser !== owner) {
            setStatus("Solo el creador puede eliminar este registro.");
            return;
        }
        const confirmation = window.confirm(`¿Eliminar el proyecto "${project.proyecto || "Sin nombre"}"? Esta acción no se puede deshacer.`);
        if (!confirmation) return;
        try {
            setStatus("Eliminando proyecto...", false);
            const response = await fetch(`/api/project?id=${encodeURIComponent(project.id)}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ user: currentUser })
            });
            if (!response.ok) {
                throw new Error("Error al eliminar el proyecto.");
            }
            setStatus("Proyecto eliminado correctamente.", false);
            if (typeof modal.loadProjects === "function") {
                await modal.loadProjects(subfuncionInput ? subfuncionInput.value.trim() : "");
            }
            if (typeof modal.loadSubfunciones === "function") {
                await modal.loadSubfunciones();
            }
        } catch (error) {
            console.error(error);
            setStatus("No se pudo eliminar el proyecto.");
        }
    };

    const renderRemoteProjects = () => {
        const list = modal.querySelector("#saveProjectList");
        if (!list) return;
        list.innerHTML = "";
        if (!saveProjectState.projects.length) {
            list.innerHTML = `<div class="muted">No hay proyectos guardados para esta carpeta.</div>`;
            return;
        }
        const currentUser = getCurrentAuthUserName();
        saveProjectState.projects.forEach((project) => {
            const row = document.createElement("div");
            row.className = "save-project-item";

            const meta = document.createElement("div");
            meta.className = "save-project-meta";
            const title = document.createElement("span");
            title.textContent = project.proyecto || "Proyecto sin nombre";
            const owner = document.createElement("small");
            owner.className = "save-project-owner";
            owner.textContent = `Autor: ${project.user || "Sin autor"}`;
            meta.appendChild(title);
            meta.appendChild(owner);

            const actions = document.createElement("div");
            actions.className = "save-project-actions";

            const isOwner = currentUser && project.user && currentUser === project.user;
            if (isOwner) {
                const overwriteBtn = document.createElement("button");
                overwriteBtn.type = "button";
                overwriteBtn.className = "save-project-use-btn";
                overwriteBtn.textContent = "Sobrescribir";
                overwriteBtn.addEventListener("click", async () => {
                    if (!window.confirm(`¿Sobrescribir el proyecto "${project.proyecto || "Sin nombre"}"?`)) return;
                    if (projectInput) {
                        projectInput.value = project.proyecto || "";
                    }
                    await saveProject(true);
                });
                actions.appendChild(overwriteBtn);

                const deleteBtn = document.createElement("button");
                deleteBtn.type = "button";
                deleteBtn.className = "save-project-delete-btn";
                deleteBtn.textContent = "Eliminar";
                deleteBtn.addEventListener("click", () => removeProject(project));
                actions.appendChild(deleteBtn);
            } else {
                const readonly = document.createElement("small");
                readonly.className = "save-project-owner";
                readonly.textContent = "Solo el creador puede sobrescribir/eliminar";
                actions.appendChild(readonly);
            }

            row.appendChild(meta);
            row.appendChild(actions);
            list.appendChild(row);
        });
    };

    const loadSubfunciones = async () => {
        try {
            setStatus("Cargando carpetas...", false);
            const response = await fetch("/api/subfunciones");
            if (!response.ok) {
                throw new Error("Error al cargar carpetas.");
            }
            const data = await response.json();
            saveProjectState.subfunciones = Array.isArray(data) ? data : [];
            renderSubfunciones();
            setStatus("");
        } catch (error) {
            console.error(error);
            setStatus("No se pudieron cargar las carpetas.");
        }
    };

    const loadProjects = async (subfuncion = "") => {
        try {
            setStatus("Cargando proyectos guardados...", false);
            const query = subfuncion ? `?subfuncion=${encodeURIComponent(subfuncion)}` : "";
            const response = await fetch(`/api/projects${query}`);
            if (!response.ok) {
                throw new Error("Error al cargar proyectos.");
            }
            const data = await response.json();
            saveProjectState.projects = Array.isArray(data) ? data : [];
            renderRemoteProjects();
            setStatus("");
        } catch (error) {
            console.error(error);
            saveProjectState.projects = [];
            renderRemoteProjects();
            setStatus("No se pudieron cargar los proyectos guardados.");
        }
    };

    const saveProject = async (overwrite = false) => {
        const proyectoNombre = projectInput ? projectInput.value.trim() : "";
        const subfuncionNombre = subfuncionInput ? subfuncionInput.value.trim() : "";
        const currentUser = getCurrentAuthUserName();

        if (!proyectoNombre) {
            setStatus("Indica el nombre del proyecto.");
            return;
        }
        if (!subfuncionNombre) {
            setStatus("Indica la carpeta (subfunción).");
            return;
        }
        if (!currentUser) {
            setStatus("Debes iniciar sesión para guardar.");
            return;
        }

        setProjectName(proyectoNombre);
        const tesauros = (window.DataTesauro && Array.isArray(DataTesauro.campos))
            ? DataTesauro.campos
            : [];
        const procedimiento = {
            proyecto: {
                nombre: proyectoNombre,
                plantillas: projectState.templates.map((tpl) => ({
                    nombre: tpl.name,
                    tipo: normalizeTemplateType(tpl.type),
                    markdown: tpl.markdown
                })),
                plantillaActiva: getActiveTemplate() ? getActiveTemplate().name : ""
            },
            tesauros
        };

        try {
            const plantillaResumen = composePlantillaResumen();
            setStatus(overwrite ? "Sobrescribiendo proyecto..." : "Guardando proyecto...", false);
            const response = await fetch("/api/projects", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    proyecto: proyectoNombre,
                    plantilla: plantillaResumen,
                    user: currentUser,
                    subfuncion: subfuncionNombre,
                    json: procedimiento,
                    overwrite
                })
            });
            if (!response.ok) {
                let payload = null;
                try {
                    payload = await response.json();
                } catch (error) {
                    payload = null;
                }
                if (response.status === 409 && payload?.code === "PROJECT_EXISTS") {
                    setStatus(`Ya existe un registro para "${proyectoNombre}". Si eres el creador, usa "Sobrescribir".`);
                    await loadProjects(subfuncionNombre);
                    return;
                }
                if (response.status === 403 && payload?.code === "OWNER_REQUIRED") {
                    const owner = payload?.owner || "otro usuario";
                    setStatus(`Solo ${owner} puede sobrescribir este registro.`);
                    return;
                }
                throw new Error("Error al guardar el proyecto.");
            }
            let savedData = null;
            try {
                savedData = await response.json();
            } catch (error) {
                savedData = null;
            }
            saveProjectState.activeSubfuncion = subfuncionNombre;
            saveProjectState.loadedProject = {
                id: savedData?.id || saveProjectState.loadedProject?.id || null,
                proyecto: proyectoNombre,
                subfuncion: subfuncionNombre,
                user: currentUser
            };
            setStatus(overwrite ? "Proyecto sobrescrito correctamente." : "Proyecto guardado correctamente.", false);
            renderLocalTemplates();
            await loadSubfunciones();
            await loadProjects(subfuncionNombre);
            if (overwrite) {
                modal.style.display = "none";
            }
        } catch (error) {
            console.error(error);
            setStatus(overwrite ? "No se pudo sobrescribir el proyecto." : "No se pudo guardar el proyecto.");
        }
    };

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
    });

    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            const proyectoNombre = projectInput ? projectInput.value.trim() : "";
            const loadedProjectName = saveProjectState.loadedProject?.proyecto || "";
            const loadedProjectOwner = saveProjectState.loadedProject?.user || "";
            const currentUser = getCurrentAuthUserName();
            const canOverwriteLoaded = loadedProjectName
                && proyectoNombre
                && proyectoNombre === loadedProjectName
                && currentUser
                && loadedProjectOwner
                && currentUser === loadedProjectOwner;

            if (!canOverwriteLoaded) {
                await saveProject(false);
                return;
            }

            const overwrite = window.confirm(`Has cargado desde BDD el proyecto "${loadedProjectName}". ¿Sobrescribir?`);
            if (overwrite) {
                await saveProject(true);
                return;
            }

            const suggestedName = `${loadedProjectName} copia`;
            if (projectInput) {
                projectInput.value = suggestedName;
                projectInput.focus();
                projectInput.select();
            }
            setStatus("Indica un nuevo nombre de proyecto y vuelve a guardar.", false);
        });
    }

    if (subfuncionInput) {
        subfuncionInput.addEventListener("input", () => {
            saveProjectState.activeSubfuncion = subfuncionInput.value.trim();
            if (typeof modal.loadProjects === "function") {
                modal.loadProjects(saveProjectState.activeSubfuncion);
            }
        });
    }

    modal.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            modal.style.display = "none";
        }
    });

    saveProjectState.modal = modal;
    modal.loadSubfunciones = loadSubfunciones;
    modal.loadProjects = loadProjects;
    modal.renderLocalTemplates = renderLocalTemplates;
    modal.renderSubfunciones = renderSubfunciones;
    return modal;
}

if (btnGuardarProyecto) {
    btnGuardarProyecto.addEventListener("click", () => {
        syncActiveTemplateMarkdown();
        const modal = ensureSaveProjectModal();
        const projectInput = modal.querySelector("#saveProjectProjectInput");
        const subfuncionInput = modal.querySelector("#saveProjectSubfuncionInput");
        if (projectInput) {
            projectInput.value = projectState.name || saveProjectState.loadedProject?.proyecto || "";
        }
        if (subfuncionInput) {
            subfuncionInput.value = saveProjectState.activeSubfuncion || saveProjectState.loadedProject?.subfuncion || "";
        }
        modal.style.display = "flex";
        if (typeof modal.renderLocalTemplates === "function") {
            modal.renderLocalTemplates();
        }
        if (typeof modal.loadSubfunciones === "function") {
            modal.loadSubfunciones();
        }
        if (typeof modal.loadProjects === "function") {
            modal.loadProjects(subfuncionInput ? subfuncionInput.value.trim() : "");
        }
    });
}

const loadProjectState = {
    modal: null,
    subfunciones: [],
    activeSubfuncion: "",
    projects: []
};

function ensureLoadProjectModal() {
    if (loadProjectState.modal) return loadProjectState.modal;

    const modal = document.createElement("div");
    modal.id = "loadProjectModal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal-card load-project-modal-card">
            <div class="modal-header">
                <div>
                    <h3>Cargar proyecto desde base de datos</h3>
                    <p class="muted">Selecciona una carpeta y gestiona proyectos guardados.</p>
                </div>
                <button type="button" class="modal-close" aria-label="Cerrar">✕</button>
            </div>
            <div class="modal-body load-project-body">
                <div class="load-project-sidebar">
                    <h4>Carpetas guardadas</h4>
                    <div class="load-project-folder-list" id="loadProjectFolderList"></div>
                </div>
                <div class="load-project-main">
                    <div class="load-project-list" id="loadProjectList"></div>
                    <div class="load-project-status" id="loadProjectStatus"></div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector(".modal-close");
    const statusEl = modal.querySelector("#loadProjectStatus");
    const folderList = modal.querySelector("#loadProjectFolderList");
    const projectList = modal.querySelector("#loadProjectList");

    const setStatus = (msg, isError = true) => {
        if (!statusEl) return;
        statusEl.textContent = msg || "";
        statusEl.style.color = isError ? "#b91c1c" : "#15803d";
    };

    const formatDate = (raw) => {
        if (!raw) return "Sin fecha";
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return "Sin fecha";
        return parsed.toLocaleString("es-ES", {
            dateStyle: "medium",
            timeStyle: "short"
        });
    };

    const deleteProject = async (project) => {
        const currentUser = getCurrentAuthUserName();
        const owner = (project?.user || "").trim();
        if (!currentUser) {
            setStatus("Debes iniciar sesión para eliminar.");
            return;
        }
        if (!owner || currentUser !== owner) {
            setStatus("Solo el creador puede eliminar este registro.");
            return;
        }
        const confirmation = window.confirm(`¿Eliminar el proyecto "${project.proyecto || "Sin nombre"}"? Esta acción no se puede deshacer.`);
        if (!confirmation) return;
        try {
            setStatus("Eliminando proyecto...", false);
            const response = await fetch(`/api/project?id=${encodeURIComponent(project.id)}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ user: currentUser })
            });
            if (!response.ok) {
                throw new Error("Error al eliminar el proyecto.");
            }
            setStatus("Proyecto eliminado correctamente.", false);
            await loadProjects(loadProjectState.activeSubfuncion);
            await loadSubfunciones();
        } catch (error) {
            console.error(error);
            setStatus("No se pudo eliminar el proyecto.");
        }
    };

    const overwriteProject = async (project) => {
        const currentUser = getCurrentAuthUserName();
        const owner = (project?.user || "").trim();
        if (!currentUser) {
            setStatus("Debes iniciar sesión para sobrescribir.");
            return;
        }
        if (!owner || currentUser !== owner) {
            setStatus("Solo el creador puede sobrescribir este registro.");
            return;
        }
        const confirmation = window.confirm(`¿Sobrescribir el proyecto "${project.proyecto || "Sin nombre"}" con el contenido actual?`);
        if (!confirmation) return;

        const tesauros = (window.DataTesauro && Array.isArray(DataTesauro.campos)) ? DataTesauro.campos : [];
        const procedimiento = {
            proyecto: {
                nombre: project.proyecto || projectState.name || "",
                plantillas: projectState.templates.map((tpl) => ({
                    nombre: tpl.name,
                    tipo: normalizeTemplateType(tpl.type),
                    markdown: tpl.markdown
                })),
                plantillaActiva: getActiveTemplate() ? getActiveTemplate().name : ""
            },
            tesauros
        };

        try {
            setStatus("Sobrescribiendo proyecto...", false);
            const plantillaResumen = composePlantillaResumen();
            const response = await fetch("/api/projects", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    proyecto: project.proyecto,
                    plantilla: plantillaResumen,
                    user: currentUser,
                    subfuncion: project.subfuncion || "",
                    json: procedimiento,
                    overwrite: true
                })
            });
            if (!response.ok) {
                throw new Error("Error al sobrescribir.");
            }
            setProjectName(project.proyecto || "");
            setStatus("Proyecto sobrescrito correctamente.", false);
            modal.style.display = "none";
        } catch (error) {
            console.error(error);
            setStatus("No se pudo sobrescribir el proyecto.");
        }
    };

    const renderSubfunciones = () => {
        if (!folderList) return;
        folderList.innerHTML = "";
        if (!loadProjectState.subfunciones.length) {
            folderList.innerHTML = `<div class="muted">Sin carpetas guardadas.</div>`;
            return;
        }
        loadProjectState.subfunciones.forEach((subfuncion) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "load-project-folder-item";
            const label = subfuncion || "Sin carpeta";
            button.textContent = `📁 ${label}`;
            button.addEventListener("click", () => {
                loadProjectState.activeSubfuncion = label === "Sin carpeta" ? "" : label;
                renderSubfunciones();
                if (typeof modal.loadProjects === "function") {
                    modal.loadProjects(loadProjectState.activeSubfuncion);
                }
            });
            if (loadProjectState.activeSubfuncion === (label === "Sin carpeta" ? "" : label)) {
                button.classList.add("active");
            }
            folderList.appendChild(button);
        });
    };

    const renderProjects = () => {
        if (!projectList) return;
        projectList.innerHTML = "";
        if (!loadProjectState.projects.length) {
            projectList.innerHTML = `<div class="muted">No hay proyectos para esta carpeta.</div>`;
            return;
        }
        const currentUser = getCurrentAuthUserName();
        loadProjectState.projects.forEach((project) => {
            const row = document.createElement("div");
            row.className = "load-project-item";
            const meta = document.createElement("div");
            meta.className = "load-project-meta";
            const title = document.createElement("div");
            title.className = "load-project-title";
            title.textContent = project.proyecto || "Proyecto sin nombre";
            const details = document.createElement("div");
            details.className = "load-project-details";
            const author = project.user || "Sin autor";
            const dateLabel = formatDate(project.created_at);
            details.textContent = `Autor: ${author} · Guardado: ${dateLabel}`;
            meta.appendChild(title);
            meta.appendChild(details);

            const actions = document.createElement("div");
            actions.className = "load-project-actions";

            const loadBtn = document.createElement("button");
            loadBtn.type = "button";
            loadBtn.className = "load-project-action";
            loadBtn.textContent = "Cargar";
            loadBtn.addEventListener("click", async () => {
                try {
                    setStatus("Cargando proyecto...", false);
                    const response = await fetch(`/api/project?id=${encodeURIComponent(project.id)}`);
                    if (!response.ok) {
                        throw new Error("Error al cargar el proyecto.");
                    }
                    const data = await response.json();
                    let payload = data?.json;
                    if (typeof payload === "string") {
                        payload = JSON.parse(payload);
                    }
                    if (!payload || typeof payload !== "object") {
                        throw new Error("Proyecto inválido.");
                    }
                    applyProjectData(payload);
                    saveProjectState.loadedProject = {
                        id: project.id || null,
                        proyecto: project.proyecto || "",
                        subfuncion: project.subfuncion || "",
                        user: project.user || ""
                    };
                    saveProjectState.activeSubfuncion = project.subfuncion || "";
                    setStatus("Proyecto cargado correctamente.", false);
                    modal.style.display = "none";
                } catch (error) {
                    console.error(error);
                    setStatus("No se pudo cargar el proyecto.");
                }
            });
            actions.appendChild(loadBtn);

            const isOwner = currentUser && project.user && currentUser === project.user;
            if (isOwner) {
                const overwriteBtn = document.createElement("button");
                overwriteBtn.type = "button";
                overwriteBtn.className = "load-project-action load-project-action-overwrite";
                overwriteBtn.textContent = "Sobrescribir";
                overwriteBtn.addEventListener("click", () => overwriteProject(project));
                actions.appendChild(overwriteBtn);

                const deleteBtn = document.createElement("button");
                deleteBtn.type = "button";
                deleteBtn.className = "load-project-action load-project-action-delete";
                deleteBtn.textContent = "Eliminar";
                deleteBtn.addEventListener("click", () => deleteProject(project));
                actions.appendChild(deleteBtn);
            }

            row.appendChild(meta);
            row.appendChild(actions);
            projectList.appendChild(row);
        });
    };

    const loadSubfunciones = async () => {
        try {
            setStatus("Cargando subfunciones...", false);
            const response = await fetch("/api/subfunciones");
            if (!response.ok) {
                throw new Error("Error al cargar carpetas.");
            }
            const data = await response.json();
            loadProjectState.subfunciones = Array.isArray(data) ? data : [];
            if (!loadProjectState.activeSubfuncion && loadProjectState.subfunciones.length) {
                loadProjectState.activeSubfuncion = loadProjectState.subfunciones[0] || "";
            }
            renderSubfunciones();
            if (typeof modal.loadProjects === "function") {
                modal.loadProjects(loadProjectState.activeSubfuncion);
            }
            setStatus("");
        } catch (error) {
            console.error(error);
            setStatus("No se pudieron cargar las subfunciones.");
        }
    };

    const loadProjects = async (subfuncion = "") => {
        try {
            setStatus("Cargando proyectos...", false);
            const query = subfuncion ? `?subfuncion=${encodeURIComponent(subfuncion)}` : "";
            const response = await fetch(`/api/projects${query}`);
            if (!response.ok) {
                throw new Error("Error al cargar proyectos.");
            }
            const data = await response.json();
            loadProjectState.projects = Array.isArray(data) ? data : [];
            renderProjects();
            setStatus("");
        } catch (error) {
            console.error(error);
            setStatus("No se pudieron cargar los proyectos.");
        }
    };

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
    });

    modal.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            modal.style.display = "none";
        }
    });

    loadProjectState.modal = modal;
    modal.loadSubfunciones = loadSubfunciones;
    modal.loadProjects = loadProjects;
    modal.renderSubfunciones = renderSubfunciones;
    modal.renderProjects = renderProjects;
    return modal;
}

if (btnCargarProyecto) {
    btnCargarProyecto.addEventListener("click", () => {
        syncActiveTemplateMarkdown();
        const modal = ensureLoadProjectModal();
        modal.style.display = "flex";
        if (typeof modal.loadSubfunciones === "function") {
            modal.loadSubfunciones();
        }
    });
}

/* =======================================
   SISTEMA DE UNDO / REDO
   - Guarda todos los cambios de texto
   - Funciona con:
       · Teclado
       · Botones toolbar
       · Pegado "limpio" desde Word
======================================= */
const UndoManager = {
    undoStack: [],
    redoStack: [],
    lastValue: "",

    // Guarda un nuevo estado si ha cambiado
    push(newValue) {
        if (newValue === this.lastValue) return;
        this.undoStack.push(this.lastValue);
        this.lastValue = newValue;
        this.redoStack = [];
    },

    // Alias por compatibilidad (Tesauro, etc.)
    saveState() {
        this.push(markdownText.value);
    },

    undo() {
        if (this.undoStack.length === 0) return null;

        const prev = this.undoStack.pop();
        this.redoStack.push(this.lastValue);
        this.lastValue = prev;
        return prev;
    },

    redo() {
        if (this.redoStack.length === 0) return null;

        const next = this.redoStack.pop();
        this.undoStack.push(this.lastValue);
        this.lastValue = next;
        return next;
    }
};

// Estado inicial
UndoManager.lastValue = markdownText.value || "";

setTemplates([
    {
        name: "Plantilla 1",
        markdown: markdownText ? markdownText.value || "" : ""
    }
]);
if (projectNameInput && projectNameInput.value) {
    setProjectName(projectNameInput.value);
}

// Helper global (lo usan también otros scripts si quieren)
function pushUndoState() {
    UndoManager.push(markdownText.value);
}

// Registrar un cambio desde cualquier textarea (por ejemplo, inserciones programáticas)
function recordUndoAfterChange(targetTextarea) {
    const source = targetTextarea || markdownText;
    if (!source) return;

    const value = source.value;
    if (window.UndoManager && typeof UndoManager.push === "function") {
        UndoManager.push(value);
    } else if (typeof window.pushUndoState === "function") {
        pushUndoState();
    }
}

/* =======================================
   TOOLBAR → APLICAR FORMATO MARKDOWN
======================================= */
document.querySelectorAll("#toolbar button").forEach(btn => {
    btn.addEventListener("mousedown", e => e.preventDefault());
    btn.addEventListener("click", () => {
        const type = btn.dataset.md;
        applyMarkdownFormat(type);
        // Tras cambiar el texto, registramos el estado
        pushUndoState();
        updateHighlight();
    });
});

function applyMarkdownFormat(type) {
    const ta = markdownText;
    ta.focus();

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    let selected = ta.value.slice(start, end);
    let formatted = selected;

    function unformat(regex) {
        // Sustituye **texto** → texto (o equivalente)
        return selected.replace(regex, "$1");
    }

    switch (type) {

        // --- BOLD ---
        case "bold":
            if (/\*\*(.*?)\*\*/.test(selected)) {
                formatted = unformat(/\*\*(.*?)\*\*/g);
            } else {
                formatted = `**${selected}**`;
            }
            break;

        // --- ITALIC ---
        case "italic":
            if (/\*(.*?)\*/.test(selected)) {
                formatted = unformat(/\*(.*?)\*/g);
            } else {
                formatted = `*${selected}*`;
            }
            break;

        // --- UNDERLINE ---
        case "underline":
            if (/<u>(.*?)<\/u>/.test(selected)) {
                formatted = unformat(/<u>(.*?)<\/u>/g);
            } else {
                formatted = `<u>${selected}</u>`;
            }
            break;

        // --- H1 ---
        case "h1":
            if (selected.includes("# ")) {
                formatted = selected.replace(/# /g, "");
            } else {
                formatted = `# ${selected}`;
            }
            break;

        // --- H2 ---
        case "h2":
            if (selected.includes("## ")) {
                formatted = selected.replace(/## /g, "");
            } else {
                formatted = `## ${selected}`;
            }
            break;

        // --- UL ---
        case "ul":
            if (/- /.test(selected)) {
                formatted = selected.replace(/- /g, "");
            } else {
                formatted = `- ${selected}`;
            }
            break;

        // --- OL ---
        case "ol":
            if (/1\. /.test(selected)) {
                formatted = selected.replace(/1\. /g, "");
            } else {
                formatted = `1. ${selected}`;
            }
            break;

        // --- QUOTE ---
        case "quote":
            if (/^> /.test(selected) || /> /.test(selected)) {
                formatted = selected.replace(/^> /gm, "");
            } else {
                formatted = `> ${selected}`;
            }
            break;

        // --- CODE BLOCK ---
        case "code":
            if (/```([\s\S]*?)```/.test(selected)) {
                formatted = selected.replace(/```([\s\S]*?)```/g, "$1");
            } else {
                formatted = "```\n" + selected + "\n```";
            }
            break;

        // --- TABLE ---
        case "table":
            formatted = createMarkdownTable();
            break;

        // --- COLUMNS ---
        case "columns":
            openColumnsModal();
            return;
        case "columnsMulti":
            openMultiColumnsModal();
            return;
    }

    ta.setRangeText(formatted, start, end, "end");
}

/* =======================================
   CREAR TABLA MARKDOWN BÁSICA
======================================= */
function createMarkdownTable() {
    return (
`| Columna 1 | Columna 2 |
|----------|----------|
| Valor 1  | Valor 2  |
`
    );
}

/* =======================================
   MODAL DOBLE COLUMNA
======================================= */
const columnsModalState = {
    modal: null,
    selectionStart: 0,
    selectionEnd: 0,
    languageLeft: "es_ES",
    languageRight: "es_ES"
};

const columnsLanguageOptions = [
    { label: "Castellano", value: "es_ES" },
    { label: "Catalán", value: "ca_ES" },
    { label: "Balear", value: "ba_ES" },
    { label: "Valenciano", value: "va_ES" },
    { label: "Gallego", value: "gl_ES" },
    { label: "Euskera", value: "eu_ES" }
];

function buildLanguageOptions(selectedValue) {
    return columnsLanguageOptions
        .map(option => {
            const selected = option.value === selectedValue ? "selected" : "";
            return `<option value="${option.value}" ${selected}>${option.label}</option>`;
        })
        .join("");
}

function ensureColumnsModal() {
    if (columnsModalState.modal) return columnsModalState.modal;

    const modal = document.createElement("div");
    modal.id = "columnsModal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal-card columns-modal-card">
            <div class="modal-header">
                <h3>Insertar bloque de doble columna</h3>
                <button type="button" class="modal-close" aria-label="Cerrar">✕</button>
            </div>
            <div class="modal-body">
                <p style="margin:0;font-size:13px;color:#475569;">
                    Completa el contenido de cada columna. Se insertará con la sintaxis Gestiona Code.
                </p>
                <div class="columns-grid">
                    <label class="form-row">
                        <span>Columna izquierda</span>
                        <select id="columnsLeftLanguage" class="columns-language-select">
                            ${buildLanguageOptions(columnsModalState.languageLeft)}
                        </select>
                        <textarea id="columnsLeftInput" class="columns-textarea" placeholder="Contenido de la columna izquierda"></textarea>
                    </label>
                    <label class="form-row">
                        <span>Columna derecha</span>
                        <select id="columnsRightLanguage" class="columns-language-select">
                            ${buildLanguageOptions(columnsModalState.languageRight)}
                        </select>
                        <textarea id="columnsRightInput" class="columns-textarea" placeholder="Contenido de la columna derecha"></textarea>
                    </label>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" data-action="cancelar">Cancelar</button>
                    <button type="button" class="btn-secondary" data-action="switch">Intercambiar columnas</button>
                    <button type="button" class="btn-primary" data-action="insertar">Insertar columnas</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
        modal.style.display = "none";
    };

    const closeBtn = modal.querySelector(".modal-close");
    const cancelBtn = modal.querySelector("[data-action='cancelar']");
    const switchBtn = modal.querySelector("[data-action='switch']");
    const insertBtn = modal.querySelector("[data-action='insertar']");
    const leftLanguage = modal.querySelector("#columnsLeftLanguage");
    const rightLanguage = modal.querySelector("#columnsRightLanguage");
    const leftInput = modal.querySelector("#columnsLeftInput");
    const rightInput = modal.querySelector("#columnsRightInput");

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    if (switchBtn) switchBtn.addEventListener("click", () => swapColumnsInputs(modal));
    if (insertBtn) insertBtn.addEventListener("click", () => insertColumnsFromModal(modal));
    if (leftLanguage) {
        leftLanguage.addEventListener("change", () => {
            columnsModalState.languageLeft = leftLanguage.value;
            applyLanguageToColumnText(leftInput, leftLanguage);
        });
    }
    if (rightLanguage) {
        rightLanguage.addEventListener("change", () => {
            columnsModalState.languageRight = rightLanguage.value;
            applyLanguageToColumnText(rightInput, rightLanguage);
        });
    }
    if (leftInput) {
        leftInput.addEventListener("paste", (event) => {
            handleColumnsPaste(event, leftInput, leftLanguage);
        });
    }
    if (rightInput) {
        rightInput.addEventListener("paste", (event) => {
            handleColumnsPaste(event, rightInput, rightLanguage);
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.style.display === "flex") {
            closeModal();
        }
    });

    columnsModalState.modal = modal;
    return modal;
}

function swapColumnsInputs(modal) {
    const leftInput = modal.querySelector("#columnsLeftInput");
    const rightInput = modal.querySelector("#columnsRightInput");
    const leftLanguage = modal.querySelector("#columnsLeftLanguage");
    const rightLanguage = modal.querySelector("#columnsRightLanguage");
    if (!leftInput || !rightInput) return;

    const leftValue = leftInput.value;
    leftInput.value = rightInput.value;
    rightInput.value = leftValue;
    if (leftLanguage && rightLanguage) {
        const leftLang = leftLanguage.value;
        leftLanguage.value = rightLanguage.value;
        rightLanguage.value = leftLang;
        columnsModalState.languageLeft = leftLanguage.value;
        columnsModalState.languageRight = rightLanguage.value;
    }
    leftInput.focus();
}

function openColumnsModal() {
    const modal = ensureColumnsModal();
    const leftInput = modal.querySelector("#columnsLeftInput");
    const rightInput = modal.querySelector("#columnsRightInput");
    const leftLanguage = modal.querySelector("#columnsLeftLanguage");
    const rightLanguage = modal.querySelector("#columnsRightLanguage");

    const ta = markdownText;
    columnsModalState.selectionStart = ta.selectionStart || 0;
    columnsModalState.selectionEnd = ta.selectionEnd || 0;
    const selection = ta.value.slice(
        columnsModalState.selectionStart,
        columnsModalState.selectionEnd
    );

    const defaultLeft = "**COLUMNA 1**\nEste es el contenido de la columna 1";
    const defaultRight = "**COLUMNA 2**\nEste es el contenido de la columna 2";

    const matchedColumns = findColumnsBlockAtSelection(
        ta.value,
        columnsModalState.selectionStart,
        columnsModalState.selectionEnd
    );

    if (matchedColumns) {
        columnsModalState.selectionStart = matchedColumns.blockStart;
        columnsModalState.selectionEnd = matchedColumns.blockEnd;
    }

    if (leftInput) {
        leftInput.value = matchedColumns
            ? matchedColumns.left
            : selection
            ? selection
            : defaultLeft;
    }
    if (rightInput) {
        rightInput.value = matchedColumns ? matchedColumns.right : defaultRight;
    }
    if (leftLanguage) {
        leftLanguage.value = columnsModalState.languageLeft || "es_ES";
    }
    if (rightLanguage) {
        rightLanguage.value = columnsModalState.languageRight || "es_ES";
    }

    modal.style.display = "flex";
    if (leftInput) leftInput.focus();
}

function findColumnsBlockAtSelection(content, selectionStart, selectionEnd) {
    if (!content) return null;
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    const matcher = /\[columns:block\]([\s\S]*?)\[columns:split\]([\s\S]*?)\[columns\]/g;
    let match;

    while ((match = matcher.exec(content)) !== null) {
        const blockStart = match.index;
        const blockEnd = blockStart + match[0].length;
        const isCursorInside = start === end && start >= blockStart && start <= blockEnd;
        const isSelectionOverlapping = start !== end && start <= blockEnd && end >= blockStart;

        if (isCursorInside || isSelectionOverlapping) {
            return {
                left: normalizeColumnsCapturedValue(match[1]),
                right: normalizeColumnsCapturedValue(match[2]),
                blockStart,
                blockEnd
            };
        }
    }

    return null;
}

function normalizeColumnsCapturedValue(value) {
    return value.replace(/^\n+|\n+$/g, "");
}

function normalizeColumnContent(value, fallback) {
    const trimmed = value.trim();
    return trimmed ? trimmed : fallback;
}

function updateLanguageForThesaurusText(text, languageCode, onlyMissing) {
    if (!languageCode) return text;
    return text.replace(/\{\{\s*(personalized|function)\b[\s\S]*?\}\}/gi, (match) => {
        if (!/reference\s*:/i.test(match)) return match;
        if (onlyMissing && /language\s*:/i.test(match)) return match;
        if (/language\s*:/i.test(match)) {
            return match.replace(/language\s*:\s*[\w-]+/i, `language: ${languageCode}`);
        }
        return match.replace(/\s*\}\}\s*$/, ` | language: ${languageCode}}}`);
    });
}

function handleColumnsPaste(event, textarea, languageSelect) {
    if (!event.clipboardData || !textarea) return;
    const languageCode = languageSelect ? languageSelect.value : "";
    if (!languageCode) return;
    const plain = event.clipboardData.getData("text/plain");
    if (!plain) return;
    const enriched = updateLanguageForThesaurusText(plain, languageCode, true);
    if (enriched === plain) return;
    event.preventDefault();
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || start;
    textarea.setRangeText(enriched, start, end, "end");
}

function applyLanguageToColumnText(textarea, languageSelect) {
    if (!textarea || !languageSelect) return;
    const languageCode = languageSelect.value;
    if (!languageCode) return;
    const updated = updateLanguageForThesaurusText(textarea.value, languageCode, false);
    if (updated !== textarea.value) {
        textarea.value = updated;
    }
}

function insertColumnsFromModal(modal) {
    const ta = markdownText;
    const leftInput = modal.querySelector("#columnsLeftInput");
    const rightInput = modal.querySelector("#columnsRightInput");

    const leftValue = normalizeColumnContent(
        leftInput ? leftInput.value : "",
        "**COLUMNA 1**\nEste es el contenido de la columna 1"
    );
    const rightValue = normalizeColumnContent(
        rightInput ? rightInput.value : "",
        "**COLUMNA 2**\nEste es el contenido de la columna 2"
    );

    const block = `[columns:block]\n${leftValue}\n[columns:split]\n${rightValue}\n[columns]`;

    const start = columnsModalState.selectionStart || 0;
    const end = columnsModalState.selectionEnd || start;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);

    ta.value = before + block + after;
    const cursorPos = before.length + block.length;
    ta.selectionStart = cursorPos;
    ta.selectionEnd = cursorPos;
    ta.focus();

    recordUndoAfterChange(ta);
    updateHighlight();

    modal.style.display = "none";
}

/* =======================================
   MODAL DOBLE COLUMNA MULTIPÁRRAFO
======================================= */
const columnsMultiModalState = {
    modal: null,
    selectionStart: 0,
    selectionEnd: 0,
    languageLeft: "es_ES",
    languageRight: "es_ES",
    rows: []
};

function ensureMultiColumnsModal() {
    if (columnsMultiModalState.modal) return columnsMultiModalState.modal;

    const modal = document.createElement("div");
    modal.id = "columnsMultiModal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal-card columns-modal-card columns-multi-modal-card">
            <div class="modal-header">
                <div>
                    <h3>Insertar bloque de doble columna multipárrafo</h3>
                    <p class="muted">Cada párrafo se gestiona en filas separadas manteniendo la distribución izquierda/derecha.</p>
                </div>
                <button type="button" class="modal-close" aria-label="Cerrar">✕</button>
            </div>
            <div class="modal-body">
                <div class="columns-language-bar">
                    <label class="form-row">
                        <span>Idioma columna izquierda</span>
                        <select id="columnsMultiLeftLanguage" class="columns-language-select">
                            ${buildLanguageOptions(columnsMultiModalState.languageLeft)}
                        </select>
                    </label>
                    <label class="form-row">
                        <span>Idioma columna derecha</span>
                        <select id="columnsMultiRightLanguage" class="columns-language-select">
                            ${buildLanguageOptions(columnsMultiModalState.languageRight)}
                        </select>
                    </label>
                </div>
                <div id="columnsMultiRows" class="columns-multi-rows"></div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" data-action="cancelar">Cancelar</button>
                    <button type="button" class="btn-secondary" data-action="add-row">Añadir párrafo</button>
                    <button type="button" class="btn-primary" data-action="insertar">Insertar columnas</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
        modal.style.display = "none";
    };

    const closeBtn = modal.querySelector(".modal-close");
    const cancelBtn = modal.querySelector("[data-action='cancelar']");
    const addRowBtn = modal.querySelector("[data-action='add-row']");
    const insertBtn = modal.querySelector("[data-action='insertar']");
    const leftLanguage = modal.querySelector("#columnsMultiLeftLanguage");
    const rightLanguage = modal.querySelector("#columnsMultiRightLanguage");

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    if (addRowBtn) addRowBtn.addEventListener("click", () => addMultiColumnsRow(modal));
    if (insertBtn) insertBtn.addEventListener("click", () => insertMultiColumnsFromModal(modal));
    if (leftLanguage) {
        leftLanguage.addEventListener("change", () => {
            columnsMultiModalState.languageLeft = leftLanguage.value;
            applyLanguageToMultiColumns(modal, "left", leftLanguage.value);
        });
    }
    if (rightLanguage) {
        rightLanguage.addEventListener("change", () => {
            columnsMultiModalState.languageRight = rightLanguage.value;
            applyLanguageToMultiColumns(modal, "right", rightLanguage.value);
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.style.display === "flex") {
            closeModal();
        }
    });

    columnsMultiModalState.modal = modal;
    return modal;
}

function openMultiColumnsModal() {
    const modal = ensureMultiColumnsModal();
    const ta = markdownText;

    columnsMultiModalState.selectionStart = ta.selectionStart || 0;
    columnsMultiModalState.selectionEnd = ta.selectionEnd || 0;
    const selection = ta.value.slice(
        columnsMultiModalState.selectionStart,
        columnsMultiModalState.selectionEnd
    );

    const defaultLeft = "**COLUMNA 1**\nEste es el contenido de la columna 1";
    const defaultRight = "**COLUMNA 2**\nEste es el contenido de la columna 2";

    const matchedBlocks = findColumnsBlocksInRange(
        ta.value,
        columnsMultiModalState.selectionStart,
        columnsMultiModalState.selectionEnd
    );

    if (matchedBlocks.length > 0) {
        columnsMultiModalState.selectionStart = matchedBlocks[0].blockStart;
        columnsMultiModalState.selectionEnd = matchedBlocks[matchedBlocks.length - 1].blockEnd;
    }

    let rows = [];

    if (matchedBlocks.length > 0) {
        matchedBlocks.forEach((block) => {
            const leftParagraphs = splitColumnsParagraphs(block.left);
            const rightParagraphs = splitColumnsParagraphs(block.right);
            const maxLength = Math.max(leftParagraphs.length, rightParagraphs.length, 1);

            for (let i = 0; i < maxLength; i += 1) {
                rows.push({
                    left: leftParagraphs[i] || "",
                    right: rightParagraphs[i] || ""
                });
            }
        });
    } else if (selection.trim()) {
        const selectionParagraphs = splitColumnsParagraphs(selection);
        rows = selectionParagraphs.map((paragraph) => ({
            left: paragraph,
            right: ""
        }));
    } else {
        rows = [{ left: defaultLeft, right: defaultRight }];
    }

    if (rows.length === 0) {
        rows = [{ left: defaultLeft, right: defaultRight }];
    }

    columnsMultiModalState.rows = rows;

    renderMultiColumnsRows(modal, rows);

    const leftLanguage = modal.querySelector("#columnsMultiLeftLanguage");
    const rightLanguage = modal.querySelector("#columnsMultiRightLanguage");
    if (leftLanguage) {
        leftLanguage.value = columnsMultiModalState.languageLeft || "es_ES";
    }
    if (rightLanguage) {
        rightLanguage.value = columnsMultiModalState.languageRight || "es_ES";
    }

    modal.style.display = "flex";
    const firstTextarea = modal.querySelector(".columns-multi-textarea");
    if (firstTextarea) firstTextarea.focus();
}

function renderMultiColumnsRows(modal, rows) {
    const container = modal.querySelector("#columnsMultiRows");
    if (!container) return;

    container.innerHTML = rows
        .map((row, index) => {
            const rowNumber = index + 1;
            return `
                <div class="columns-multi-row" data-index="${index}">
                    <label class="form-row">
                        <span>Columna izquierda · Párrafo ${rowNumber}</span>
                        <textarea class="columns-textarea columns-multi-textarea" data-column="left" placeholder="Contenido párrafo izquierda">${row.left || ""}</textarea>
                    </label>
                    <label class="form-row">
                        <span>Columna derecha · Párrafo ${rowNumber}</span>
                        <textarea class="columns-textarea columns-multi-textarea" data-column="right" placeholder="Contenido párrafo derecha">${row.right || ""}</textarea>
                    </label>
                </div>
            `;
        })
        .join("");

    attachMultiColumnsTextareaHandlers(modal);
}

function addMultiColumnsRow(modal) {
    const existingRows = collectMultiColumnsRows(modal, true);
    const newRow = { left: "", right: "" };
    columnsMultiModalState.rows = [...existingRows, newRow];
    renderMultiColumnsRows(modal, columnsMultiModalState.rows);
}

function attachMultiColumnsTextareaHandlers(modal) {
    const leftLanguage = modal.querySelector("#columnsMultiLeftLanguage");
    const rightLanguage = modal.querySelector("#columnsMultiRightLanguage");

    modal.querySelectorAll(".columns-multi-textarea").forEach((textarea) => {
        const column = textarea.dataset.column;
        const languageSelect = column === "left" ? leftLanguage : rightLanguage;
        textarea.addEventListener("paste", (event) => {
            handleColumnsPaste(event, textarea, languageSelect);
        });
    });
}

function applyLanguageToMultiColumns(modal, column, languageCode) {
    if (!modal || !languageCode) return;
    const selector = `.columns-multi-textarea[data-column='${column}']`;
    modal.querySelectorAll(selector).forEach((textarea) => {
        const updated = updateLanguageForThesaurusText(textarea.value, languageCode, false);
        if (updated !== textarea.value) {
            textarea.value = updated;
        }
    });
}

function collectMultiColumnsRows(modal, keepEmpty = false) {
    const rows = [];
    modal.querySelectorAll(".columns-multi-row").forEach((row) => {
        const leftInput = row.querySelector(".columns-multi-textarea[data-column='left']");
        const rightInput = row.querySelector(".columns-multi-textarea[data-column='right']");
        const leftValue = leftInput ? leftInput.value.trim() : "";
        const rightValue = rightInput ? rightInput.value.trim() : "";
        if (!keepEmpty && !leftValue && !rightValue) return;
        rows.push({ left: leftValue, right: rightValue });
    });
    return rows;
}

function insertMultiColumnsFromModal(modal) {
    const ta = markdownText;
    const rows = collectMultiColumnsRows(modal);
    const defaultLeft = "**COLUMNA 1**\nEste es el contenido de la columna 1";
    const defaultRight = "**COLUMNA 2**\nEste es el contenido de la columna 2";
    const safeRows = rows.length ? rows : [{ left: defaultLeft, right: defaultRight }];

    const blocks = safeRows.map((row) => {
        const leftValue = row.left || "";
        const rightValue = row.right || "";
        return `[columns:block]\n${leftValue}\n[columns:split]\n${rightValue}\n[columns]`;
    });

    const blockText = blocks.join("\n\n");

    const start = columnsMultiModalState.selectionStart || 0;
    const end = columnsMultiModalState.selectionEnd || start;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);

    ta.value = before + blockText + after;
    const cursorPos = before.length + blockText.length;
    ta.selectionStart = cursorPos;
    ta.selectionEnd = cursorPos;
    ta.focus();

    recordUndoAfterChange(ta);
    updateHighlight();

    modal.style.display = "none";
}

function splitColumnsParagraphs(text) {
    if (!text) return [];
    return text
        .replace(/\r\n/g, "\n")
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
}

function findColumnsBlocksInRange(content, selectionStart, selectionEnd) {
    if (!content) return [];
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    const matcher = /\[columns:block\]([\s\S]*?)\[columns:split\]([\s\S]*?)\[columns\]/g;
    const matches = [];
    let match;

    while ((match = matcher.exec(content)) !== null) {
        const blockStart = match.index;
        const blockEnd = blockStart + match[0].length;
        const isCursorInside = start === end && start >= blockStart && start <= blockEnd;
        const isSelectionOverlapping = start !== end && start <= blockEnd && end >= blockStart;

        if (isCursorInside || isSelectionOverlapping) {
            matches.push({
                left: normalizeColumnsCapturedValue(match[1]),
                right: normalizeColumnsCapturedValue(match[2]),
                blockStart,
                blockEnd
            });
        }
    }

    return matches;
}

/* =======================================
   MENÚ CONTEXTUAL: DOBLE COLUMNA
======================================= */
const columnsContextMenuState = {
    menu: null
};

function ensureColumnsContextMenu() {
    if (columnsContextMenuState.menu) return columnsContextMenuState.menu;

    const menu = document.createElement("div");
    menu.id = "columnsContextMenu";
    menu.className = "context-menu";
    menu.innerHTML = `
        <button type="button" class="context-menu-item" data-action="columns">
            🧱 Convertir a doble columna
        </button>
    `;

    document.body.appendChild(menu);

    menu.addEventListener("click", (event) => {
        const action = event.target && event.target.dataset ? event.target.dataset.action : null;
        if (action === "columns") {
            closeColumnsContextMenu();
            openColumnsModal();
        }
    });

    columnsContextMenuState.menu = menu;
    return menu;
}

function closeColumnsContextMenu() {
    if (columnsContextMenuState.menu) {
        columnsContextMenuState.menu.style.display = "none";
    }
}

function positionColumnsContextMenu(menu, x, y) {
    const rect = menu.getBoundingClientRect();
    const padding = 12;
    const maxX = window.innerWidth - rect.width - padding;
    const maxY = window.innerHeight - rect.height - padding;
    const left = Math.min(x, maxX);
    const top = Math.min(y, maxY);

    menu.style.left = `${Math.max(padding, left)}px`;
    menu.style.top = `${Math.max(padding, top)}px`;
}

markdownText.addEventListener("contextmenu", (event) => {
    const selection = markdownText.value.slice(
        markdownText.selectionStart,
        markdownText.selectionEnd
    );
    if (!selection.trim()) return;

    event.preventDefault();

    const menu = ensureColumnsContextMenu();
    menu.style.display = "block";
    positionColumnsContextMenu(menu, event.clientX, event.clientY);
});

document.addEventListener("click", (event) => {
    if (!columnsContextMenuState.menu) return;
    if (columnsContextMenuState.menu.style.display !== "block") return;
    if (columnsContextMenuState.menu.contains(event.target)) return;
    closeColumnsContextMenu();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeColumnsContextMenu();
    }
});

window.addEventListener("scroll", () => closeColumnsContextMenu(), true);
window.addEventListener("resize", () => closeColumnsContextMenu());

/* =======================================
   BOTONES LATERALES
======================================= */

const csvExportState = {
    tipo: "formulario",
    entidad: "",
    actividad: "",
    procedimiento: "",
    tipoTarea: "",
    nombreTarea: "",
    grupo: "",
    tituloDocumento: "",
    tipoDocumentalDocumento: ""
};

const csvHeaders = [
    "Nombre Entidad",
    "Nombre Actividad",
    "Nombre Procedimiento",
    "Sobrescribir",
    "Tipo Tarea",
    "Nombre Tarea",
    "Días Alerta",
    "Tipo de días",
    "Prioritario",
    "Descripción Tarea",
    "Asignado a Usuario - Nombre",
    "Asignado a Grupo - Nombre",
    "Asignado a responsables exp",
    "Asignado a unidad gestora",
    "Asignado a Usuario - Abre Tarea",
    "Asignado a Usuario - Abre Exp",
    "Permite reasignar",
    "Inicio Inmediato",
    "Condición inicio inmediato",
    "Nombre tesauro",
    "Condición tesauro",
    "Valor tesauro",
    "Inicio manual",
    "Acceso temporal Expediente",
    "Plazo Trámite",
    "Plazo Justificante",
    "Tipo documental",
    "Tipo Circuito Resolución",
    "Nombre Circuito Resolución",
    "Órgano Circuito Resolución",
    "Cambiar estado",
    "Nombre Nuevo Estado",
    "Generar plantilla",
    "Formato plantilla",
    "Cargar documento",
    "Circuito documento",
    "Titulo documento",
    "Tipo documental documento",
    "Texto plantilla",
    "Eliminar",
    "Finalizar en plazo",
    "Plazo - Número de días",
    "Plazo - Tipo de días"
];

function escapeCsvValue(value) {
    const normalized = (value ?? "").toString().replace(/\r\n/g, "\n");
    const escaped = normalized.replace(/"/g, '""');
    return `"${escaped}"`;
}

let csvExportModal = null;

function toggleCsvDocFields(modal, tipoValor) {
    const docSections = modal.querySelectorAll(".csv-doc-only");
    const isDocumento = tipoValor === "documento";
    docSections.forEach(section => {
        section.style.display = isDocumento ? "grid" : "none";
        section.querySelectorAll("input").forEach(input => {
            if (!isDocumento) input.value = "";
            input.disabled = !isDocumento;
        });
    });
}

function ensureCsvExportModal() {
    if (csvExportModal) return csvExportModal;

    const modal = document.createElement("div");
    modal.id = "csvExportModal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal-card csv-export-card">
            <div class="modal-header">
                <h3>Exportar a CSV</h3>
                <button type="button" class="modal-close" aria-label="Cerrar">✕</button>
            </div>
            <form id="csvExportForm" class="modal-body">
                <div class="form-grid">
                    <label class="form-row">
                        <span>Tipo de exportación</span>
                        <select id="csvExpTipo" name="tipo" required>
                            <option value="formulario">Formulario</option>
                            <option value="documento">Documento</option>
                        </select>
                    </label>
                    <label class="form-row">
                        <span>Nombre entidad</span>
                        <input id="csvExpEntidad" name="entidad" type="text" required />
                    </label>
                    <label class="form-row">
                        <span>Nombre actividad</span>
                        <input id="csvExpActividad" name="actividad" type="text" required />
                    </label>
                    <label class="form-row">
                        <span>Nombre procedimiento</span>
                        <input id="csvExpProcedimiento" name="procedimiento" type="text" required />
                    </label>
                    <label class="form-row">
                        <span>Tipo de tarea</span>
                        <input id="csvExpTipoTarea" name="tipoTarea" type="text" required />
                    </label>
                    <label class="form-row">
                        <span>Nombre de la tarea</span>
                        <input id="csvExpNombreTarea" name="nombreTarea" type="text" required />
                    </label>
                    <label class="form-row">
                        <span>Asignado a Grupo - Nombre</span>
                        <input id="csvExpGrupo" name="grupo" type="text" required />
                    </label>
                </div>

                <div class="form-grid csv-doc-only">
                    <label class="form-row">
                        <span>Título del documento</span>
                        <input id="csvExpTituloDoc" name="tituloDocumento" type="text" />
                    </label>
                    <label class="form-row">
                        <span>Tipo documental del documento</span>
                        <input id="csvExpTipoDoc" name="tipoDocumentalDocumento" type="text" />
                    </label>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn-secondary" data-action="cancelar">Cancelar</button>
                    <button type="submit" class="btn-primary">Exportar CSV</button>
                </div>
            </form>
        </div>
    `;

    const form = modal.querySelector("#csvExportForm");
    const closeBtn = modal.querySelector(".modal-close");
    const cancelBtn = modal.querySelector("[data-action='cancelar']");
    const tipoSelect = modal.querySelector("#csvExpTipo");

    function closeModal() {
        modal.style.display = "none";
    }

    function syncDocFields() {
        const tipoValor = (tipoSelect.value || "formulario").toLowerCase();
        toggleCsvDocFields(modal, tipoValor);
    }

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    if (tipoSelect) tipoSelect.addEventListener("change", syncDocFields);

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const tipo = (formData.get("tipo") || "formulario").toString().toLowerCase();

            csvExportState.tipo = tipo === "documento" ? "documento" : "formulario";
            csvExportState.entidad = (formData.get("entidad") || "").toString().trim();
            csvExportState.actividad = (formData.get("actividad") || "").toString().trim();
            csvExportState.procedimiento = (formData.get("procedimiento") || "").toString().trim();
            csvExportState.tipoTarea = (formData.get("tipoTarea") || "").toString().trim();
            csvExportState.nombreTarea = (formData.get("nombreTarea") || "").toString().trim();
            csvExportState.grupo = (formData.get("grupo") || "").toString().trim();
            csvExportState.tituloDocumento = (formData.get("tituloDocumento") || "").toString().trim();
            csvExportState.tipoDocumentalDocumento = (formData.get("tipoDocumentalDocumento") || "").toString().trim();

            if (window.TesauroManager) {
                TesauroManager.exportEntidad = csvExportState.entidad;
                TesauroManager.exportActividad = csvExportState.actividad;
            }

            generateCsvFromState(csvExportState);
            closeModal();
        });
    }

    csvExportModal = modal;
    document.body.appendChild(csvExportModal);
    syncDocFields();
    return csvExportModal;
}

function fillExportDefaults(modal) {
    const entidadDefault = csvExportState.entidad || (window.TesauroManager ? TesauroManager.exportEntidad : "") || "";
    const actividadDefault = csvExportState.actividad || (window.TesauroManager ? TesauroManager.exportActividad : "") || "";

    const tipoSelect = modal.querySelector("#csvExpTipo");
    const entidadInput = modal.querySelector("#csvExpEntidad");
    const actividadInput = modal.querySelector("#csvExpActividad");
    const procedimientoInput = modal.querySelector("#csvExpProcedimiento");
    const tipoTareaInput = modal.querySelector("#csvExpTipoTarea");
    const nombreTareaInput = modal.querySelector("#csvExpNombreTarea");
    const grupoInput = modal.querySelector("#csvExpGrupo");
    const tituloDocInput = modal.querySelector("#csvExpTituloDoc");
    const tipoDocInput = modal.querySelector("#csvExpTipoDoc");

    if (tipoSelect) tipoSelect.value = csvExportState.tipo || "formulario";
    if (entidadInput) entidadInput.value = entidadDefault;
    if (actividadInput) actividadInput.value = actividadDefault;
    if (procedimientoInput) procedimientoInput.value = csvExportState.procedimiento || "";
    if (tipoTareaInput) tipoTareaInput.value = csvExportState.tipoTarea || "";
    if (nombreTareaInput) nombreTareaInput.value = csvExportState.nombreTarea || "";
    if (grupoInput) grupoInput.value = csvExportState.grupo || "";
    if (tituloDocInput) tituloDocInput.value = csvExportState.tituloDocumento || "";
    if (tipoDocInput) tipoDocInput.value = csvExportState.tipoDocumentalDocumento || "";

    toggleCsvDocFields(modal, (tipoSelect?.value || "formulario").toLowerCase());
}

function generateCsvFromState(state) {
    const isDocumento = state.tipo === "documento";
    const markdownContent = (markdownText && markdownText.value) ? markdownText.value : "";

    const rowValues = [
        state.entidad,
        state.actividad,
        state.procedimiento,
        "Sí",
        state.tipoTarea,
        state.nombreTarea,
        "",
        "",
        "No",
        "",
        "",
        state.grupo,
        "",
        "",
        "",
        "",
        "No",
        "No",
        "",
        "",
        "",
        "",
        "No",
        "No",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "No",
        "Sí",
        isDocumento ? "PDF" : "",
        isDocumento ? "Sí" : "",
        "",
        isDocumento ? state.tituloDocumento : "",
        isDocumento ? state.tipoDocumentalDocumento : "",
        markdownContent,
        "No",
        "",
        "",
        ""
    ];

    const csvRow = rowValues.map(escapeCsvValue).join(";");
    const csvContent = `${csvHeaders.join(";")}\r\n${csvRow}`;
    const bom = "\uFEFF";
    const blob = new Blob([bom, csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "export_markdown.csv";
    a.click();
    URL.revokeObjectURL(url);
}

function openCsvExportModal() {
    const modal = ensureCsvExportModal();
    fillExportDefaults(modal);
    modal.style.display = "flex";
}

if (btnExportCsv) {
    btnExportCsv.addEventListener("click", () => {
        openCsvExportModal();
    });
}

if (btnValidarTesauros) {
    btnValidarTesauros.addEventListener("click", () => {
        if (window.TesauroManager && typeof TesauroManager.openProjectTesauroValidationModal === "function") {
            TesauroManager.openProjectTesauroValidationModal();
            return;
        }
        alert("El gestor de tesauros no está disponible ahora mismo.");
    });
}

btnNuevo.addEventListener("click", () => {
    markdownText.value = "";
    saveProjectState.loadedProject = null;
    pushUndoState();
    updateHighlight();
});

btnPegarAuto.addEventListener("click", async () => {
    const text = await navigator.clipboard.readText();
    markdownText.value += text;
    pushUndoState();
    updateHighlight();
});

btnCopiar.addEventListener("click", () => {
    navigator.clipboard.writeText(markdownText.value);
});

btnDescargar.addEventListener("click", () => {
    const blob = new Blob([markdownText.value], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "documento.md";
    a.click();
    URL.revokeObjectURL(url);
});

/* =======================================
   PEGADO DESDE WORD → LIMPIEZA + MARKDOWN
======================================= */
markdownText.addEventListener("paste", (e) => {
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");

    // Si no viene en HTML → pegar normal
    if (!html) return;

    // Detectar si viene de Word
    const isWord = html.includes("Mso") || html.includes("<w:") || html.includes("class=Mso");
    if (!isWord) return; // pegar normal si no es Word

    e.preventDefault();

    const cleanedHTML = cleanWordHTML(html);
    const temp = document.createElement("div");
    temp.innerHTML = cleanedHTML;

    let md = htmlToMarkdown(temp);

    // Insertar en el textarea
    const ta = markdownText;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    ta.setRangeText(md, start, end, "end");
    pushUndoState();
    updateHighlight();
});

/* =======================================
   HTML → MARKDOWN
======================================= */
function htmlToMarkdown(root) {
    let md = "";

    function process(node) {

        // Texto simple
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent.replace(/\s+/g, " ");
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return "";

        const tag = node.tagName.toLowerCase();
        let content = [...node.childNodes].map(process).join("");

        switch (tag) {

            case "b":
            case "strong":
                return `**${content.trim()}**`;

            case "i":
            case "em":
                return `*${content.trim()}*`;

            case "u":
                return `<u>${content.trim()}</u>`; // Markdown no soporta subrayado

            case "h1":
                return `\n# ${content}\n\n`;

            case "h2":
                return `\n## ${content}\n\n`;

            case "h3":
                return `\n### ${content}\n\n`;

            case "p":
            case "div":
                return `\n${content}\n`;

            case "br":
                return "\n";

            case "ul":
                return (
                    "\n" +
                    [...node.querySelectorAll(":scope > li")]
                        .map(li => `- ${process(li).trim()}`)
                        .join("\n") +
                    "\n"
                );

            case "ol":
                let n = 1;
                return (
                    "\n" +
                    [...node.querySelectorAll(":scope > li")]
                        .map(li => `${n++}. ${process(li).trim()}`)
                        .join("\n") +
                    "\n"
                );

            case "li":
                return content.trim();

            case "table":
                return convertTableToMarkdown(node);

            default:
                return content;
        }
    }

    md = process(root);

    // Limpieza final
    md = md
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]+/g, " ")
        .trim();

    return md + "\n";
}

function convertTableToMarkdown(tbl) {
    const rows = [...tbl.querySelectorAll("tr")];
    if (rows.length === 0) return "";

    let out = "\n";

    rows.forEach((tr, i) => {
        const cells = [...tr.querySelectorAll("td,th")].map(td =>
            td.innerText.trim().replace(/\n+/g, " ")
        );
        out += `| ${cells.join(" | ")} |\n`;

        if (i === 0) {
            out += "|" + cells.map(() => "---").join("|") + "|\n";
        }
    });

    return out + "\n";
}

function cleanWordHTML(html) {

    // 1) Eliminar comentarios Word <!-- ... -->
    html = html.replace(/<!--[\s\S]*?-->/g, "");

    // 2) Eliminar bloques <style> completos
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

    // 3) Eliminar cosas tipo <xml> de Word
    html = html.replace(/<xml[^>]*>[\s\S]*?<\/xml>/gi, "");

    // 4) Eliminar @font-face
    html = html.replace(/@font-face[^}]*}/gi, "");

    // 5) Eliminar atributos mso-*
    html = html.replace(/mso-[^:;"']+:[^;"']+;?/gi, "");

    // 6) Eliminar atributos style por completo (Word siempre mete basura ahí)
    html = html.replace(/style="[^"]*"/gi, "");

    // 7) Eliminar clases Mso pero NO el contenido
    html = html.replace(/class="[^"]*Mso[^"]*"/gi, "");

    // 8) Mantener span y div, solo quitar atributos
    html = html.replace(/<span[^>]*>/gi, "<span>");
    html = html.replace(/<div[^>]*>/gi, "<div>");

    // 9) Normalizar saltos Word dentro de <p>
    html = html.replace(/<p>\s*<\/p>/gi, "");

    // 10) Eliminar <meta>, <link>, <head>, <title>, <script>
    html = html.replace(/<\/?(meta|link|head|title|script)[^>]*>/gi, "");

    // 11) Mantener solo body si existe
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) html = bodyMatch[1];

    // 12) Asteriscos automáticos de Word → eliminarlos
    html = html.replace(/^\*\s*/gm, "");

    return html.trim();
}

function plainTextTableToMarkdown(plain) {
    const lines = plain.trim().split(/\r?\n/);

    // Dividir cada línea por 2+ espacios consecutivos
    const rows = lines.map(line =>
        line.split(/ {2,}/).map(c => c.trim()).filter(Boolean)
    );

    let md = "";

    rows.forEach((cells, i) => {
        md += "| " + cells.join(" | ") + " |\n";
        if (i === 0) {
            md += "|" + cells.map(() => "---").join("|") + "|\n";
        }
    });

    return "\n" + md + "\n";
}

/* ============================================================
   RESALTADO VISUAL TESAUROS / SECTIONS
============================================================ */
const highlighter = document.createElement("div");
highlighter.id = "mdHighlighter";

// ⭐ NUEVO: estado de toggles
let highlightSections = true; // amarillo / rojo
let highlightTesauros = true; // verde
let highlightLet       = true;
let highlightColumns   = true;
let selectedReferenceKey = null;
const miniMapState = {
    enabled: true,
    container: null,
    base: null,
    content: null,
    viewport: null,
    scale: 1,
    interactionsReady: false,
    isDragging: false,
    isViewportDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    viewportDragOffsetY: 0,
    resizeObserver: null
};

function escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeAttr(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function buildReferenceKey(kind, ref) {
    if (!kind || !ref) return null;
    return kind.toLowerCase() + "." + ref.trim().toLowerCase();
}

function getReferenceAtSelection(text, selectionStart, selectionEnd) {
    const start = Math.min(selectionStart || 0, selectionEnd || 0);
    const end = Math.max(selectionStart || 0, selectionEnd || 0);
    const overlaps = (mStart, mEnd) => Math.max(start, mStart) <= Math.min(end, mEnd);

    const findMatch = (regex, extractor) => {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const mStart = match.index;
            const mEnd = match.index + match[0].length;
            if (overlaps(mStart, mEnd)) {
                return extractor(match);
            }
        }
        return null;
    };

    const tesauroRef = findMatch(
        /\{\{\s*(personalized|function)\s*\|\s*reference\s*:[^}]+\}\}/gi,
        (m) => {
            const refMatch = m[0].match(/reference\s*:\s*([^}|]+)\s*\}\}/i);
            const ref = refMatch ? refMatch[1].trim() : "";
            return buildReferenceKey(m[1], ref);
        }
    );
    if (tesauroRef) return tesauroRef;

    const letRef = findMatch(/\{\{\s*let\b[^}]*\}\}/gi, (m) => {
        const refMatch = m[0].match(/reference\s*:\s*([^|}]+)/i);
        if (!refMatch) return null;
        const rawRef = refMatch[1].trim();
        let kind = "personalized";
        let ref = rawRef;
        const dot = rawRef.indexOf(".");
        if (dot !== -1) {
            kind = rawRef.slice(0, dot).trim();
            ref = rawRef.slice(dot + 1).trim();
        }
        return buildReferenceKey(kind, ref);
    });
    if (letRef) return letRef;

    const definitionRef = findMatch(/\{\{\s*definition\b[^}]*\}\}/gi, (m) => {
        const refMatch = m[0].match(/reference\s*:\s*([^|}]+)/i);
        if (!refMatch) return null;
        const ref = refMatch[1].trim();
        return buildReferenceKey("variable", ref);
    });
    if (definitionRef) return definitionRef;

    const sectionRef = findMatch(/\bpersonalized\.([A-Za-z0-9_]+)\b/gi, (m) =>
        buildReferenceKey("personalized", m[1])
    );
    if (sectionRef) return sectionRef;

    const variableRef = findMatch(/\bvariable\.([A-Za-z0-9_]+)\b/gi, (m) =>
        buildReferenceKey("variable", m[1])
    );
    if (variableRef) return variableRef;

    return null;
}

function updateSelectedReference() {
    const current = getReferenceAtSelection(
        markdownText.value,
        markdownText.selectionStart || 0,
        markdownText.selectionEnd || 0
    );
    if (current !== selectedReferenceKey) {
        selectedReferenceKey = current;
        updateHighlight();
        updateMiniMap();
    }
}

function ensureMiniMap() {
    if (miniMapState.container) return;
    const container = document.createElement("div");
    container.id = "miniMap";
    container.className = "mini-map";
    container.innerHTML = `
        <div class="mini-map-base"></div>
        <div class="mini-map-content"></div>
        <div class="mini-map-viewport"></div>
    `;
    document.body.appendChild(container);
    miniMapState.container = container;
    miniMapState.base = container.querySelector(".mini-map-base");
    miniMapState.content = container.querySelector(".mini-map-content");
    miniMapState.viewport = container.querySelector(".mini-map-viewport");
    setupMiniMapInteractions();
}

function setupMiniMapInteractions() {
    if (miniMapState.interactionsReady) return;
    miniMapState.interactionsReady = true;

    const container = miniMapState.container;
    const viewport = miniMapState.viewport;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const getViewportHeight = () => {
        if (!viewport) return 0;
        const rect = viewport.getBoundingClientRect();
        return rect.height || 0;
    };

    const startContainerDrag = (event) => {
        if (!miniMapState.enabled) return;
        if (event.button !== 0) return;
        if (event.target && event.target.closest(".mini-map-viewport")) return;
        const rect = container.getBoundingClientRect();
        const nearResizeHandle =
            event.clientX >= rect.right - 18 && event.clientY >= rect.bottom - 18;
        if (nearResizeHandle) return;
        event.preventDefault();
        miniMapState.isDragging = true;
        miniMapState.dragOffsetX = event.clientX - rect.left;
        miniMapState.dragOffsetY = event.clientY - rect.top;
        container.classList.add("is-dragging");
    };

    const startViewportDrag = (event) => {
        if (!miniMapState.enabled) return;
        if (event.button !== 0) return;
        event.preventDefault();
        miniMapState.isViewportDragging = true;
        const rect = viewport.getBoundingClientRect();
        miniMapState.viewportDragOffsetY = event.clientY - rect.top;
        viewport.classList.add("is-dragging");
    };

    const updateContainerPosition = (clientX, clientY) => {
        const rect = container.getBoundingClientRect();
        const nextLeft = clientX - miniMapState.dragOffsetX;
        const nextTop = clientY - miniMapState.dragOffsetY;
        container.style.left = nextLeft + "px";
        container.style.top = nextTop + "px";
        container.style.right = "auto";
        container.style.bottom = "auto";
    };

    const updateScrollFromViewport = (clientY) => {
        const rect = container.getBoundingClientRect();
        const viewHeight = getViewportHeight();
        const maxTop = Math.max(0, rect.height - viewHeight);
        const nextTop = clamp(clientY - rect.top - miniMapState.viewportDragOffsetY, 0, maxTop);
        const scale = miniMapState.scale || 1;
        markdownText.scrollTop = nextTop / scale;
    };

    container.addEventListener("mousedown", startContainerDrag);
    if (viewport) {
        viewport.addEventListener("mousedown", startViewportDrag);
    }

    document.addEventListener("mousemove", (event) => {
        if (miniMapState.isDragging) {
            updateContainerPosition(event.clientX, event.clientY);
        } else if (miniMapState.isViewportDragging) {
            updateScrollFromViewport(event.clientY);
        } else {
            return;
        }
        updateMiniMap();
    });

    document.addEventListener("mouseup", () => {
        if (miniMapState.isDragging) {
            miniMapState.isDragging = false;
            container.classList.remove("is-dragging");
        }
        if (miniMapState.isViewportDragging) {
            miniMapState.isViewportDragging = false;
            viewport.classList.remove("is-dragging");
        }
    });

    if (typeof ResizeObserver !== "undefined") {
        miniMapState.resizeObserver = new ResizeObserver(() => {
            updateMiniMap();
        });
        miniMapState.resizeObserver.observe(container);
    }

    window.addEventListener("resize", () => {
        updateMiniMap();
    });
}

function updateMiniMap() {
    if (!miniMapState.enabled) return;
    ensureMiniMap();
    if (!miniMapState.content) return;

    const hl = document.getElementById("mdHighlighter");
    if (!hl) return;
    miniMapState.content.innerHTML = hl.innerHTML;

    const computed = getComputedStyle(hl);
    miniMapState.content.style.padding = computed.padding;
    miniMapState.content.style.fontFamily = computed.fontFamily;
    miniMapState.content.style.fontSize = computed.fontSize;
    miniMapState.content.style.lineHeight = computed.lineHeight;
    miniMapState.content.style.whiteSpace = computed.whiteSpace;
    miniMapState.content.style.wordWrap = computed.wordWrap;
    miniMapState.content.style.overflowWrap = computed.overflowWrap;
    miniMapState.content.style.wordBreak = computed.wordBreak;

    const sourceWidth = Math.max(hl.scrollWidth, hl.offsetWidth, 1);
    const sourceHeight = Math.max(markdownText.scrollHeight, hl.scrollHeight, 1);
    const targetWidth = miniMapState.container.clientWidth || 1;
    const targetHeight = miniMapState.container.clientHeight || 1;
    const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    miniMapState.scale = scale;

    miniMapState.content.style.width = sourceWidth + "px";
    miniMapState.content.style.height = sourceHeight + "px";
    miniMapState.content.style.transformOrigin = "top left";
    miniMapState.content.style.transform = "scale(" + scale + ")";

    if (miniMapState.base) {
        const lineHeightValue = parseFloat(computed.lineHeight) || 14;
        const mapLineHeight = Math.max(2, lineHeightValue * scale);
        miniMapState.base.style.backgroundSize = "100% " + mapLineHeight + "px";
    }

    if (miniMapState.viewport) {
        const viewTop = markdownText.scrollTop * scale;
        const viewHeight = Math.max(8, markdownText.clientHeight * scale);
        const maxTop = Math.max(0, targetHeight - viewHeight);
        miniMapState.viewport.style.top = Math.min(viewTop, maxTop) + "px";
        miniMapState.viewport.style.height = Math.min(viewHeight, targetHeight) + "px";
    }
}

const miniMapToggle = document.getElementById("toggleMiniMap");
if (miniMapToggle) {
    const syncMiniMapState = () => {
        ensureMiniMap();
        if (miniMapState.container) {
            miniMapState.container.classList.toggle("is-visible", miniMapState.enabled);
        }
        miniMapToggle.classList.toggle("is-active", miniMapState.enabled);
        miniMapToggle.setAttribute("aria-pressed", miniMapState.enabled ? "true" : "false");
        updateMiniMap();
    };
    miniMapToggle.addEventListener("click", () => {
        miniMapState.enabled = !miniMapState.enabled;
        syncMiniMapState();
    });
    syncMiniMapState();
}
// El contenedor (#workContainer) ya existe
if (markdownText.parentElement) {
    const parent = markdownText.parentElement;
    if (getComputedStyle(parent).position === "static") {
        parent.style.position = "relative";
    }
    parent.appendChild(highlighter);

    // ⭐ NUEVO: caja de toggles arriba-derecha del editor
    if (!document.getElementById("mdHighlightToggles")) {
        const tbox = document.createElement("div");
        tbox.id = "mdHighlightToggles";
        tbox.style.position = "absolute";
        tbox.style.top = "8px";
        tbox.style.right = "12px";
        tbox.style.zIndex = "3";
        tbox.style.display = "flex";
        tbox.style.gap = "6px";
        tbox.style.fontSize = "11px";
        tbox.style.background = "rgba(255,255,255,0.85)";
        tbox.style.borderRadius = "999px";
        tbox.style.padding = "3px 8px";
        tbox.style.border = "1px solid #d1d5db";
        tbox.style.alignItems = "center";

        tbox.innerHTML = `
            <label style="display:flex;align-items:center;gap:3px;cursor:pointer;">
                <input id="toggleAllHighlight" type="checkbox" checked style="margin:0;" />
                <span>Todo</span>
            </label>
            <label style="display:flex;align-items:center;gap:3px;cursor:pointer;">
                <input id="toggleSections" type="checkbox" checked style="margin:0;" />
                <span>Sections</span>
            </label>
            <label style="display:flex;align-items:center;gap:3px;cursor:pointer;">
                <input id="toggleTesauros" type="checkbox" checked style="margin:0;" />
                <span>Tesauros</span>
            </label>
            <label style="display:flex;align-items:center;gap:3px;cursor:pointer;">
                <input id="toggleLet" type="checkbox" checked style="margin:0;" />
                <span>LET/Def</span>
            </label>
            <label style="display:flex;align-items:center;gap:3px;cursor:pointer;">
                <input id="toggleColumns" type="checkbox" checked style="margin:0;" />
                <span>Columnas</span>
            </label>
        `;

        parent.appendChild(tbox);

        const chkAll = tbox.querySelector("#toggleAllHighlight");
        const chkSec = tbox.querySelector("#toggleSections");
        const chkTes = tbox.querySelector("#toggleTesauros");
        const chkLet = tbox.querySelector("#toggleLet");
        const chkCol = tbox.querySelector("#toggleColumns");

        const refreshAllState = () => {
            if (!chkAll) return;
            const allOn = highlightSections && highlightTesauros && highlightLet && highlightColumns;
            const anyOn = highlightSections || highlightTesauros || highlightLet || highlightColumns;
            chkAll.checked = allOn;
            chkAll.indeterminate = !allOn && anyOn;
        };

        if (chkAll) {
            chkAll.addEventListener("change", () => {
                const enabled = chkAll.checked;
                highlightSections = enabled;
                highlightTesauros = enabled;
                highlightLet = enabled;
                highlightColumns = enabled;

                if (chkSec) chkSec.checked = enabled;
                if (chkTes) chkTes.checked = enabled;
                if (chkLet) chkLet.checked = enabled;
                if (chkCol) chkCol.checked = enabled;

                chkAll.indeterminate = false;
                updateHighlight();
            });
        }
        if (chkSec) {
            chkSec.addEventListener("change", () => {
                highlightSections = chkSec.checked;
                refreshAllState();
                updateHighlight();
            });
        }
        if (chkTes) {
            chkTes.addEventListener("change", () => {
                highlightTesauros = chkTes.checked;
                refreshAllState();
                updateHighlight();
            });
        }
        if (chkLet) {
            chkLet.addEventListener("change", () => {
                highlightLet = chkLet.checked;
                refreshAllState();
                updateHighlight();
            });
        }
        if (chkCol) {
            chkCol.addEventListener("change", () => {
                highlightColumns = chkCol.checked;
                refreshAllState();
                updateHighlight();
            });
        }

        refreshAllState();
    }
}

/* 🔹 Cualquier cambio en el textarea (teclado, Ctrl+V texto plano, borrar...) */
markdownText.addEventListener("input", () => {
    UndoManager.push(markdownText.value);
    syncActiveTemplateMarkdown();
    updateHighlight();
    updateLineNumbers();
});
markdownText.addEventListener("mouseup", updateSelectedReference);
markdownText.addEventListener("keyup", updateSelectedReference);
markdownText.addEventListener("select", updateSelectedReference);

function updateHighlight() {
    const txt = markdownText.value;

    const hl = document.getElementById("mdHighlighter");
    if (!hl) return;
    const scrollbarWidth = markdownText.offsetWidth - markdownText.clientWidth;
    const basePaddingRight = 12;
    hl.style.paddingRight = (basePaddingRight + Math.max(0, scrollbarWidth)) + "px";

    const referenceMatches = (kind, ref) => {
        if (!selectedReferenceKey || !kind || !ref) return false;
        if ((kind === "personalized" || kind === "function") && !highlightTesauros) return false;
        if (kind === "variable" && !highlightLet) return false;
        return selectedReferenceKey === buildReferenceKey(kind, ref);
    };

    const applyInlineReferenceHighlights = (html) => {
        if (!selectedReferenceKey) return html;
        if (selectedReferenceKey.startsWith("personalized.") && highlightTesauros) {
            const ref = selectedReferenceKey.slice("personalized.".length);
            const re = new RegExp("\\bpersonalized\\." + escapeRegex(ref) + "\\b", "gi");
            html = html.replace(re, (match) => `<span class="reference-inline-hit">${match}</span>`);
        }
        if (selectedReferenceKey.startsWith("variable.") && highlightLet) {
            const ref = selectedReferenceKey.slice("variable.".length);
            const re = new RegExp("\\bvariable\\." + escapeRegex(ref) + "\\b", "gi");
            html = html.replace(re, (match) => `<span class="reference-inline-hit">${match}</span>`);
        }
        if (selectedReferenceKey.startsWith("function.") && highlightTesauros) {
            const ref = selectedReferenceKey.slice("function.".length);
            const re = new RegExp("\\bfunction\\." + escapeRegex(ref) + "\\b", "gi");
            html = html.replace(re, (match) => `<span class="reference-inline-hit">${match}</span>`);
        }
        return html;
    };

    // Escapar HTML básico
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    const normalizeCodeSpacing = (value) => String(value).replace(/\s+/g, "");

    const hasUnbalancedQuotes = (value) => {
        let count = 0;
        let escaped = false;
        for (let i = 0; i < value.length; i++) {
            const ch = value[i];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === "\\") {
                escaped = true;
                continue;
            }
            if (ch === "\"") {
                count += 1;
            }
        }
        return count % 2 !== 0;
    };

    // Comprobación de paréntesis balanceados dentro de condition:
    function areParenthesesBalanced(s) {
        let count = 0;
        for (let i = 0; i < s.length; i++) {
            const ch = s.charAt(i);
            if (ch === "(") count++;
            else if (ch === ")") {
                count--;
                if (count < 0) return false;
            }
        }
        return count === 0;
    }

    const hasInvalidConditionReferences = (expr) => {
        const refRegex = /\b([A-Za-z_]+)\.[A-Za-z0-9_]+\b/g;
        let match;
        while ((match = refRegex.exec(expr)) !== null) {
            const prefix = match[1].toLowerCase();
            if (prefix !== "personalized" && prefix !== "variable") {
                return true;
            }
        }
        return false;
    };

    const hasInvalidConditionValues = (expr) => {
        const comparisonRegex =
            /\b(?:personalized|variable)\.[A-Za-z0-9_]+\s*(==|!=|>=|<=|>|<)\s*("[^"]*"|[^\s()"]+)/gi;
        let match;
        while ((match = comparisonRegex.exec(expr)) !== null) {
            const rawValue = match[2];
            if (rawValue.startsWith("\"")) {
                if (!rawValue.endsWith("\"")) return true;
                continue;
            }
            const value = rawValue.toLowerCase();
            if (value === "null") continue;
            if (value === "true" || value === "false") continue;
            if (/^-?\d+(\.\d+)?$/.test(rawValue)) continue;
            return true;
        }
        return false;
    };

    const isValidSectionOpenTag = (full) => {
        const match = full.match(
            /^\{\{\s*#\s*section_([^}\s|]+)\s*\|\s*condition\s*:\s*([\s\S]*)\}\}$/i
        );
        if (!match) return false;
        const expr = match[2].trim();
        if (!expr) return false;
        if (!/[()]/.test(expr)) return false;
        if (!areParenthesesBalanced(expr)) return false;
        if (hasUnbalancedQuotes(expr)) return false;
        if (hasInvalidConditionReferences(expr)) return false;
        if (hasInvalidConditionValues(expr)) return false;
        return true;
    };

    // 1) TOKENIZAR texto en:
    //    - trozos normales
    //    - tags de sección {{#section_NAME ...}} / {{/section_NAME}}
    const tokens = [];
    const tagRegex = /\{\{\s*(#|\/)\s*section_([^}\s|]+)[^}]*\}\}/g;
    let lastIndex = 0;
    let m;

    while ((m = tagRegex.exec(txt)) !== null) {
        const index = m.index;
        const full = m[0];
        const kind = m[1]; // "#" o "/"
        const name = m[2];

        // Texto previo al tag
        if (index > lastIndex) {
            tokens.push({
                type: "text",
                text: txt.slice(lastIndex, index)
            });
        }

        if (kind === "#") {
            // APERTURA VÁLIDA SOLO SI:  {{#section_NOMBRE | condition:...}}
            let syntaxOk = isValidSectionOpenTag(full);

            // Validar paréntesis en la expresión de condition:
            if (syntaxOk) {
                const condMatch = full.match(/condition\s*:\s*/i);
                if (condMatch && typeof condMatch.index === "number") {
                    const expr = full.slice(
                        condMatch.index + condMatch[0].length,
                        full.length - 2 // quitar "}}"
                    );
                    if (!areParenthesesBalanced(expr)) {
                        syntaxOk = false;
                    }
                }
            }

            tokens.push({
                type: "open",
                name: name,
                text: full,
                syntaxOk: syntaxOk,
                paired: false,
                invalid: !syntaxOk
            });
        } else {
            // CIERRE VÁLIDO SOLO SI: {{/section_NOMBRE}}
            const syntaxOkClose = /^\{\{\s*\/\s*section_[^}\s|]+\s*\}\}$/i.test(full);
            tokens.push({
                type: "close",
                name: name,
                text: full,
                syntaxOk: syntaxOkClose,
                paired: false,
                invalid: !syntaxOkClose
            });
        }

        lastIndex = tagRegex.lastIndex;
    }

    // Cola final de texto
    if (lastIndex < txt.length) {
        tokens.push({
            type: "text",
            text: txt.slice(lastIndex)
        });
    }

    // 2) EMPAREJAR TAGS → detectar cuáles son válidos y cuáles rotos
    const openStack = [];

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];

        if (t.type === "open") {
            t.paired = false;
            // solo apilamos si la SINTAXIS del tag de apertura es correcta
            if (t.syntaxOk) {
                openStack.push(t);
            }
        } else if (t.type === "close") {
            t.paired = false;

            // si la sintaxis del cierre ya es mala, no intentamos emparejar
            if (!t.syntaxOk) {
                t.invalid = true;
                continue;
            }

            // debe cerrar al último open con el mismo nombre
            if (
                openStack.length > 0 &&
                openStack[openStack.length - 1].name === t.name
            ) {
                const openTok = openStack.pop();
                openTok.paired = true;
                t.paired = true;
            } else {
                // cierre sin apertura / mal anidado
                t.invalid = true;
            }
        }
    }

    // Todo lo que quede abierto en la pila es inválido (sin cierre)
    for (let j = 0; j < openStack.length; j++) {
        openStack[j].invalid = true;
    }

    // 3) CONSTRUIR SEGMENTOS CON PROFUNDIDAD Y ERRORES
    const segments = [];
    let depth = 0; // solo cuenta sections correctamente emparejadas + sintaxis OK

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];

        if (t.type === "text") {
            // texto normal → se pinta con la profundidad actual
            segments.push({
                text: t.text,
                depth: depth,
                error: false
            });
        } else if (t.type === "open") {
            if (t.invalid || !t.paired) {
                // TAG DE APERTURA ROTO → solo él se marca como error
                segments.push({
                    text: t.text,
                    depth: 0,
                    error: true
                });
            } else {
                // apertura válida → subimos profundidad y bloque amarillo
                const newDepth = depth + 1;
                const d = newDepth > 5 ? 5 : newDepth;

                segments.push({
                    text: t.text,
                    depth: d,
                    error: false
                });

                depth = newDepth;
            }
        } else if (t.type === "close") {
            if (t.invalid || !t.paired) {
                // TAG DE CIERRE ROTO → solo él se marca como error
                segments.push({
                    text: t.text,
                    depth: 0,
                    error: true
                });
            } else {
                // cierre válido → el tag se pinta con la profundidad actual
                let d = depth;
                if (d < 1) d = 1;
                if (d > 5) d = 5;

                segments.push({
                    text: t.text,
                    depth: d,
                    error: false
                });

                depth = Math.max(0, depth - 1);
            }
        }
    }

    // 4) GENERAR HTML FINAL (secciones + tesauros + LET + tags parciales rotos)
    let html = "";

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];

        // Escapamos HTML
        let safe = escapeHtml(seg.text);

        const wrapCodeError = (value) => '<span class="code-error-block">' + value + '</span>';
        const parseReferenceValue = (value) => {
            const refMatch = value.match(/reference\s*:\s*([^|}]+)\s*(?:\||\}\})/i);
            return refMatch ? refMatch[1].trim() : "";
        };
        const isValidTesauroBlock = (value) => {
            const normalized = normalizeCodeSpacing(value).toLowerCase();
            if (!normalized.endsWith("}}")) return false;
            if (!(normalized.startsWith("{{personalized|") || normalized.startsWith("{{function|"))) {
                return false;
            }
            return normalized.includes("|reference:");
        };
        const isValidLetBlock = (value) => {
            const normalized = normalizeCodeSpacing(value).toLowerCase();
            if (!normalized.endsWith("}}")) return false;
            if (!normalized.startsWith("{{let|")) return false;
            if (!normalized.includes("|reference:")) return false;
            return normalized.includes("|result:");
        };
        const isValidDefinitionBlock = (value) => {
            const normalized = normalizeCodeSpacing(value).toLowerCase();
            if (!normalized.endsWith("}}")) return false;
            if (!normalized.startsWith("{{definition|")) return false;
            if (!normalized.includes("|reference:")) return false;
            if (!normalized.includes("|type:")) return false;
            return normalized.includes("|value:");
        };

        const allowTesauros = typeof highlightTesauros === "undefined" || highlightTesauros;
        const allowLet = typeof highlightLet === "undefined" || highlightLet;

        safe = safe.replace(/\{\{[\s\S]*?\}\}/g, function (matchBlock) {
            if (/^\{\{\s*[#/]/.test(matchBlock)) {
                return matchBlock;
            }
            const normalized = normalizeCodeSpacing(matchBlock).toLowerCase();
            const wantsTesauro =
                normalized.startsWith("{{personalized") || normalized.startsWith("{{function");
            const wantsLet = normalized.startsWith("{{let");
            const wantsDefinition = normalized.startsWith("{{definition");

            if (wantsTesauro) {
                if (!allowTesauros) return matchBlock;
                if (!isValidTesauroBlock(matchBlock)) return wrapCodeError(matchBlock);
                const isFunction = normalized.startsWith("{{function");
                const ref = parseReferenceValue(matchBlock);
                const hit = ref ? referenceMatches(isFunction ? "function" : "personalized", ref) : false;
                const refAttr = ref ? ` data-reference="${escapeAttr(ref)}"` : "";
                const className = isFunction ? "function-block" : "tesauro-block";
                return (
                    '<span class="' +
                    className +
                    (hit ? " reference-hit" : "") +
                    '"' +
                    refAttr +
                    ">" +
                    matchBlock +
                    "</span>"
                );
            }

            if (wantsLet) {
                if (!allowLet) return matchBlock;
                if (!isValidLetBlock(matchBlock)) return wrapCodeError(matchBlock);
                const refMatch = matchBlock.match(/reference\s*:\s*([^|}]+)/i);
                let hit = false;
                if (refMatch) {
                    const rawRef = refMatch[1].trim();
                    let kind = "personalized";
                    let ref = rawRef;
                    const dot = rawRef.indexOf(".");
                    if (dot !== -1) {
                        kind = rawRef.slice(0, dot).trim();
                        ref = rawRef.slice(dot + 1).trim();
                    }
                    hit = referenceMatches(kind, ref);
                }
                return '<span class="let-block' + (hit ? " reference-hit" : "") + '">' + matchBlock + "</span>";
            }

            if (wantsDefinition) {
                if (!allowLet) return matchBlock;
                if (!isValidDefinitionBlock(matchBlock)) return wrapCodeError(matchBlock);
                const ref = parseReferenceValue(matchBlock);
                const hit = ref ? referenceMatches("variable", ref) : false;
                return (
                    '<span class="definition-block' +
                    (hit ? " reference-hit" : "") +
                    '">' +
                    matchBlock +
                    "</span>"
                );
            }

            if (
                normalized.includes("reference:") ||
                normalized.includes("|result:") ||
                normalized.includes("|type:") ||
                normalized.includes("|value:")
            ) {
                return wrapCodeError(matchBlock);
            }

            return matchBlock;
        });

        if (allowTesauros || allowLet) {
            safe = safe.replace(
                /\{\{\s*(personalized|function|let|definition)\b[^}\n]*$/gim,
                function (matchPartial) {
                    return wrapCodeError(matchPartial);
                }
            );
        }
        // TAGS PARCIALES de sección (sin cerrar con "}}") solo cuando
        // no estamos ya en una sección y con highlightSections activo
        if (
            (typeof highlightSections === "undefined" || highlightSections) &&
            !seg.error &&
            seg.depth === 0
        ) {
            safe = safe.replace(
                /\{\{[#\/]section_[^}]*$/gm,
                function (matchPartial) {
                    return '<span class="section-error-block">' + matchPartial + '</span>';
                }
            );
        }

        if (typeof highlightSections === "undefined" || highlightSections) {
            safe = safe.replace(
                /\{\{\s*#\s*(?!section_)[^}]*\}\}/gi,
                function (matchInvalidSection) {
                    return '<span class="section-error-block">' + matchInvalidSection + "</span>";
                }
            );
            safe = safe.replace(
                /\{\{\s*\/\s*(?!section_)[^}]*\}\}/gi,
                function (matchInvalidSection) {
                    return '<span class="section-error-block">' + matchInvalidSection + "</span>";
                }
            );
        }

        safe = applyInlineReferenceHighlights(safe);

        const doSections = (typeof highlightSections === "undefined" || highlightSections);

        if (seg.error) {
            // Tag de section incorrecto → solo se pinta él (no el contenido)
            if (doSections) {
                html += '<span class="section-error-block">' + safe + '</span>';
            } else {
                html += safe;
            }
        } else if (seg.depth > 0) {
            // Dentro de sections emparejadas Y bien formadas → amarillo por profundidad
            if (doSections) {
                const d = seg.depth > 5 ? 5 : seg.depth;
                html += '<span class="section-block section-depth-' + d + '">' + safe + '</span>';
            } else {
                html += safe;
            }
        } else {
            // Sin sección → texto normal
            html += safe;
        }
    }

    if (typeof highlightColumns === "undefined" || highlightColumns) {
        html = html.replace(
            /\[columns:block\]([\s\S]*?)\[columns:split\]([\s\S]*?)\[columns\]/g,
            function (matchColumns, leftContent, rightContent) {
                return (
                    '<span class="columns-left-block">[columns:block]' +
                    leftContent +
                    '</span><span class="columns-right-block">[columns:split]' +
                    rightContent +
                    '[columns]</span>'
                );
            }
        );
    }

    hl.innerHTML = html;

    // 🔧 Ajustar altura del overlay al contenido TOTAL del textarea
    const contentHeight = markdownText.scrollHeight;
    hl.style.top = "0px";
    hl.style.left = "0px";
    hl.style.right = "0px";
    hl.style.bottom = "auto";          // anula bottom de inset:0 del CSS
    hl.style.height = contentHeight + "px";
    hl.style.overflow = "visible";
    const lineNumbersContent = ensureLineNumbersContent();
    if (lineNumbersContent) {
        lineNumbersContent.style.height = contentHeight + "px";
    }

    // Scroll sincronizado: movemos el overlay en sentido contrario
    const offsetY = markdownText.scrollTop;
    const offsetX = markdownText.scrollLeft || 0;
    hl.style.transform = "translate(" + (-offsetX) + "px, " + (-offsetY) + "px)";
    if (lineNumbersContent) {
        lineNumbersContent.style.transform = "translateY(" + (-offsetY) + "px)";
    }

    updateLineNumbers();
    updateMiniMap();
}



// Scroll del textarea → mover overlay
markdownText.addEventListener("scroll", function () {
    const hl = document.getElementById("mdHighlighter");
    const offsetY = markdownText.scrollTop;
    const offsetX = markdownText.scrollLeft || 0;
    if (hl) {
        hl.style.transform = "translate(" + (-offsetX) + "px, " + (-offsetY) + "px)";
    }
    const lineNumbersContent = ensureLineNumbersContent();
    if (lineNumbersContent) {
        lineNumbersContent.style.transform = "translateY(" + (-offsetY) + "px)";
    }
    updateMiniMap();
});

/* =======================================
   CTRL + Z / CTRL + Y
======================================= */
document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();

    // Ctrl+Z (sin Shift) → Undo
    if (e.ctrlKey && !e.shiftKey && key === "z") {
        e.preventDefault();
        const value = UndoManager.undo();
        if (value !== null) {
            markdownText.value = value;
            updateHighlight();
        }
        return;
    }

    // Ctrl+Y o Ctrl+Shift+Z → Redo
    if ((e.ctrlKey && key === "y") || (e.ctrlKey && e.shiftKey && key === "z")) {
        e.preventDefault();
        const value = UndoManager.redo();
        if (value !== null) {
            markdownText.value = value;
            updateHighlight();
        }
    }
});

/* Primera pintura al cargar */
updateHighlight();
