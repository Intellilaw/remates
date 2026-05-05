document.addEventListener("click", async (event) => {
  const clickedElement = getEventElementTarget(event);
  if (!clickedElement) {
    return;
  }

  const passwordToggle = clickedElement.closest(".password-toggle");
  if (passwordToggle) {
    const wrapper = passwordToggle.closest(".password-field");
    const input = wrapper?.querySelector("input");
    if (input) {
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      input.dataset.passwordVisible = visible ? "false" : "true";
      passwordToggle.textContent = visible ? "👁" : "🙈";
      passwordToggle.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
    }
    return;
  }

  const target = clickedElement.closest("[data-action]");
  if (!target) return;

  try {
    if (target.dataset.action === "section") {
      state.activeSection = target.dataset.section;
      if (state.activeSection === "externalUsers") {
        const externalUsers = state.users.filter((user) => !user.roles.some((role) => STAFF_ROLES.includes(role)));
        state.selectedExternalUserId = state.selectedExternalUserId || externalUsers[0]?.id || null;
        await loadClientPreview();
      }
      render();
    }

    if (target.dataset.action === "logout") {
      logout();
    }

    if (target.dataset.action === "toggle-internal-user-form") {
      state.showInternalUserForm = !state.showInternalUserForm;
      render();
    }

    if (target.dataset.action === "edit-user") {
      state.editingUserId = target.closest("[data-user-id]")?.dataset.userId || null;
      render();
    }

    if (target.dataset.action === "view-user-tracking") {
      state.selectedExternalUserId = target.closest("[data-user-id]")?.dataset.userId || null;
      await loadClientPreview();
      render();
    }

    if (target.dataset.action === "cancel-user-edit") {
      state.editingUserId = null;
      render();
    }

    if (target.dataset.action === "save-user") {
      const row = target.closest("[data-user-id]");
      const userId = row?.dataset.userId;
      if (!userId) return;
      const activeSection = state.activeSection;
      const password = row.querySelector('[data-field="password"]').value;
      const body = {
        fullName: row.querySelector('[data-field="fullName"]').value,
        email: row.querySelector('[data-field="email"]').value
      };
      if (password) {
        body.password = password;
      }
      await api(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      state.editingUserId = null;
      await loadSession();
      state.activeSection = activeSection;
      toast(password ? "Usuario y contraseña actualizados" : "Usuario actualizado");
    }

    if (target.dataset.action === "delete-user") {
      const row = target.closest("[data-user-id]");
      const userId = row?.dataset.userId;
      const user = state.users.find((item) => item.id === userId);
      if (!userId || !user) return;
      if (!window.confirm(`Eliminar a ${user.fullName}?`)) return;
      const activeSection = state.activeSection;
      await api(`/api/admin/users/${userId}`, { method: "DELETE" });
      await loadSession();
      state.activeSection = activeSection;
      toast("Usuario eliminado");
    }

    if (target.dataset.action === "delete-property") {
      const card = target.closest("[data-property-id]");
      const propertyId = card?.dataset.propertyId;
      const property = state.properties.find((item) => item.id === propertyId);
      if (!propertyId || !property) return;
      if (!window.confirm(`Eliminar el inmueble "${property.title}"?`)) return;
      await api(`/api/admin/properties/${propertyId}`, { method: "DELETE" });
      await loadSession();
      state.activeSection = "properties";
      toast("Inmueble eliminado");
    }

    if (target.dataset.action === "void-payment") {
      const paymentId = target.dataset.paymentId;
      if (!paymentId) return;
      if (!window.confirm("¿Anular este pago registrado? El cliente dejará de ver esa etapa como contratada.")) return;
      await api(`/api/admin/payments/${paymentId}/void`, { method: "POST" });
      await loadSession();
      state.activeSection = "externalUsers";
      toast("Pago anulado");
    }

  } catch (error) {
    toast(error.message);
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  const formName = form.dataset.form;
  if (!formName) return;
  event.preventDefault();
  const formData = new FormData(form);

  try {
    if (formName === "login") {
      const payload = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("accessKey")
        })
      });
      state.token = payload.token;
      localStorage.setItem("remates_staff_token", payload.token);
      await loadSession();
      toast("Sesión iniciada");
    }

    if (formName === "internal-user-create") {
      await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          phone: "",
          password: formData.get("password"),
          roles: ["SALES"],
          status: "ACTIVE"
        })
      });
      form.reset();
      state.showInternalUserForm = false;
      await loadSession();
      state.activeSection = "users";
      toast("Usuario interno creado");
    }

    if (formName === "property-create") {
      await api("/api/admin/properties", {
        method: "POST",
        body: JSON.stringify({
          title: formData.get("title"),
          slug: formData.get("slug"),
          state: formData.get("state"),
          city: formData.get("city"),
          zoneLabel: formData.get("zoneLabel"),
          estimatedValueMxn: Number(formData.get("estimatedValueMxn")),
          legalBidMxn: Number(formData.get("legalBidMxn")),
          discountPct: Number(formData.get("discountPct")),
          auctionRound: formData.get("auctionRound"),
          shortDescription: formData.get("shortDescription"),
          auctionDate: formData.get("auctionDate"),
          auctionTime: formData.get("auctionTime"),
          courtName: formData.get("courtName"),
          fullAddress: formData.get("fullAddress"),
          legalSummary: formData.get("legalSummary"),
          riskNotes: formData.get("riskNotes"),
          publicStatus: "PUBLISHED"
        })
      });
      form.reset();
      await loadSession();
      state.activeSection = "properties";
      toast("Inmueble creado");
    }

    if (formName === "property-update") {
      await api(`/api/admin/properties/${formData.get("propertyId")}`, {
        method: "PATCH",
        body: JSON.stringify({
          publicStatus: formData.get("publicStatus"),
          featured: formData.get("featured") === "true"
        })
      });
      await loadSession();
      state.activeSection = "properties";
      toast("Inmueble actualizado");
    }

    if (formName === "case-update") {
      await api(`/api/admin/cases/${formData.get("caseId")}`, {
        method: "PATCH",
        body: JSON.stringify({
          currentStage: formData.get("currentStage")
        })
      });
      await loadSession();
      state.activeSection = "externalUsers";
      await loadClientPreview();
      toast("Expediente actualizado");
    }

  } catch (error) {
    toast(error.message);
  }
});

(async function boot() {
  try {
    if (state.token) {
      await loadSession();
    }
  } catch {
    logout();
  }
  render();
})();
