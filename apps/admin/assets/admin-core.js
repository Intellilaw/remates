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
const COURT_OPTIONS = [
  "JUZGADO DE LO CIVIL 4",
  "JUZGADO DE LO CIVIL 6",
  "JUZGADO DE LO CIVIL 7",
  "JUZGADO DE LO CIVIL 8",
  "JUZGADO DE LO CIVIL 9",
  "JUZGADO DE LO CIVIL 10",
  "JUZGADO DE LO CIVIL 11",
  "JUZGADO DE LO CIVIL 12",
  "JUZGADO DE LO CIVIL 13",
  "JUZGADO DE LO CIVIL 14",
  "JUZGADO DE LO CIVIL 15",
  "JUZGADO DE LO CIVIL 16",
  "JUZGADO DE LO CIVIL 17",
  "JUZGADO DE LO CIVIL 18",
  "JUZGADO DE LO CIVIL 19",
  "JUZGADO DE LO CIVIL 20",
  "JUZGADO DE LO CIVIL 23",
  "JUZGADO DE LO CIVIL 24",
  "JUZGADO DE LO CIVIL 25",
  "JUZGADO DE LO CIVIL 27",
  "JUZGADO DE LO CIVIL 28",
  "JUZGADO DE LO CIVIL 29",
  "JUZGADO DE LO CIVIL 30",
  "JUZGADO DE LO CIVIL 31",
  "JUZGADO DE LO CIVIL 32",
  "JUZGADO DE LO CIVIL 33",
  "JUZGADO DE LO CIVIL 34",
  "JUZGADO DE LO CIVIL 35",
  "JUZGADO DE LO CIVIL 36",
  "JUZGADO DE LO CIVIL 38",
  "JUZGADO DE LO CIVIL 39",
  "JUZGADO DE LO CIVIL 40",
  "JUZGADO DE LO CIVIL 41",
  "JUZGADO DE LO CIVIL 42",
  "JUZGADO DE LO CIVIL 44",
  "JUZGADO DE LO CIVIL 45",
  "JUZGADO DE LO CIVIL 46",
  "JUZGADO DE LO CIVIL 47",
  "JUZGADO DE LO CIVIL 49",
  "JUZGADO DE LO CIVIL 51",
  "JUZGADO DE LO CIVIL 52",
  "JUZGADO DE LO CIVIL 54",
  "JUZGADO DE LO CIVIL 55",
  "JUZGADO DE LO CIVIL 57",
  "JUZGADO DE LO CIVIL 58",
  "JUZGADO DE LO CIVIL 60",
  "JUZGADO DE LO CIVIL 61",
  "JUZGADO DE LO CIVIL 62",
  "JUZGADO DE LO CIVIL 64",
  "JUZGADO DE LO CIVIL 65",
  "JUZGADO DE LO CIVIL 67",
  "JUZGADO CIVIL DE PROCESO ORAL 1",
  "JUZGADO CIVIL DE PROCESO ORAL 2",
  "JUZGADO CIVIL DE PROCESO ORAL 3",
  "JUZGADO CIVIL DE PROCESO ORAL 4",
  "JUZGADO CIVIL DE PROCESO ORAL 5",
  "JUZGADO CIVIL DE PROCESO ORAL 6",
  "JUZGADO CIVIL DE PROCESO ORAL 7",
  "JUZGADO CIVIL DE PROCESO ORAL 8",
  "JUZGADO CIVIL DE PROCESO ORAL 9",
  "JUZGADO CIVIL DE PROCESO ORAL 10",
  "JUZGADO CIVIL DE PROCESO ORAL 11",
  "JUZGADO CIVIL DE PROCESO ORAL 12",
  "JUZGADO CIVIL DE PROCESO ORAL 13",
  "JUZGADO CIVIL DE PROCESO ORAL 17",
  "JUZGADO CIVIL DE PROCESO ORAL 18",
  "JUZGADO CIVIL DE PROCESO ORAL 19",
  "JUZGADO CIVIL DE PROCESO ORAL 20",
  "JUZGADO CIVIL DE PROCESO ORAL 21",
  "JUZGADO CIVIL DE PROCESO ORAL 22",
  "JUZGADO CIVIL DE PROCESO ORAL 23",
  "JUZGADO CIVIL DE PROCESO ORAL 24",
  "JUZGADO CIVIL DE PROCESO ORAL 25",
  "JUZGADO CIVIL DE PROCESO ORAL 30",
  "JUZGADO CIVIL DE PROCESO ORAL 31",
  "JUZGADO CIVIL DE PROCESO ORAL 32",
  "JUZGADO CIVIL DE PROCESO ORAL 33",
  "JUZGADO CIVIL DE PROCESO ORAL 34",
  "JUZGADO CIVIL DE PROCESO ORAL 35",
  "JUZGADO CIVIL DE PROCESO ORAL 36",
  "JUZGADO CIVIL DE PROCESO ORAL 37",
  "JUZGADO CIVIL DE PROCESO ORAL 39",
  "JUZGADO CIVIL DE PROCESO ORAL 40",
  "JUZGADO CIVIL DE PROCESO ORAL 41",
  "JUZGADO CIVIL DE PROCESO ORAL 42",
  "JUZGADO CIVIL DE PROCESO ORAL 43",
  "JUZGADO CIVIL DE PROCESO ORAL 44",
  "JUZGADO EN MATERIA CIVIL DE PROCESO ORAL Y DE TUTELA DE DERECHOS HUMANOS DE LA CDMX 14",
  "JUZGADO EN MATERIA CIVIL DE PROCESO ORAL Y DE TUTELA DE DERECHOS HUMANOS DE LA CDMX 15",
  "JUZGADO EN MATERIA CIVIL DE PROCESO ORAL Y DE TUTELA DE DERECHOS HUMANOS DE LA CDMX 16",
  "JUZGADO EN MATERIA CIVIL DE PROCESO ORAL Y DE TUTELA DE DERECHOS HUMANOS DE LA CDMX 26",
  "JUZGADO EN MATERIA CIVIL DE PROCESO ORAL Y DE TUTELA DE DERECHOS HUMANOS DE LA CDMX 29",
  "JUZGADO EN MATERIA CIVIL DE PROCESO ORAL Y DE TUTELA DE DERECHOS HUMANOS DE LA CDMX 38",
  "JUZGADO DE LO FAMILIAR 1",
  "JUZGADO DE LO FAMILIAR 2",
  "JUZGADO DE LO FAMILIAR 3",
  "JUZGADO DE LO FAMILIAR 4",
  "JUZGADO DE LO FAMILIAR 5",
  "JUZGADO DE LO FAMILIAR 6",
  "JUZGADO DE LO FAMILIAR 7",
  "JUZGADO DE LO FAMILIAR 8",
  "JUZGADO DE LO FAMILIAR 9",
  "JUZGADO DE LO FAMILIAR 10",
  "JUZGADO DE LO FAMILIAR 11",
  "JUZGADO DE LO FAMILIAR 12",
  "JUZGADO DE LO FAMILIAR 13",
  "JUZGADO DE LO FAMILIAR 14",
  "JUZGADO DE LO FAMILIAR 15",
  "JUZGADO DE LO FAMILIAR 16",
  "JUZGADO DE LO FAMILIAR 17",
  "JUZGADO DE LO FAMILIAR 18",
  "JUZGADO DE LO FAMILIAR 19",
  "JUZGADO DE LO FAMILIAR 20",
  "JUZGADO DE LO FAMILIAR 21",
  "JUZGADO DE LO FAMILIAR 22",
  "JUZGADO DE LO FAMILIAR 23",
  "JUZGADO DE LO FAMILIAR 24",
  "JUZGADO DE LO FAMILIAR 25",
  "JUZGADO DE LO FAMILIAR 26",
  "JUZGADO DE LO FAMILIAR 27",
  "JUZGADO DE LO FAMILIAR 28",
  "JUZGADO DE LO FAMILIAR 30",
  "JUZGADO DE LO FAMILIAR 31",
  "JUZGADO DE LO FAMILIAR 32",
  "JUZGADO DE PROCESO ORAL EN MATERIA FAMILIAR 1",
  "JUZGADO DE PROCESO ORAL EN MATERIA FAMILIAR 2",
  "JUZGADO DE PROCESO ORAL EN MATERIA FAMILIAR 3",
  "JUZGADO DE PROCESO ORAL EN MATERIA FAMILIAR 4",
  "JUZGADO DE PROCESO ORAL EN MATERIA FAMILIAR 5",
  "JUZGADO DE PROCESO ORAL EN MATERIA FAMILIAR 6",
  "JUZGADO DE PROCESO ORAL EN MATERIA FAMILIAR 7",
  "JUZGADO DE PROCESO ORAL EN MATERIA FAMILIAR 8",
  "JUZGADO DE PROCESO ORAL EN MATERIA FAMILIAR 9",
  "JUZGADO DE PROCESO ORAL EN MATERIA FAMILIAR 10",
  "TRIBUNAL LABORAL DE ASUNTOS INDIVIDUALES DE LA CIUDAD DE MÉXICO 1",
  "TRIBUNAL LABORAL DE ASUNTOS INDIVIDUALES DE LA CIUDAD DE MÉXICO 2",
  "TRIBUNAL LABORAL DE ASUNTOS INDIVIDUALES DE LA CIUDAD DE MÉXICO 3",
  "TRIBUNAL LABORAL DE ASUNTOS INDIVIDUALES DE LA CIUDAD DE MÉXICO 4",
  "TRIBUNAL LABORAL DE ASUNTOS INDIVIDUALES DE LA CIUDAD DE MÉXICO 5",
  "TRIBUNAL LABORAL DE ASUNTOS INDIVIDUALES DE LA CIUDAD DE MÉXICO 6",
  "TRIBUNAL LABORAL DE ASUNTOS INDIVIDUALES DE LA CIUDAD DE MÉXICO 7",
  "TRIBUNAL LABORAL DE ASUNTOS INDIVIDUALES DE LA CIUDAD DE MÉXICO 8",
  "TRIBUNAL LABORAL DE ASUNTOS INDIVIDUALES DE LA CIUDAD DE MÉXICO 9",
  "TRIBUNAL LABORAL DE ASUNTOS COLECTIVOS DE LA CIUDAD DE MÉXICO 1"
];

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
