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

    if (target.dataset.action === "password-reset-request") {
      state.passwordResetMode = "request";
      state.passwordResetUrl = "";
      render();
    }

    if (target.dataset.action === "password-reset-cancel") {
      state.passwordResetMode = "login";
      state.passwordResetToken = "";
      state.passwordResetUrl = "";
      window.history.replaceState({}, "", "/admin");
      render();
    }

    if (target.dataset.action === "toggle-internal-user-form") {
      state.showInternalUserForm = !state.showInternalUserForm;
      render();
    }

    if (target.dataset.action === "toggle-external-user-form") {
      state.showExternalUserForm = !state.showExternalUserForm;
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

    if (target.dataset.action === "edit-property") {
      state.editingPropertyId = target.closest("[data-property-id]")?.dataset.propertyId || null;
      render();
    }

    if (target.dataset.action === "cancel-property-edit") {
      state.editingPropertyId = null;
      render();
    }

    if (target.dataset.action === "recalculate-property-bid") {
      const form = target.closest("form");
      const legalBidInput = form?.querySelector('[name="legalBidMxn"]');
      const discountInput = form?.querySelector('[name="discountPct"]');
      const estimated = parseCurrencyValue(form?.querySelector('[name="estimatedValueMxn"]')?.value || 0);
      const legalBid = Math.round((estimated * 2) / 3);
      if (legalBid && legalBidInput && discountInput) {
        legalBidInput.value = formatCurrencyInputValue(legalBid);
        discountInput.value = "33";
        toast(`Postura recalculada: ${money(legalBid)}`);
      }
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

document.addEventListener("input", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;

  if (input.matches("[data-currency-input]")) {
    input.value = formatCurrencyInputValue(input.value);
    input.setSelectionRange(input.value.length, input.value.length);
  }

  const form = input.closest('form[data-form="property-create"]');
  if (!form) return;

  if (input.name === "slug") {
    input.dataset.generatedSlug = "false";
  }

  if (input.name === "title") {
    const slugInput = form.querySelector('[name="slug"]');
    if (slugInput instanceof HTMLInputElement && slugInput.dataset.generatedSlug !== "false") {
      slugInput.value = slugify(input.value);
    }
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement) || !target.matches("[data-autosave-property-select]")) {
    return;
  }

  const form = target.closest('form[data-form="property-update"]');
  if (form instanceof HTMLFormElement) {
    form.requestSubmit();
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

    if (formName === "password-reset-request") {
      const payload = await api("/api/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email: formData.get("email"), app: "admin" })
      });
      state.passwordResetUrl = payload.resetUrl || "";
      state.passwordResetMode = "sent";
      toast("Revisa tu correo de recuperación");
    }

    if (formName === "password-reset-confirm") {
      await api("/api/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({
          token: state.passwordResetToken,
          password: formData.get("password")
        })
      });
      state.passwordResetMode = "login";
      state.passwordResetToken = "";
      state.passwordResetUrl = "";
      window.history.replaceState({}, "", "/admin");
      toast("Contraseña actualizada. Ya puedes iniciar sesión.");
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

    if (formName === "external-user-create") {
      const payload = await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          gender: formData.get("gender"),
          password: formData.get("password"),
          roles: ["CLIENT"],
          status: "ACTIVE"
        })
      });
      form.reset();
      state.showExternalUserForm = false;
      state.selectedExternalUserId = payload.item.id;
      await loadSession();
      state.activeSection = "externalUsers";
      toast("Usuario externo creado");
    }

    if (formName === "property-create") {
      const location = deriveLocationParts(formData.get("fullAddress"));
      await api("/api/admin/properties", {
        method: "POST",
        body: JSON.stringify({
          title: formData.get("title"),
          slug: formData.get("slug"),
          state: location.state,
          city: location.city,
          zoneLabel: location.zoneLabel,
          estimatedValueMxn: parseCurrencyValue(formData.get("estimatedValueMxn")),
          legalBidMxn: parseCurrencyValue(formData.get("legalBidMxn")),
          discountPct: Number(formData.get("discountPct")),
          auctionRound: formData.get("auctionRound"),
          shortDescription: formData.get("shortDescription"),
          auctionDate: formData.get("auctionDate"),
          auctionTime: formData.get("auctionTime"),
          courtName: formData.get("courtName"),
          fullAddress: formData.get("fullAddress"),
          legalSummary: formData.get("legalSummary"),
          riskNotes: formData.get("riskNotes"),
          featured: formData.get("featured") === "on"
        })
      });
      form.reset();
      await loadSession();
      state.activeSection = "properties";
      toast("Inmueble creado");
    }

    if (formName === "property-update") {
      const featuredValues = formData.getAll("featured").map((value) => String(value));
      const body = {
        publicStatus: formData.get("publicStatus"),
        featured: featuredValues.includes("true") || featuredValues.includes("on")
      };
      [
        "title",
        "state",
        "city",
        "zoneLabel",
        "auctionRound",
        "shortDescription",
        "auctionDate",
        "auctionTime",
        "courtName",
        "fullAddress"
      ].forEach((field) => {
        if (formData.has(field)) {
          body[field] = formData.get(field);
        }
      });
      if (formData.has("fullAddress") && !formData.has("state") && !formData.has("city") && !formData.has("zoneLabel")) {
        Object.assign(body, deriveLocationParts(formData.get("fullAddress")));
      }
      ["estimatedValueMxn", "legalBidMxn", "discountPct"].forEach((field) => {
        if (formData.has(field)) {
          body[field] = field === "discountPct" ? Number(formData.get(field)) : parseCurrencyValue(formData.get(field));
        }
      });
      await api(`/api/admin/properties/${formData.get("propertyId")}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      state.editingPropertyId = null;
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

function deriveLocationParts(fullAddress) {
  const parts = String(fullAddress || "")
    .split(",")
    .map((part) => cleanAddressPart(part))
    .filter(Boolean);
  const stateIndex = findLastIndex(parts, (part) => Boolean(stateNameFromText(part)));
  const state = stateIndex >= 0 ? stateNameFromText(parts[stateIndex]) : stateNameFromText(parts.at(-1) || "") || "Ciudad de México";
  const beforeState = stateIndex >= 0 ? parts.slice(0, stateIndex) : parts.slice(0, -1);
  const usableParts = beforeState
    .map((part) => cleanAddressPart(part.replace(/\bC\.?\s*P\.?\s*\d{4,6}\b/gi, "").replace(/\b\d{4,6}\b/g, "")))
    .filter((part) => part && !isAddressUnitPart(part));
  const city = toDisplayLocation(usableParts.at(-1) || (state === "Ciudad de México" ? "Ciudad de México" : state));
  const zoneLabel = toDisplayLocation(stripZonePrefix(usableParts.at(-2) || city));

  return {
    state,
    city,
    zoneLabel
  };
}

function findLastIndex(items, predicate) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index], index)) {
      return index;
    }
  }
  return -1;
}

function cleanAddressPart(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isAddressUnitPart(value) {
  return /^(depto|departamento|int|interior|local|piso|torre|edificio)\b/i.test(cleanAddressPart(value));
}

function stripZonePrefix(value) {
  return cleanAddressPart(value).replace(/^(colonia|col\.?|fraccionamiento|fracc\.?|barrio|pueblo)\s+/i, "");
}

function stateNameFromText(value) {
  const normalized = normalizeLocationText(value);
  const state = MEXICAN_STATE_ALIASES.find(([alias]) => normalized.includes(alias));
  return state?.[1] || "";
}

function normalizeLocationText(value) {
  return cleanAddressPart(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function toDisplayLocation(value) {
  const clean = cleanAddressPart(value);
  if (!clean) {
    return "Ubicación por confirmar";
  }
  if (stateNameFromText(clean) === "Ciudad de México" && ["CDMX", "CIUDAD DE MEXICO"].includes(normalizeLocationText(clean))) {
    return "Ciudad de México";
  }
  return clean
    .toLocaleLowerCase("es-MX")
    .replace(/(^|[\s.])([a-záéíóúñü])/g, (match, separator, letter) => `${separator}${letter.toLocaleUpperCase("es-MX")}`);
}

const MEXICAN_STATE_ALIASES = [
  ["CIUDAD DE MEXICO", "Ciudad de México"],
  ["CDMX", "Ciudad de México"],
  ["AGUASCALIENTES", "Aguascalientes"],
  ["BAJA CALIFORNIA SUR", "Baja California Sur"],
  ["BAJA CALIFORNIA", "Baja California"],
  ["CAMPECHE", "Campeche"],
  ["CHIAPAS", "Chiapas"],
  ["CHIHUAHUA", "Chihuahua"],
  ["COAHUILA", "Coahuila"],
  ["COLIMA", "Colima"],
  ["DURANGO", "Durango"],
  ["GUANAJUATO", "Guanajuato"],
  ["GUERRERO", "Guerrero"],
  ["HIDALGO", "Hidalgo"],
  ["JALISCO", "Jalisco"],
  ["ESTADO DE MEXICO", "Estado de México"],
  ["EDOMEX", "Estado de México"],
  ["MICHOACAN", "Michoacán"],
  ["MORELOS", "Morelos"],
  ["NAYARIT", "Nayarit"],
  ["NUEVO LEON", "Nuevo León"],
  ["OAXACA", "Oaxaca"],
  ["PUEBLA", "Puebla"],
  ["QUERETARO", "Querétaro"],
  ["QUINTANA ROO", "Quintana Roo"],
  ["SAN LUIS POTOSI", "San Luis Potosí"],
  ["SINALOA", "Sinaloa"],
  ["SONORA", "Sonora"],
  ["TABASCO", "Tabasco"],
  ["TAMAULIPAS", "Tamaulipas"],
  ["TLAXCALA", "Tlaxcala"],
  ["VERACRUZ", "Veracruz"],
  ["YUCATAN", "Yucatán"],
  ["ZACATECAS", "Zacatecas"]
];
