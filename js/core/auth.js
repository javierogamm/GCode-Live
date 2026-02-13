const AuthManager = {
    user: null,
    isLocked: true,
    loginModal: null,
    loginForm: null,
    loginUserInput: null,
    loginPassInput: null,
    loginStatus: null,
    accordionToggle: null,
    accordionPanel: null,
    userStatusDot: null,
    userNameLabel: null,
    userNoSessionMessage: null,
    userEditForm: null,
    userEditName: null,
    userEditPass: null,
    userEditStatus: null,

    init() {
        this.cacheDom();
        this.bindEvents();
        this.restoreSession();
        this.applyAuthState();
    },

    cacheDom() {
        this.loginModal = document.getElementById("loginModal");
        this.loginForm = document.getElementById("loginForm");
        this.loginUserInput = document.getElementById("loginUserInput");
        this.loginPassInput = document.getElementById("loginPassInput");
        this.loginStatus = document.getElementById("loginStatus");
        this.accordionToggle = document.getElementById("userAccordionToggle");
        this.accordionPanel = document.getElementById("userAccordionPanel");
        this.userStatusDot = document.getElementById("userStatusDot");
        this.userNameLabel = document.getElementById("userNameLabel");
        this.userNoSessionMessage = document.getElementById("userNoSessionMessage");
        this.userEditForm = document.getElementById("userEditForm");
        this.userEditName = document.getElementById("userEditName");
        this.userEditPass = document.getElementById("userEditPass");
        this.userEditStatus = document.getElementById("userEditStatus");
    },

    bindEvents() {
        if (this.loginForm) {
            this.loginForm.addEventListener("submit", (event) => {
                event.preventDefault();
                this.handleLogin();
            });
        }
        if (this.accordionToggle) {
            this.accordionToggle.addEventListener("click", () => {
                const isOpen = this.accordionPanel?.classList.contains("is-open");
                if (isOpen) {
                    this.closeAccordion();
                } else {
                    this.openAccordion();
                }
            });
        }
        if (this.userEditForm) {
            this.userEditForm.addEventListener("submit", (event) => {
                event.preventDefault();
                this.handleUserUpdate();
            });
        }
    },

    restoreSession() {
        const stored = localStorage.getItem("gcUser");
        if (!stored) return;
        try {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.id && parsed.name) {
                this.user = parsed;
                this.isLocked = false;
                this.registerSessionAccess();
            }
        } catch (error) {
            console.error("Error leyendo usuario guardado", error);
        }
    },

    async registerSessionAccess() {
        if (!this.user?.id) return;
        try {
            const response = await fetch("/api/users", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: this.user.id,
                    touchAccess: true
                })
            });
            if (!response.ok) return;
            const data = await response.json();
            if (data?.ultimo_acceso_code) {
                this.user = { ...this.user, ultimo_acceso_code: data.ultimo_acceso_code };
                localStorage.setItem("gcUser", JSON.stringify(this.user));
            }
        } catch (error) {
            console.error("No se pudo registrar ultimo acceso de sesión restaurada", error);
        }
    },

    openAccordion() {
        if (!this.accordionPanel || !this.accordionToggle) return;
        this.accordionPanel.classList.add("is-open");
        this.accordionPanel.setAttribute("aria-hidden", "false");
        this.accordionToggle.setAttribute("aria-expanded", "true");
    },

    closeAccordion() {
        if (!this.accordionPanel || !this.accordionToggle) return;
        this.accordionPanel.classList.remove("is-open");
        this.accordionPanel.setAttribute("aria-hidden", "true");
        this.accordionToggle.setAttribute("aria-expanded", "false");
    },

    applyAuthState() {
        this.updateUserSummary();
        if (this.isLocked) {
            this.lockApp();
        } else {
            this.unlockApp();
        }
    },

    updateUserSummary() {
        const name = this.user?.name || "Sin sesión";
        if (this.userNameLabel) this.userNameLabel.textContent = name;
        if (this.userStatusDot) {
            this.userStatusDot.classList.toggle("is-online", Boolean(this.user));
        }
        if (this.userNoSessionMessage) {
            this.userNoSessionMessage.style.display = this.user ? "none" : "block";
        }
        if (this.userEditForm) {
            this.userEditForm.style.display = this.user ? "grid" : "none";
        }
        if (this.userEditName) {
            this.userEditName.value = this.user?.name || "";
        }
        if (this.userEditPass) {
            this.userEditPass.value = "";
        }
    },

    lockApp() {
        document.body.classList.add("is-locked");
        if (this.loginModal) {
            this.loginModal.style.display = "flex";
            this.loginModal.setAttribute("aria-hidden", "false");
        }
        this.setInterfaceEnabled(false);
        if (this.loginUserInput) {
            setTimeout(() => this.loginUserInput?.focus(), 150);
        }
    },

    unlockApp() {
        document.body.classList.remove("is-locked");
        if (this.loginModal) {
            this.loginModal.style.display = "none";
            this.loginModal.setAttribute("aria-hidden", "true");
        }
        this.setInterfaceEnabled(true);
    },

    setInterfaceEnabled(enabled) {
        const lockTargets = document.querySelectorAll(
            "#leftPanel button, #toolbar button, #markdownText"
        );
        lockTargets.forEach((el) => {
            if ("disabled" in el) {
                el.disabled = !enabled;
            }
        });
        const markdownText = document.getElementById("markdownText");
        if (markdownText) {
            markdownText.readOnly = !enabled;
            if (!enabled) markdownText.blur();
        }
    },

    async handleLogin() {
        if (!this.loginUserInput || !this.loginPassInput) return;
        const name = this.loginUserInput.value.trim();
        const pass = this.loginPassInput.value;
        if (!name || !pass) {
            this.setLoginStatus("Completa usuario y contraseña.", true);
            return;
        }
        this.setLoginStatus("Verificando...", false);
        try {
            const response = await fetch(
                `/api/users?name=${encodeURIComponent(name)}&pass=${encodeURIComponent(pass)}`
            );
            if (!response.ok) {
                const errorText = await this.getErrorMessage(response);
                this.setLoginStatus(
                    errorText || "No se pudo iniciar sesión.",
                    true
                );
                return;
            }
            const data = await response.json();
            if (!data || !data.id) {
                this.setLoginStatus("Credenciales inválidas.", true);
                return;
            }
            this.user = data;
            localStorage.setItem("gcUser", JSON.stringify(data));
            this.isLocked = false;
            this.setLoginStatus("Sesión iniciada.", false);
            this.applyAuthState();
        } catch (error) {
            console.error(error);
            this.setLoginStatus("Error al conectar con el servidor.", true);
        }
    },

    setLoginStatus(message, isError) {
        if (!this.loginStatus) return;
        this.loginStatus.textContent = message;
        this.loginStatus.style.color = isError ? "#b91c1c" : "#1f2937";
    },

    async handleUserUpdate() {
        if (!this.user) return;
        const name = this.userEditName?.value.trim();
        const pass = this.userEditPass?.value;
        const payload = { id: this.user.id };
        if (name) payload.name = name;
        if (pass) payload.pass = pass;
        if (!payload.name && !payload.pass) {
            this.setUserEditStatus("Completa al menos un campo.", true);
            return;
        }
        this.setUserEditStatus("Guardando cambios...", false);
        try {
            const response = await fetch("/api/users", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorText = await this.getErrorMessage(response);
                this.setUserEditStatus(
                    errorText || "No se pudo actualizar el usuario.",
                    true
                );
                return;
            }
            const data = await response.json();
            if (data?.name) {
                this.user = { ...this.user, name: data.name };
                localStorage.setItem("gcUser", JSON.stringify(this.user));
            }
            if (this.userEditPass) this.userEditPass.value = "";
            this.updateUserSummary();
            this.setUserEditStatus("Usuario actualizado.", false);
        } catch (error) {
            console.error(error);
            this.setUserEditStatus("Error al actualizar el usuario.", true);
        }
    },

    async getErrorMessage(response) {
        const text = await response.text();
        if (!text) return null;
        try {
            const data = JSON.parse(text);
            if (data?.error) return data.error;
        } catch (error) {
            return text;
        }
        return text;
    },

    setUserEditStatus(message, isError) {
        if (!this.userEditStatus) return;
        this.userEditStatus.textContent = message;
        this.userEditStatus.style.color = isError ? "#b91c1c" : "#1f2937";
    }
};

document.addEventListener("DOMContentLoaded", () => {
    AuthManager.init();
});
