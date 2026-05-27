const state = {
  token: localStorage.getItem("remates_staff_token") || "",
  me: null,
  users: [],
  cases: [],
  properties: [],
  activeSection: "users",
  editingUserId: null,
  editingPropertyId: null,
  showInternalUserForm: false,
  showExternalUserForm: false,
  selectedExternalUserId: null,
  clientPreview: null,
  passwordResetMode: new URLSearchParams(window.location.search).get("resetToken") ? "confirm" : "login",
  passwordResetToken: new URLSearchParams(window.location.search).get("resetToken") || "",
  passwordResetUrl: "",
  toast: "",
};

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0
});
const dateFormatter = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });
const app = document.querySelector("#app");
const APP_VERSION = window.REMATES_APP_VERSION_LABEL || "Versión local";
const STAFF_ROLES = ["SALES", "LEGAL", "FINANCE", "CONTENT", "ADMIN"];
const STAGE_LABELS = {
  LEAD: "Interés inicial",
  ADVISORY: "Asesoría personalizada",
  REPRESENTATION: "Preparación y acompañamiento",
  POSSESSION: "Obtención de posesión"
};
const STATUS_LABELS = {
  NEW: "Nuevo",
  ACTIVE: "Activo",
  ON_HOLD: "En pausa",
  AWARDED: "Adjudicado",
  CLOSED: "Cerrado"
};
const PAYMENT_STATUS_LABELS = {
  APPROVED: "Procesado exitosamente",
  PENDING: "Pendiente de confirmación",
  VOID: "Anulado",
  FAILED: "No procesado"
};
const CLIENT_STAGES = ["LEAD", "ADVISORY", "REPRESENTATION", "POSSESSION"];
const PROPERTY_STATUS_OPTIONS = [
  ["PUBLISHED", "PUBLICADO"],
  ["DRAFT", "BORRADOR"],
  ["ARCHIVED", "ARCHIVADO"],
  ["SOLD", "VENDIDO"],
  ["DELIVERED", "ENTREGADO"]
];
const PROPERTY_STATUS_LABELS = Object.fromEntries(PROPERTY_STATUS_OPTIONS);
// Fuente: Directorio del Poder Judicial de la Ciudad de México, actualización Del 16/04/2026 al 30/04/2026.
const COURT_OPTIONS = Array.isArray(window.REMATES_COURT_OPTIONS) ? window.REMATES_COURT_OPTIONS : [];

function auctionRoundLabel(value) {
  const labels = {
    PRIMERA: "Primera almoneda",
    SEGUNDA: "Segunda almoneda",
    POSTERIOR: "Posterior almoneda"
  };
  return labels[value] || "Almoneda por confirmar";
}

function propertyDisplayLabel(property, index) {
  return property.displayId || `Inmueble ${String(index + 1).padStart(3, "0")}`;
}

function propertyStatusLabel(status) {
  return PROPERTY_STATUS_LABELS[status] || status || "BORRADOR";
}

function dateInputValue(value) {
  return value ? String(value).slice(0, 10) : "";
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "remate-inmobiliario";
}

function getEventElementTarget(event) {
  return event.target instanceof Element ? event.target : event.target?.parentElement || null;
}

function enhancePasswordFields() {
  document.querySelectorAll('input[type="password"], input[data-password-visible="true"]').forEach((input) => {
    if (input.closest(".password-field")) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "password-field";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "password-toggle";
    button.setAttribute("aria-label", "Mostrar contraseña");
    button.textContent = "👁";
    wrapper.appendChild(button);
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return currencyFormatter.format(Number(value || 0));
}

function parseCurrencyValue(value = "") {
  const number = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function formatCurrencyInputValue(value = "") {
  const number = parseCurrencyValue(value);
  return number ? currencyFormatter.format(number).replace(/^\$\s?/, "").replace(/\s?MXN$/, "") : "";
}

function paymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] || status || "Pendiente";
}

function date(value) {
  return value ? dateFormatter.format(new Date(value)) : "Pendiente";
}

function toast(message) {
  state.toast = message;
  render();
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    state.toast = "";
    render();
  }, 2600);
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (state.token) {
    headers.set("Authorization", `Bearer ${state.token}`);
  }

  const response = await fetch(path, { ...options, headers });
  const payload = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || "No fue posible completar la acción");
  }
  return payload;
}

async function loadSession() {
  const [me, users, cases, properties] = await Promise.all([
    api("/api/me"),
    api("/api/admin/users"),
    api("/api/admin/cases"),
    api("/api/admin/properties")
  ]);

  if (!me.user.roles.some((role) => ["SALES", "LEGAL", "FINANCE", "CONTENT", "ADMIN"].includes(role))) {
    throw new Error("Esta cuenta no tiene acceso al panel interno");
  }

  state.me = me.user;
  state.users = users.items;
  state.cases = cases.items;
  state.properties = properties.items;
  if (state.activeSection === "externalUsers") {
    await loadClientPreview();
  }
}

async function loadClientPreview() {
  if (!state.selectedExternalUserId) {
    state.clientPreview = null;
    return;
  }
  const payload = await api(`/api/admin/users/${state.selectedExternalUserId}/client-dashboard`);
  state.clientPreview = payload;
}

function logout() {
  state.token = "";
  localStorage.removeItem("remates_staff_token");
  state.me = null;
  state.users = [];
  state.cases = [];
  state.properties = [];
  state.activeSection = "users";
  state.showInternalUserForm = false;
  state.showExternalUserForm = false;
  state.selectedExternalUserId = null;
  render();
}
