/* ============================================================
   DATATESAURO_MD.JS
   Panel flotante de creación y gestión básica de campos "tesauro"
   para el Editor Markdown.

   - Botón flotante 📚 (abre/cierra panel)
   - Panel lateral derecho con:
       · Alta / edición rápida de campos
       · Listado agrupado por tipo
       · Arrastrar campos al textarea
       · Botón ➕ para insertar en el cursor
       · Botón para abrir TesauroManager (gestor completo)
   - Inserta SIEMPRE: {{personalized | reference: ReferenciaDelTesauro}}
============================================================ */

const DataTesauro = {
    btn: null,
    panel: null,
    listDiv: null,

    // Campos en memoria
    campos: [],

    // Referencia al textarea Markdown
    targetTextarea: null,

    // Estado de colapsado por tipo
    collapsed: {},

    // Modal rápido para creación
    quickCreateModal: null,
    quickCreateNameInput: null,
    quickCreateRefInput: null,
    quickCreateRefSelect: null,
    quickCreateTypeInput: null,
    quickCreateSelectorOptionsWrap: null,
    quickCreateSelectorOptionsBody: null,
    quickCreateRefFeedback: null,
    quickRefEdited: false,
    lastReferenceWarningAt: 0,

    // Selector rápido de functions
    functionModal: null,
    functionSelect: null,
    functionPreview: null,
    functionGroups: [
        {
            id: "fecha",
            title: "FECHA",
            items: [
                {
                    label: "Fecha y hora actual",
                    value: "{{function | reference : CurrentDate#long-date}}"
                }
            ]
        },
        {
            id: "expediente",
            title: "EXPEDIENTE",
            items: [
                {
                    label: "Código del expediente",
                    value: "{{function | reference : Folder_Code}}"
                },
                {
                    label: "Procedimiento",
                    value: "{{function | reference : Folder_Procedure}}"
                },
                {
                    label: "Unidad Gestora",
                    value: "{{function | reference : Folder_ManagementUnit}}"
                },
                {
                    label: "Asunto del expediente",
                    value: "{{function | reference : Folder_Title}}"
                }
            ]
        },
        {
            id: "iniciacion",
            title: "INICIACIÓN",
            items: [
                {
                    label: "Fecha de solicitud",
                    value: "{{function | reference : NewCatalog_Initiation#annotation-datetime}}"
                },
                {
                    label: "Nº Registro",
                    value: "{{function | reference : NewCatalog_Initiation#annotation-code}}"
                },
                {
                    label: "NIF Solicitante",
                    value: "{{function | reference : NewCatalog_Initiation#solicitor-nif}}"
                },
                {
                    label: "Nombre solicitante",
                    value: "{{function | reference : NewCatalog_Initiation#solicitor-name}}"
                },
                {
                    label: "NIF Representante",
                    value: "{{function | reference : NewCatalog_Initiation#representant-nif}}"
                },
                {
                    label: "Nombre Representante",
                    value: "{{function | reference : NewCatalog_Initiation#representant-name}}"
                }
            ]
        }
    ],

    /* =======================================
       INICIALIZAR PARA ESTE EDITOR
       ======================================= */
    initForMarkdown(textarea) {
        if (!textarea) return;

        this.targetTextarea = textarea;

        const floatingRow = (window.ensureFloatingActionRow && ensureFloatingActionRow()) || null;

        // Botón rápido para crear + insertar tesauro
        if (!document.getElementById("btnTesauroCrear")) {
            const createBtn = document.createElement("button");
            createBtn.id = "btnTesauroCrear";
            createBtn.className = "floating-action-btn floating-tesauro-btn";
            createBtn.textContent = "➕ Crear Tesauro";

            if (floatingRow) {
                floatingRow.appendChild(createBtn);
            } else {
                document.body.appendChild(createBtn);
            }

            createBtn.addEventListener("click", () => {
                this.openQuickCreateModal();
            });
        }

        // Crear botón flotante si no existe
        if (!document.getElementById("btnTesauro")) {
            this.btn = document.createElement("button");
            this.btn.id = "btnTesauro";
            this.btn.className = "floating-action-btn floating-tesauro-btn";
            this.btn.textContent = "📚 Insertar Tesauro";
            // === TESAURO: botón flotante ===
            if (floatingRow) {
                floatingRow.appendChild(this.btn);
            } else {
                document.body.appendChild(this.btn);
            }

            this.btn.addEventListener("click", () => {
                this.togglePanel();
            });
        }
        if (typeof window.ensureTemplateButtons === "function") {
            window.ensureTemplateButtons();
        }
        if (typeof window.ensureQuickProjectButtons === "function") {
            window.ensureQuickProjectButtons();
        }

        if (!document.getElementById("btnFunction")) {
            const functionBtn = document.createElement("button");
            functionBtn.id = "btnFunction";
            functionBtn.className = "floating-action-btn floating-function-btn";
            functionBtn.textContent = "🧠 Insertar Function";

            if (floatingRow) {
                const tesauroBtn = document.getElementById("btnTesauro");
                if (tesauroBtn && tesauroBtn.nextSibling) {
                    floatingRow.insertBefore(functionBtn, tesauroBtn.nextSibling);
                } else {
                    floatingRow.appendChild(functionBtn);
                }
            } else {
                document.body.appendChild(functionBtn);
            }

            functionBtn.addEventListener("click", () => {
                this.openFunctionModal();
            });
        }
        // === NUEVO BOTÓN FLOTANTE: acceso directo al gestor completo ===
        if (!document.getElementById("btnTesauroManagerFloating")) {
            const btn2 = document.createElement("button");
            btn2.id = "btnTesauroManagerFloating";
            btn2.className = "floating-action-btn floating-tesauro-manager-btn";
            btn2.textContent = "🧩Gestor de Tesauros";
            if (floatingRow) {
                floatingRow.appendChild(btn2);
            } else {
                document.body.appendChild(btn2);
            }

            btn2.addEventListener("click", () => {
                if (window.TesauroManager && typeof TesauroManager.open === "function") {
                    TesauroManager.open();
                } else {
                    alert("TesauroManager no está disponible.");
                }
            });

                    // --- Botón global: marcar tesauro como no editable ---
        const toolbar =
            document.getElementById("toolbar") ||
            document.querySelector(".toolbar");

        if (toolbar && !document.getElementById("btnTesauroNoEditable")) {
            const btnLock = document.createElement("button");
            btnLock.id = "btnTesauroNoEditable";
            btnLock.type = "button";
            btnLock.title = "Marcar tesauro como no editable";
            btnLock.innerHTML = "🔒 No editable";

            // Intentar colocarlo a la derecha del botón "Anchos" (tablas)
            const btnAnchos = document.getElementById("btnTableWidths");
            if (btnAnchos && btnAnchos.nextSibling) {
                toolbar.insertBefore(btnLock, btnAnchos.nextSibling);
            } else if (btnAnchos) {
                toolbar.appendChild(btnLock);
            } else {
                toolbar.appendChild(btnLock);
            }

            // No perder la selección al hacer click
            btnLock.addEventListener("mousedown", (e) => e.preventDefault());
            btnLock.addEventListener("click", () => {
                DataTesauro.markSelectedTesauroNoEditable();
            });
        }

        }

        // Crear panel lateral si no existe
        if (!document.getElementById("tesauroPanel")) {
            this.panel = document.createElement("div");
            this.panel.id = "tesauroPanel";
            this.panel.className = "tesauro-panel";
            this.panel.innerHTML = `
                <h3>📚 Campos del Tesauro</h3>
                <div class="tesauro-panel-inner">
                    <div class="tesauro-panel-section">
                        <h4>📋 Campos definidos</h4>
                        <div id="tesauroList"></div>
                    </div>
                </div>
                <div class="tesauro-panel-footer">
                    Arrastra un campo al editor o pulsa ➕ para insertarlo en el Markdown.
                </div>
            `;
            // === TESAURO: panel lateral ===
            document.body.appendChild(this.panel);

            this.listDiv = this.panel.querySelector("#tesauroList");
            this.renderList();
        } 
        // Botón "No editable" → marca el tesauro en el texto como editable:false
        const noEditableBtn = this.panel.querySelector("#tesauroNoEditableBtn");
        if (noEditableBtn && !noEditableBtn._boundNoEditable) {
            noEditableBtn.addEventListener("click", () => {
                this.markSelectedTesauroNoEditable();
            });
            noEditableBtn._boundNoEditable = true; // evitar doble binding
        }


        else {
            this.panel = document.getElementById("tesauroPanel");
            this.listDiv = this.panel.querySelector("#tesauroList");
        }

        // Configurar drag & drop sobre el textarea
        this.setupMarkdownDrop(textarea);
    },

    /* =======================================
       MOSTRAR / OCULTAR PANEL
       ======================================= */
    togglePanel() {
        if (!this.panel) return;
        const visible = this.panel.classList.contains("visible");
        if (visible) {
            this.panel.classList.remove("visible");
        } else {
            this.panel.classList.add("visible");
        }
    },

    
    /* =======================================
       LISTADO AGRUPADO POR TIPO
       ======================================= */
    renderList() {
        if (!this.listDiv) return;

        const grupos = {};
        this.campos.forEach(c => {
            const t = c.tipo || "texto";
            if (!grupos[t]) grupos[t] = [];
            grupos[t].push(c);
        });

        const tiposOrden = ["texto", "selector", "si_no", "numero", "fecha", "moneda"];

        let html = "";

        tiposOrden.forEach(tipo => {
            const lista = grupos[tipo] || [];
            if (!lista.length) return;

            const colapsado = !!this.collapsed[tipo];

            html += `
                <div class="tesauro-group" data-tipo="${tipo}">
                    <div class="tesauro-group-header" data-tipo="${tipo}">
                        <span>${this.prettyTipo(tipo)} (${lista.length})</span>
                        <span>${colapsado ? "➕" : "➖"}</span>
                    </div>
            `;

            if (!colapsado) {
                html += `<div class="tesauro-group-body">`;
                lista.forEach(campo => {
                    html += `
                        <div class="tesauro-item" data-id="${campo.id}">
                            <div class="tesauro-item-main">
                                <span class="drag-pill"
                                      draggable="true"
                                      data-dnd="tesauro-campo"
                                      data-campo-ref="${this.escapeAttr(campo.ref)}"
                                      data-campo-nombre="${this.escapeAttr(campo.nombre)}">
                                    ⧉ ${campo.ref}
                                </span>
                                <span class="tesauro-item-name" title="${this.escapeAttr(campo.nombre)}">
                                    ${campo.nombre}
                                </span>
                                <button class="tesauro-mini-btn tesauro-insert" data-ref="${this.escapeAttr(campo.ref)}">➕</button>
                                <button class="tesauro-mini-btn tesauro-edit" data-id="${campo.id}">✏</button>
                                <button class="tesauro-mini-btn tesauro-del" data-id="${campo.id}">🗑</button>
                            </div>
                        </div>
                    `;
                });
                html += `</div>`;
            }

            html += `</div>`;
        });

        this.listDiv.innerHTML = html || "<p style='font-size:12px;color:#9ca3af;'>Aún no hay campos de tesauro.</p>";

        // Eventos de grupo (colapsar)
        this.listDiv.querySelectorAll(".tesauro-group-header").forEach(h => {
            h.addEventListener("click", () => {
                const tipo = h.dataset.tipo;
                this.collapsed[tipo] = !this.collapsed[tipo];
                this.renderList();
            });
        });

        // Eventos de edición y borrado
        this.listDiv.querySelectorAll(".tesauro-edit").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                const campo = this.campos.find(c => c.id === id);
                if (!campo) return;

                const formSection = this.panel.querySelector("#tesauroFormSection");
                if (!formSection) return;

                           });
        });

        this.listDiv.querySelectorAll(".tesauro-del").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                this.campos = this.campos.filter(c => c.id !== id);
                this.renderList();
            });
        });

        // Insertar con botón ➕
        this.listDiv.querySelectorAll(".tesauro-insert").forEach(btn => {
            btn.addEventListener("click", () => {
                const ref = btn.dataset.ref;
                this.insertReferenceIntoMarkdown(ref);
            });
        });

        // Drag & drop
        this.listDiv.querySelectorAll(".drag-pill").forEach(pill => {
            pill.addEventListener("dragstart", (e) => this.handleDragStart(e, pill));
        });
    },

    /* =======================================
       DRAG & DROP HACIA EL TEXTAREA
       ======================================= */
    setupMarkdownDrop(textarea) {
        // --- Mantener visualmente la selección durante el drag/drop ---
        let savedSelStart = 0;
        let savedSelEnd = 0;

        // Guardar la selección cuando comienza el drag desde un tesauro
        document.addEventListener("dragstart", () => {
            savedSelStart = textarea.selectionStart;
            savedSelEnd = textarea.selectionEnd;
        });

        // Restaurar visual al entrar en el área del textarea
        textarea.addEventListener("dragenter", () => {
            textarea.setSelectionRange(savedSelStart, savedSelEnd);
        });

        // Restaurar visual mientras el usuario mueve el tesauro por encima
        textarea.addEventListener("dragover", () => {
            textarea.setSelectionRange(savedSelStart, savedSelEnd);
        });

        // Dragover: permitir soltar si viene un tesauro
        textarea.addEventListener("dragover", (e) => {
            const types = Array.from(e.dataTransfer.types || []);
            if (types.includes("application/x-tesauro")) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
            }
        });

        textarea.addEventListener("drop", (e) => {
            const types = Array.from(e.dataTransfer.types || []);
            if (!types.includes("application/x-tesauro")) return;

            e.preventDefault();
            const raw = e.dataTransfer.getData("application/x-tesauro");
            if (!raw) return;

            let payload = null;
            try {
                payload = JSON.parse(raw);
            } catch {
                return;
            }

            const ref = payload.refCampo || payload.ref || payload.refTesauro;
            if (!ref) return;

            this.insertReferenceIntoMarkdown(ref);
        });
    },

    handleDragStart(e, pill) {
        const payload = {
            tipo: "campo",
            refCampo: pill.dataset.campoRef,
            nombre: pill.dataset.campoNombre
        };

        e.dataTransfer.setData("application/x-tesauro", JSON.stringify(payload));
        e.dataTransfer.effectAllowed = "copy";
    },

    /* =======================================
       INSERCIÓN EN MARKDOWN
       ======================================= */
    insertReferenceIntoMarkdown(refTesauro) {
        const marker = ` {{personalized | reference: ${refTesauro}}} `;
        this.insertTextIntoMarkdown(marker);
    },

    insertFunctionIntoMarkdown(functionRef) {
        const marker = ` ${functionRef} `;
        this.insertTextIntoMarkdown(marker);
    },

    insertTextIntoMarkdown(textToInsert) {
        if (!this.targetTextarea || !textToInsert) return;

        const ta = this.targetTextarea;
        ta.focus();

        const start = ta.selectionStart;
        const end = ta.selectionEnd;

        ta.setRangeText(textToInsert, start, end, "end");
        if (typeof window.recordUndoAfterChange === "function") {
            recordUndoAfterChange(ta);
        }

        if (window.updateHighlight) updateHighlight();
    },

    /* =======================================
       SELECTOR RÁPIDO DE FUNCTIONS
       ======================================= */
    openFunctionModal() {
        if (!this.functionModal) {
            this.buildFunctionModal();
        }

        if (!this.functionModal || !this.functionSelect) return;

        this.functionSelect.selectedIndex = 0;
        this.updateFunctionPreview();
        this.functionModal.style.display = "flex";
        this.functionSelect.focus();
    },

    closeFunctionModal() {
        if (this.functionModal) {
            this.functionModal.style.display = "none";
        }
    },

    buildFunctionModal() {
        const overlay = document.createElement("div");
        overlay.id = "tesauroFunctionSelector";
        overlay.className = "tesauro-function-modal";

        const optionsHtml = this.functionGroups.map(group => {
            const items = (group.items || []).map(item => `
                <option value="${this.escapeAttr(item.value)}">${this.escapeHtml(item.label)}</option>
            `).join("");
            return `<optgroup label="${this.escapeAttr(group.title)}">${items}</optgroup>`;
        }).join("");

        overlay.innerHTML = `
            <div class="tesauro-function-card">
                <h2>🧠 Insertar Function</h2>
                <p class="tesauro-function-help">Selecciona una function agrupada por categoría. Se insertará directamente en el Markdown.</p>

                <label class="tesauro-function-label" for="functionQuickSelect">Function</label>
                <select id="functionQuickSelect" class="tesauro-function-select">
                    <option value="">Selecciona una function…</option>
                    ${optionsHtml}
                </select>

                <div class="tesauro-function-preview-wrap">
                    <span class="tesauro-function-preview-label">Vista previa</span>
                    <code id="functionQuickPreview" class="tesauro-function-preview">Selecciona una function para ver su referencia.</code>
                </div>

                <div class="tesauro-function-actions">
                    <button id="functionQuickCancel" type="button" class="tesauro-function-btn tesauro-function-btn-secondary">Cancelar</button>
                    <button id="functionQuickInsert" type="button" class="tesauro-function-btn tesauro-function-btn-primary">Insertar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.functionModal = overlay;
        this.functionSelect = overlay.querySelector("#functionQuickSelect");
        this.functionPreview = overlay.querySelector("#functionQuickPreview");

        const btnCancel = overlay.querySelector("#functionQuickCancel");
        const btnInsert = overlay.querySelector("#functionQuickInsert");

        if (this.functionSelect) {
            this.functionSelect.addEventListener("change", () => this.updateFunctionPreview());
        }

        if (btnCancel) {
            btnCancel.addEventListener("click", () => this.closeFunctionModal());
        }

        if (btnInsert) {
            btnInsert.addEventListener("click", () => {
                const value = this.functionSelect ? this.functionSelect.value : "";
                if (!value) {
                    alert("Debes seleccionar una function.");
                    return;
                }

                this.insertFunctionIntoMarkdown(value);
                this.closeFunctionModal();
            });
        }

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) this.closeFunctionModal();
        });
    },

    updateFunctionPreview() {
        if (!this.functionPreview) return;
        const value = this.functionSelect ? this.functionSelect.value : "";
        this.functionPreview.textContent = value || "Selecciona una function para ver su referencia.";
    },

    /* =======================================
       CREACIÓN RÁPIDA DE TESAUROS
       ======================================= */
    openQuickCreateModal() {
        if (!this.quickCreateModal) {
            this.buildQuickCreateModal();
        }

        if (!this.quickCreateModal) return;

        this.quickRefEdited = false;
        if (this.quickCreateNameInput) this.quickCreateNameInput.value = "";
        if (this.quickCreateRefInput) this.quickCreateRefInput.value = "";
        if (this.quickCreateRefSelect) this.quickCreateRefSelect.value = "no";
        this.setQuickCreateType("texto");
        this.resetQuickSelectorOptions();
        this.toggleQuickSelectorOptions();

        this.updateQuickRefPreview();

        this.quickCreateModal.style.display = "flex";
        if (this.quickCreateNameInput) this.quickCreateNameInput.focus();
    },

    buildQuickCreateModal() {
        const overlay = document.createElement("div");
        overlay.id = "tesauroQuickCreate";
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.background = "rgba(0,0,0,0.45)";
        overlay.style.display = "none";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.zIndex = "100000";

        overlay.innerHTML = `
            <div style="
                background: white;
                padding: 18px 20px;
                border-radius: 10px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                width: 420px;
                max-width: 92%;
                font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
                font-size: 14px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            ">
                <h2 style="margin:0; font-size:18px; color:#111827;">Crear tesauro e insertar</h2>

                <label style="display:flex; flex-direction:column; gap:4px;">
                    <span style="font-size:12px; color:#6b7280;">Nombre visible</span>
                    <input id="tesauroQuickName" type="text" placeholder="p.ej. Número de expediente" style="
                        width:100%; padding:7px 8px; border-radius:8px; border:1px solid #cbd5e1; font-size:13px;">
                </label>

                <label style="display:flex; flex-direction:column; gap:4px;">
                    <span style="font-size:12px; color:#6b7280;">Referencia</span>
                    <input id="tesauroQuickRef" type="text" placeholder="Referencia" style="
                        width:100%; padding:7px 8px; border-radius:8px; border:1px solid #cbd5e1; font-size:13px;" maxlength="40">
                    <span id="tesauroQuickRefFeedback" style="display:none; font-size:11px; color:#b45309;"></span>
                </label>

                <label style="display:flex; flex-direction:column; gap:4px;">
                    <span style="font-size:12px; color:#6b7280;">Crear referencia</span>
                    <select id="tesauroQuickRefSelect" style="
                        width:100%; padding:7px 8px; border-radius:8px; border:1px solid #cbd5e1; font-size:13px;">
                        <option value="no">No</option>
                        <option value="si">Sí</option>
                    </select>
                </label>

                <label style="display:flex; flex-direction:column; gap:4px;">
                    <span style="font-size:12px; color:#6b7280;">Tipo</span>
                    <input id="tesauroQuickType" type="hidden" value="texto">
                    <div id="tesauroQuickTypeButtons" style="display:flex; flex-wrap:wrap; gap:6px;">
                        <button type="button" class="tesauro-quick-type-btn" data-value="texto" style="padding:6px 10px; border-radius:8px; border:1px solid #cbd5e1; background:#eef2ff; color:#1e3a8a; font-size:12px; cursor:pointer; font-weight:600;">Texto</button>
                        <button type="button" class="tesauro-quick-type-btn" data-value="selector" style="padding:6px 10px; border-radius:8px; border:1px solid #cbd5e1; background:white; color:#334155; font-size:12px; cursor:pointer;">Selector</button>
                        <button type="button" class="tesauro-quick-type-btn" data-value="si_no" style="padding:6px 10px; border-radius:8px; border:1px solid #cbd5e1; background:white; color:#334155; font-size:12px; cursor:pointer;">Sí / No</button>
                        <button type="button" class="tesauro-quick-type-btn" data-value="numero" style="padding:6px 10px; border-radius:8px; border:1px solid #cbd5e1; background:white; color:#334155; font-size:12px; cursor:pointer;">Número</button>
                        <button type="button" class="tesauro-quick-type-btn" data-value="moneda" style="padding:6px 10px; border-radius:8px; border:1px solid #cbd5e1; background:white; color:#334155; font-size:12px; cursor:pointer;">Moneda</button>
                        <button type="button" class="tesauro-quick-type-btn" data-value="fecha" style="padding:6px 10px; border-radius:8px; border:1px solid #cbd5e1; background:white; color:#334155; font-size:12px; cursor:pointer;">Fecha</button>
                    </div>
                </label>

                <div id="tesauroQuickSelectorOptionsWrap" style="
                    display:none;
                    border:1px solid #e2e8f0;
                    border-radius:8px;
                    padding:10px;
                    background:#f8fafc;
                    gap:8px;
                    flex-direction:column;">
                    <div style="font-size:12px; color:#334155; font-weight:600;">Opciones del selector</div>
                    <div style="font-size:12px; color:#64748b;">Informa la referencia y valor de cada opción.</div>
                    <div id="tesauroQuickSelectorOptionsBody" style="display:flex; flex-direction:column; gap:6px;"></div>
                    <button id="tesauroQuickAddOption" type="button" style="
                        align-self:flex-start;
                        padding:5px 10px;
                        border-radius:6px;
                        border:1px solid #10b981;
                        background:#d1fae5;
                        color:#065f46;
                        cursor:pointer;
                        font-weight:600;">
                        ➕ Añadir opción
                    </button>
                </div>

                <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:4px;">
                    <button id="tesauroQuickCancel" type="button" style="
                        padding:7px 12px; border-radius:8px; border:1px solid #e5e7eb; background:#f3f4f6; cursor:pointer;">
                        Cancelar
                    </button>
                    <button id="tesauroQuickCreateBtn" type="button" style="
                        padding:7px 14px; border-radius:8px; border:none; background:#E34850; color:white; cursor:pointer; font-weight:700;">
                        Crear e insertar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.quickCreateModal = overlay;
        this.quickCreateNameInput = overlay.querySelector("#tesauroQuickName");
        this.quickCreateRefInput = overlay.querySelector("#tesauroQuickRef");
        this.quickCreateRefSelect = overlay.querySelector("#tesauroQuickRefSelect");
        this.quickCreateTypeInput = overlay.querySelector("#tesauroQuickType");
        this.quickCreateSelectorOptionsWrap = overlay.querySelector("#tesauroQuickSelectorOptionsWrap");
        this.quickCreateSelectorOptionsBody = overlay.querySelector("#tesauroQuickSelectorOptionsBody");
        this.quickCreateRefFeedback = overlay.querySelector("#tesauroQuickRefFeedback");

        const btnCancel = overlay.querySelector("#tesauroQuickCancel");
        const btnCreate = overlay.querySelector("#tesauroQuickCreateBtn");
        const btnAddOption = overlay.querySelector("#tesauroQuickAddOption");

        if (this.quickCreateNameInput) {
            this.quickCreateNameInput.addEventListener("input", () => {
                this.updateQuickRefPreview();
            });
        }

        if (this.quickCreateRefInput) {
            this.quickCreateRefInput.addEventListener("input", () => {
                const details = this.sanitizeReferenceWithDetails(this.quickCreateRefInput.value);
                const limited = details.value;
                if (this.quickCreateRefInput.value !== limited) {
                    this.quickCreateRefInput.value = limited;
                }
                this.updateReferenceFeedback(this.quickCreateRefFeedback, details);
                this.quickRefEdited = true;
            });
        }

        if (this.quickCreateRefSelect) {
            this.quickCreateRefSelect.addEventListener("change", () => {
                this.quickRefEdited = false;
                this.updateQuickRefPreview();
            });
        }

        overlay.querySelectorAll(".tesauro-quick-type-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const value = btn.dataset.value || "texto";
                this.setQuickCreateType(value);
            });
        });

        if (btnAddOption) {
            btnAddOption.addEventListener("click", () => {
                this.addQuickSelectorOptionRow();
            });
        }

        if (btnCancel) {
            btnCancel.addEventListener("click", () => this.closeQuickCreateModal());
        }

        if (btnCreate) {
            btnCreate.addEventListener("click", () => this.handleQuickCreate());
        }

        document.addEventListener("keydown", (e) => {
            if (!this.quickCreateModal || this.quickCreateModal.style.display !== "flex") return;
            if (e.key === "Escape") this.closeQuickCreateModal();
        });

        this.resetQuickSelectorOptions();
        this.toggleQuickSelectorOptions();
    },

    updateQuickRefPreview() {
        if (!this.quickCreateNameInput || !this.quickCreateRefInput) return;
        const crearRef = (this.quickCreateRefSelect?.value || "no") === "si";
        if (!crearRef) return;

        if (this.quickRefEdited && this.quickCreateRefInput.value.trim()) return;

        const suggestion = this.generarReferenciaDesdeNombre(this.quickCreateNameInput.value);
        this.quickCreateRefInput.value = this.limitReferenceLength(suggestion);
        this.updateReferenceFeedback(this.quickCreateRefFeedback, this.sanitizeReferenceWithDetails(this.quickCreateRefInput.value));
        this.quickRefEdited = false;
    },

    toggleQuickSelectorOptions() {
        if (!this.quickCreateSelectorOptionsWrap) return;
        const isSelector = this.getQuickCreateType() === "selector";
        this.quickCreateSelectorOptionsWrap.style.display = isSelector ? "flex" : "none";
    },

    setQuickCreateType(value) {
        const allowed = new Set(["texto", "selector", "si_no", "numero", "moneda", "fecha"]);
        const safeValue = allowed.has(value) ? value : "texto";
        if (this.quickCreateTypeInput) {
            this.quickCreateTypeInput.value = safeValue;
        }
        if (this.quickCreateModal) {
            this.quickCreateModal.querySelectorAll(".tesauro-quick-type-btn").forEach((btn) => {
                const isActive = btn.dataset.value === safeValue;
                btn.style.background = isActive ? "#eef2ff" : "white";
                btn.style.color = isActive ? "#1e3a8a" : "#334155";
                btn.style.fontWeight = isActive ? "700" : "500";
                btn.style.borderColor = isActive ? "#6366f1" : "#cbd5e1";
            });
        }
        this.toggleQuickSelectorOptions();
    },

    getQuickCreateType() {
        return this.quickCreateTypeInput?.value || "texto";
    },

    resetQuickSelectorOptions() {
        if (!this.quickCreateSelectorOptionsBody) return;
        this.quickCreateSelectorOptionsBody.innerHTML = "";
        this.addQuickSelectorOptionRow();
    },

    addQuickSelectorOptionRow(ref = "", valor = "") {
        if (!this.quickCreateSelectorOptionsBody) return;
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.gap = "6px";
        row.style.alignItems = "center";
        row.className = "tesauro-quick-option-row";
        row.innerHTML = `
            <input class="tesauro-quick-opt-ref" type="text" placeholder="Referencia opción" value="${this.escapeAttr(this.limitReferenceLength(ref))}" maxlength="40" style="flex:0.8; padding:6px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;">
            <input class="tesauro-quick-opt-valor" type="text" placeholder="Valor opción" value="${this.escapeAttr(valor)}" style="flex:1; padding:6px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;">
            <button type="button" class="tesauro-quick-opt-del" style="padding:5px 8px; border-radius:6px; border:1px solid #fecaca; background:#fee2e2; color:#991b1b; cursor:pointer;">✖</button>
        `;

        const refInput = row.querySelector(".tesauro-quick-opt-ref");
        if (refInput) {
            refInput.addEventListener("input", () => {
                const details = this.sanitizeReferenceWithDetails(refInput.value);
                refInput.value = details.value;
                this.notifyInvalidReferenceAttempt(details);
            });
        }

        const delBtn = row.querySelector(".tesauro-quick-opt-del");
        if (delBtn) {
            delBtn.addEventListener("click", () => {
                row.remove();
                if (!this.quickCreateSelectorOptionsBody.children.length) {
                    this.addQuickSelectorOptionRow();
                }
            });
        }
        this.quickCreateSelectorOptionsBody.appendChild(row);
    },

    closeQuickCreateModal() {
        if (this.quickCreateModal) {
            this.quickCreateModal.style.display = "none";
        }
    },

    handleQuickCreate() {
        if (!this.quickCreateNameInput || !this.quickCreateRefInput || !this.quickCreateTypeInput) return;

        const nombre = (this.quickCreateNameInput.value || "").trim();
        let ref = (this.quickCreateRefInput.value || "").trim();
        const tipo = this.getQuickCreateType();
        const crearRef = (this.quickCreateRefSelect?.value || "no") === "si";

        if (!nombre) {
            alert("Debes indicar un nombre para el tesauro.");
            return;
        }

        if (!ref && crearRef) {
            ref = this.generarReferenciaDesdeNombre(nombre);
            this.quickCreateRefInput.value = ref;
        }

        ref = this.limitReferenceLength(ref);
        this.quickCreateRefInput.value = ref;

        if (!ref) {
            alert("Indica una referencia o activa la creación automática.");
            return;
        }

        const exists = (this.campos || []).some(c => (c.ref || "").toLowerCase() === ref.toLowerCase());
        if (exists) {
            alert("Ya existe un tesauro con esa referencia.");
            return;
        }

        const nuevo = {
            id: this.generateId(),
            nombre,
            ref,
            tipo,
            momento: "Solicitud",
            agrupacion: "General"
        };

        if (tipo === "selector") {
            const opciones = Array.from(this.quickCreateSelectorOptionsBody?.querySelectorAll(".tesauro-quick-option-row") || [])
                .map((row) => {
                    const refEl = row.querySelector(".tesauro-quick-opt-ref");
                    const valorEl = row.querySelector(".tesauro-quick-opt-valor");
                    const refOpt = this.limitReferenceLength((refEl?.value || "").trim());
                    const valorOpt = (valorEl?.value || "").trim();
                    if (!refOpt && !valorOpt) return null;
                    if (!refOpt || !valorOpt) return "__invalid__";
                    return {
                        id: this.generateId(),
                        ref: refOpt,
                        valor: valorOpt
                    };
                })
                .filter(Boolean);

            if (opciones.includes("__invalid__")) {
                alert("Cada opción de selector debe incluir referencia y valor.");
                return;
            }

            nuevo.opciones = opciones;
        }

        this.campos = this.campos || [];
        this.campos.push(nuevo);
        this.renderList();

        this.insertReferenceIntoMarkdown(ref);
        this.closeQuickCreateModal();
    },
    /* =======================================
       Marcar tesauro seleccionado como no editable
       ======================================= */
    markSelectedTesauroNoEditable() {
        const ta = this.targetTextarea;
        if (!ta) return;

        const text = ta.value || "";
        const selStart = ta.selectionStart != null ? ta.selectionStart : 0;
        const selEnd   = ta.selectionEnd != null ? ta.selectionEnd   : selStart;

        // Buscar el bloque {{ ... }} que envuelve la selección
        const start = text.lastIndexOf("{{", selStart);
        const end   = text.indexOf("}}", selEnd);

        if (start === -1 || end === -1) {
            alert("Coloca el cursor dentro de un tesauro para marcarlo como no editable.");
            return;
        }

        const blockEnd = end + 2; // incluir "}}"
        const block = text.slice(start, blockEnd);

        // Debe ser un tesauro personalized | reference:
        if (!/personalized\b/i.test(block) || !/\breference\s*:/i.test(block)) {
            alert("El bloque seleccionado no parece un tesauro {{personalized | reference: ...}}.");
            return;
        }

        // Ya está en editable:false
        if (/\|\s*editable\s*:\s*false\b/i.test(block)) {
            alert("Este tesauro ya está marcado como no editable.");
            return;
        }

        let newBlock;

        // Si ya hay editable:algo → lo sustituimos
        if (/\|\s*editable\s*:/i.test(block)) {
            newBlock = block.replace(/\|\s*editable\s*:[^|}]+/i, " | editable:false");
        } else {
            // Si no hay editable → lo añadimos antes de las llaves de cierre
            newBlock = block.replace(/\}\}\s*$/, " | editable:false}}");
        }

        ta.setRangeText(newBlock, start, blockEnd, "end");

        if (typeof window.updateHighlight === "function") {
            updateHighlight();
        }
    },
    /* =======================================
       UTILIDADES
       ======================================= */
    generateId() {
        return Math.random().toString(36).substring(2, 9);
    },

    prettyTipo(tipo) {
        switch (tipo) {
            case "texto": return "Texto";
            case "selector": return "Selector";
            case "si_no": return "Sí / No";
            case "numero": return "Número";
            case "fecha": return "Fecha";
            case "moneda": return "Moneda";
            default: return tipo;
        }
    },

    escapeAttr(str) {
        if (!str) return "";
        return String(str).replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },

    escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    },
    limitReferenceLength(ref, max = 40) {
        return this.sanitizeReferenceWithDetails(ref, max).value;
    },

    sanitizeReferenceWithDetails(ref, max = 40) {
        if (!ref) {
            return {
                value: "",
                trimmedByRule: false,
                original: ""
            };
        }
        const normalized = String(ref).trim();
        const withoutSpaces = normalized.replace(/\s+/g, "");
        const safe = withoutSpaces.replace(/[^A-Za-z0-9_]/g, "");
        const value = safe.length <= max ? safe : safe.slice(0, max);
        const trimmedByRule = normalized !== value;
        return {
            value,
            trimmedByRule,
            original: normalized
        };
    },

    updateReferenceFeedback(feedbackEl, details) {
        if (!feedbackEl) return;
        if (!details?.trimmedByRule) {
            feedbackEl.style.display = "none";
            feedbackEl.textContent = "";
            return;
        }
        feedbackEl.style.display = "block";
        feedbackEl.textContent = `Referencia corregida: "${details.original}" no cumple las reglas (solo A-Z, 0-9 y _; máx. 40).`;
        this.notifyInvalidReferenceAttempt(details);
    },

    notifyInvalidReferenceAttempt(details) {
        if (!details?.trimmedByRule) return;
        const now = Date.now();
        if (now - this.lastReferenceWarningAt < 1200) return;
        this.lastReferenceWarningAt = now;
        console.warn(`Referencia no permitida detectada: ${details.original}`);
    },
// ⭐ NUEVO: generador de referencias con inversión + SiNo siempre al final
generarReferenciaDesdeNombre(nombre) {
    if (!nombre) return "";

    const raw = String(nombre).trim();
    if (!raw) return "";

    // Normalizar: minúsculas + quitar acentos
    let norm = raw.toLowerCase();
    if (norm.normalize) {
        norm = norm.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    // ⭐ Excepciones que NO se invierten y tienen forma fija
    const exceptions = {
        "nif": "NIF",
        "cif": "CIF",
        "dni": "DNI",
        "nie": "NIE",

        // ⛔ NO invertir estos nombres
        "referencia catastral": "ReferenciaCatastral",
        "proyecto tecnico": "ProyectoTecnico",
        "direccion postal": "DireccionPostal",
        "comunidad autonoma": "ComunidadAutonoma",
        "codigo postal": "CodigoPostal"
    };

    if (Object.prototype.hasOwnProperty.call(exceptions, norm)) {
        return exceptions[norm];
    }

    // Quitar signos raros (/, :, -, etc.) → los convertimos en espacio
    norm = norm.replace(/[^\p{L}\p{N}\s]+/gu, " ");

    // ⭐ AJUSTE Si/No:
    // Cualquier "si no" (antes venía de "si/no", "sí/no", etc.) se colapsa a un token
    norm = norm.replace(/\bsi\s+no\b/g, "sinotoken");

    const stopWords = [
        "de", "del", "la", "el", "los", "las",
        "y", "o", "u", "en", "para", "por", "con",
        "un", "una", "unos", "unas",
        "al", "como"
    ];

    // Partir en palabras, limpiar stopwords
    let words = norm
        .split(/\s+/)
        .filter(w => w && !stopWords.includes(w));

    if (!words.length) return "";

    // Invertir el orden (Tipo de Licencia de Obras → Obras Licencia Tipo)
    if (words.length > 1) {
        words.reverse();
    }

    // ⭐ AJUSTE: SiNo SIEMPRE al final
    const hasSiNo = words.includes("sinotoken");
    if (hasSiNo) {
        words = words.filter(w => w !== "sinotoken");
        words.push("sinotoken");
    }

    // PascalCase, mapeando el token especial a "SiNo"
    const camel = words
        .map(w => {
            if (w === "sinotoken") return "SiNo";
            return w.charAt(0).toUpperCase() + w.slice(1);
        })
        .join("");

    return this.limitReferenceLength(camel);
}





};

// === TESAURO: bootstrap automático para este editor ===
(function bootstrapTesauro() {
    function start() {
        const ta = document.getElementById("markdownText");
        if (ta) {
            DataTesauro.initForMarkdown(ta);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();

// Exponer por si quieres acceder desde consola
window.DataTesauro = DataTesauro;
