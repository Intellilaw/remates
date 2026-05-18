const STAGES = [
  {
    code: "ADVISORY",
    title: "1. Asesoría personalizada",
    amountMxn: 3000,
    summary: "Antes de invertir más, desbloqueas el órgano subastador y la hora de la almoneda, y recibes una asesoría personalizada para entender el expediente, la postura legal y los siguientes pasos.",
    details: [
      "Ves datos operativos que no aparecen en la ficha pública.",
      "Resolvemos tus dudas sobre la subasta, la postura y el proceso.",
      "Decides con más claridad si vale la pena avanzar."
    ]
  },
  {
    code: "REPRESENTATION",
    title: "2. Preparación y acompañamiento",
    amountMxn: 20000,
    summary: "Si decides participar, te acompañamos en la preparación, la audiencia, la compra del billete de depósito y su recuperación si el inmueble no te es adjudicado.",
    details: [
      "Preparamos contigo la estrategia para participar.",
      "Te guiamos antes y durante la audiencia.",
      "Cuidamos el manejo del billete de depósito."
    ]
  },
  {
    code: "POSSESSION",
    title: "3. Obtención de posesión",
    amountMxn: 70000,
    summary: "Disponible únicamente después de la adjudicación. Si quieres que te acompañemos en esta etapa, ayudamos a impulsar la entrega y posesión del inmueble conforme a lo ordenado por el juez.",
    details: [
      "Solo puede contratarse si ya hubo adjudicación.",
      "El juez ordena la entrega al adjudicatario.",
      "Damos seguimiento a la etapa de posesión."
    ]
  }
];

const STAGE_LABELS = {
  LEAD: "Interés inicial",
  ADVISORY: "Asesoría personalizada",
  REPRESENTATION: "Preparación y acompañamiento",
  POSSESSION: "Obtención de posesión"
};

const STATUS_LABELS = {
  NEW: "Expediente nuevo",
  ACTIVE: "En proceso",
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

const DASHBOARD_PATH = "/dashboard";
const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
const isDashboardRoute = currentPath === DASHBOARD_PATH;

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium"
});
const APP_VERSION = "Versión 1.3";
const initialPasswordResetToken = new URLSearchParams(window.location.search).get("resetToken") || "";

const state = {
  token: localStorage.getItem("remates_client_token") || "",
  me: null,
  providers: null,
  properties: [],
  education: null,
  propertyDetail: null,
  selectedCaseId: localStorage.getItem("remates_selected_case_id") || null,
  cases: [],
  messages: [],
  authOpen: Boolean(initialPasswordResetToken),
  authMode: initialPasswordResetToken ? "reset-confirm" : "login",
  authPasswordVisible: false,
  passwordResetToken: initialPasswordResetToken,
  passwordResetUrl: "",
  toast: "",
  filters: {
    borough: "all"
  },
  checkoutPayment: null,
  pollingHandle: null
};

const app = document.querySelector("#app");
const WHATSAPP_LINK = "https://wa.me/525513600354?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20remates%20inmobiliarios.";

function renderWhatsAppIcon() {
  return `
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M16 3.2A12.7 12.7 0 0 0 5.1 22.4L3.5 28.8l6.6-1.6A12.7 12.7 0 1 0 16 3.2Z" fill="currentColor"/>
      <path d="M22.9 19.4c-.4 1.1-2 2-3.1 2.2-.8.1-1.9.2-5.5-1.3-4.6-1.9-7.6-6.6-7.8-6.9-.2-.3-1.9-2.5-1.9-4.8s1.2-3.4 1.7-3.9c.4-.4.9-.6 1.3-.6h.9c.3 0 .7-.1 1 .8.4.9 1.3 3.1 1.4 3.3.1.2.2.5 0 .8-.2.4-.3.5-.6.8-.3.3-.6.7-.8.9-.3.3-.6.6-.2 1.2.4.6 1.6 2.6 3.4 4.2 2.3 2.1 4.2 2.7 4.9 3 .6.2 1 .2 1.4-.2.4-.5 1.6-1.9 2-2.5.4-.6.8-.5 1.3-.3.5.2 3.3 1.6 3.9 1.9.6.3 1 .4 1.1.7.1.2.1 1.3-.3 2.4Z" fill="#fff"/>
    </svg>
  `;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : "Pendiente";
}

function formatDateTime(dateValue, timeValue) {
  if (!dateValue && !timeValue) {
    return "Pendiente";
  }
  if (!timeValue) {
    return formatDate(dateValue);
  }
  return `${formatDate(dateValue)} · ${escapeHtml(timeValue)}`;
}

function auctionRoundLabel(value) {
  const labels = {
    PRIMERA: "Primera almoneda",
    SEGUNDA: "Segunda almoneda",
    POSTERIOR: "Posterior almoneda"
  };
  return labels[value] || "Almoneda por confirmar";
}

function paymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] || status || "Pendiente";
}

function setToast(message) {
  state.toast = message;
  render();
  window.clearTimeout(setToast.timeout);
  setToast.timeout = window.setTimeout(() => {
    state.toast = "";
    render();
  }, 2800);
}

function getEventElementTarget(event) {
  return event.target instanceof Element ? event.target : event.target?.parentElement || null;
}

function getSelectedCase() {
  return state.cases.find((item) => item.id === state.selectedCaseId) || state.cases[0] || null;
}

function setSelectedCase(caseId) {
  state.selectedCaseId = caseId;
  if (caseId) {
    localStorage.setItem("remates_selected_case_id", caseId);
  } else {
    localStorage.removeItem("remates_selected_case_id");
  }
}

function welcomeLabel(user) {
  if (!user) {
    return "Bienvenida";
  }
  if (user.gender === "FEMALE") {
    return "Bienvenida";
  }
  if (user.gender === "MALE") {
    return "Bienvenido";
  }
  return "Te damos la bienvenida";
}

function firstName(user) {
  return String(user?.fullName || user?.email || "cliente").trim().split(/\s+/)[0];
}

function findStage(code) {
  return STAGES.find((stage) => stage.code === code) || null;
}

function findCaseByPropertyId(propertyId) {
  return state.cases.find((item) => item.property?.id === propertyId) || null;
}

function openAuth(mode = state.authMode) {
  state.authOpen = true;
  state.authMode = mode;
  state.authPasswordVisible = false;
  state.passwordResetUrl = "";
  render();
}

function closeAuth() {
  state.authOpen = false;
  state.authPasswordVisible = false;
  state.passwordResetUrl = "";
  render();
}

function switchAuth(mode) {
  state.authMode = mode;
  state.authPasswordVisible = false;
  state.passwordResetUrl = "";
  render();
}

function toggleAuthPassword(buttonElement) {
  const button = buttonElement instanceof HTMLElement ? buttonElement : null;
  const wrapper = button?.closest(".password-field");
  const input = wrapper?.querySelector("input");
  if (!button || !input) {
    return;
  }

  const visible = input.type === "text";
  input.type = visible ? "password" : "text";
  state.authPasswordVisible = !visible;
  button.textContent = visible ? "👁" : "🙈";
  button.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
}

function goToDashboard() {
  window.location.assign(DASHBOARD_PATH);
}

function validateAuthForm(formName, formData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email) {
    throw new Error("Ingresa tu correo electrónico.");
  }

  if (!password) {
    throw new Error("Ingresa tu contraseña.");
  }

  if (formName === "register") {
    const fullName = String(formData.get("fullName") || "").trim();
    const gender = String(formData.get("gender") || "");
    if (!fullName) {
      throw new Error("Ingresa tu nombre completo.");
    }
    if (!gender) {
      throw new Error("Selecciona cómo prefieres que te demos la bienvenida.");
    }
  }

  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (state.token) {
    headers.set("Authorization", `Bearer ${state.token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "No fue posible completar la acción");
  }

  return payload;
}

async function bootstrap() {
  try {
    const [properties, education, providers] = await Promise.all([
      api("/api/properties"),
      api("/api/content/education"),
      api("/api/auth/providers")
    ]);

    state.properties = properties.items.filter((item) => item.state === "Ciudad de México");
    state.education = education.item;
    state.providers = providers;

    if (state.token) {
      await loadSession();
    }

    render();
    await api("/api/tracking/events", {
      method: "POST",
      body: JSON.stringify({
        eventType: "visit",
        metadata: {
          pathname: window.location.pathname,
          area: isDashboardRoute ? "dashboard_v1" : "homepage_v1"
        }
      })
    }).catch(() => null);
  } catch (error) {
    setToast(error.message);
  }
}

async function loadSession() {
  try {
    const [me, cases] = await Promise.all([api("/api/me"), api("/api/me/cases")]);
    state.me = me.user;
    state.cases = cases.items;
    const preferredCase = state.cases.find((item) => item.id === state.selectedCaseId)?.id || state.cases[0]?.id || null;
    setSelectedCase(preferredCase);
    const activeCase = getSelectedCase();
    if (activeCase?.conversationId) {
      await loadMessages(activeCase.conversationId);
      await ensureConversationPolling();
    }
  } catch {
    logout(false);
  }
}

function stopPolling() {
  if (state.pollingHandle) {
    window.clearInterval(state.pollingHandle);
    state.pollingHandle = null;
  }
}

async function ensureConversationPolling() {
  stopPolling();
  const activeCase = getSelectedCase();
  if (!activeCase?.conversationId) {
    return;
  }
  state.pollingHandle = window.setInterval(() => {
    loadMessages(activeCase.conversationId).catch(() => null);
  }, 8000);
}

function logout(shouldRender = true) {
  state.token = "";
  state.me = null;
  state.cases = [];
  state.messages = [];
  setSelectedCase(null);
  localStorage.removeItem("remates_client_token");
  stopPolling();
  if (shouldRender) {
    render();
  }
}

function filteredProperties() {
  return state.properties.filter((property) => {
    const matchesBorough = state.filters.borough === "all" || property.city === state.filters.borough;
    return matchesBorough;
  });
}

async function openProperty(slug) {
  const payload = await api(`/api/properties/${slug}`);
  state.propertyDetail = payload.item;
  render();
}

async function createCase(propertyId) {
  const payload = await api("/api/cases", {
    method: "POST",
    body: JSON.stringify({
      propertyId,
      leadSource: isDashboardRoute ? "dashboard_v1" : "homepage_v1"
    })
  });
  await loadSession();
  setSelectedCase(payload.item.id);
  setToast(payload.existing ? "Ese expediente ya estaba abierto en tu cuenta." : "Expediente creado. Ya puedes avanzar por etapas desde tu dashboard.");
  if (!isDashboardRoute) {
    goToDashboard();
  } else {
    render();
  }
}

async function loadMessages(conversationId) {
  const payload = await api(`/api/conversations/${conversationId}/messages`);
  state.messages = payload.items;
  render();
}

async function startCheckout(caseId, stageCode) {
  const payload = await api(`/api/cases/${caseId}/payments/${stageCode}/checkout`, {
    method: "POST",
    body: JSON.stringify({})
  });
  state.checkoutPayment = payload.item;
  render();
}

async function confirmCheckout(paymentId) {
  await api(`/api/payments/${paymentId}/confirm`, {
    method: "POST",
    body: JSON.stringify({})
  });
  state.checkoutPayment = null;
  await loadSession();
  setToast("Pago confirmado. Tu expediente avanzó a la siguiente etapa.");
}

async function sendMessage(body) {
  const activeCase = getSelectedCase();
  if (!activeCase?.conversationId) {
    return;
  }
  await api(`/api/conversations/${activeCase.conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body })
  });
  await loadMessages(activeCase.conversationId);
}
