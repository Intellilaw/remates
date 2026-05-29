const app = document.querySelector("#app");
const STAFF_ROLES = ["CONTENT", "ADMIN", "LEGAL"];
const tokenKey = "remates_staff_token";
const nativeApiBaseUrl = document.querySelector('meta[name="api-base-url"]')?.content || "https://remates.legalflow.solutions";
const isNativeShell = Boolean(window.Capacitor?.isNativePlatform?.()) || window.location.protocol === "capacitor:";
const logoSrc = "assets/legalflow-logo.png";
const APP_VERSION = window.REMATES_APP_VERSION_LABEL || "Versión local";
const COURT_OPTIONS = Array.isArray(window.REMATES_COURT_OPTIONS) ? window.REMATES_COURT_OPTIONS : [];

const state = {
  token: localStorage.getItem(tokenKey) || "",
  me: null,
  draft: null,
  extraction: null,
  previewUrl: "",
  selectedFile: null,
  published: null,
  busy: false,
  toast: "",
  selectedFileName: ""
};

const moneyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0
});

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return moneyFormatter.format(Number(value || 0));
}

function fieldValue(value) {
  return escapeHtml(value || "");
}

function parseCurrencyValue(value = "") {
  const number = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function formatCurrencyInputValue(value = "") {
  const number = parseCurrencyValue(value);
  return number ? moneyFormatter.format(number).replace(/^\$\s?/, "").replace(/\s?MXN$/, "") : "";
}

function renderCurrencyInput(name, value = "") {
  const valueAttribute = value === "" || value === null || value === undefined ? "" : ` value="${escapeHtml(formatCurrencyInputValue(value))}"`;
  return `
    <div class="currency-input">
      <span class="currency-symbol" aria-hidden="true">$</span>
      <input name="${name}" type="text" inputmode="numeric" autocomplete="off" data-currency-input${valueAttribute} required />
      <span class="currency-code" aria-hidden="true">MXN</span>
    </div>
  `;
}

function setBusy(value) {
  state.busy = value;
  render();
}

function toast(message) {
  state.toast = message;
  render();
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    state.toast = "";
    render();
  }, 2800);
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (state.token) {
    headers.set("Authorization", `Bearer ${state.token}`);
  }

  const url = isNativeShell && path.startsWith("/api/") ? `${nativeApiBaseUrl}${path}` : path;
  const response = await fetch(url, { ...options, headers });
  const payload = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || "No fue posible completar la accion");
  }
  return payload;
}

async function loadSession() {
  if (!state.token) {
    return;
  }

  const payload = await api("/api/me");
  const hasAccess = payload.user.roles.some((role) => STAFF_ROLES.includes(role));
  if (!hasAccess) {
    throw new Error("Esta cuenta no puede publicar remates");
  }
  state.me = payload.user;
}

function logout() {
  if (state.previewUrl) {
    URL.revokeObjectURL(state.previewUrl);
  }
  state.token = "";
  state.me = null;
  state.draft = null;
  state.extraction = null;
  state.previewUrl = "";
  state.selectedFile = null;
  state.published = null;
  state.selectedFileName = "";
  localStorage.removeItem(tokenKey);
  render();
}

function renderLogin() {
  return `
    <main class="auth-screen">
      <section class="auth-panel">
        <div class="brand">
          <img src="${logoSrc}" alt="LegalFlow" />
          <div>
            <div class="brand__name">Intellilaw Remates</div>
            <div class="brand__tag">Captura móvil</div>
          </div>
        </div>
        <div class="version-pill" aria-label="Versión actual">${APP_VERSION}</div>
        <form class="stack" data-form="login">
          <label>
            <span>Correo</span>
            <input name="email" type="email" autocomplete="email" required />
          </label>
          <label>
            <span>Contraseña</span>
            <input name="password" type="password" autocomplete="current-password" required />
          </label>
          <button class="primary" type="submit" ${state.busy ? "disabled" : ""}>Entrar</button>
        </form>
      </section>
      ${renderToast()}
    </main>
  `;
}

function renderShell() {
  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand">
          <img src="${logoSrc}" alt="LegalFlow" />
          <div>
            <div class="brand__name">Captura de remates</div>
            <div class="brand__tag">${escapeHtml(state.me.fullName)}</div>
          </div>
        </div>
        <button class="icon-button" data-action="logout" type="button" aria-label="Salir">Salir</button>
      </header>
      <div class="version-strip" aria-label="Versión actual">${APP_VERSION}</div>
      ${state.published ? renderPublished() : state.draft ? renderReview() : renderCapture()}
      ${renderToast()}
    </div>
  `;
}

function renderCapture() {
  return `
    <main class="content">
      <section class="mobile-panel">
        <div class="section-head">
          <div>
            <div class="kicker">Nuevo remate</div>
            <h1>Edicto fotografiado</h1>
          </div>
          <span class="status-pill">Borrador</span>
        </div>
        <form class="stack" data-form="extract" novalidate>
          <label class="photo-picker">
            <input name="edict" type="file" accept="image/*" capture="environment" />
            <span class="photo-picker__mark">+</span>
            <span class="photo-picker__text">${state.selectedFileName ? escapeHtml(state.selectedFileName) : "Foto del edicto"}</span>
          </label>
          ${state.previewUrl ? `<img class="preview" src="${escapeHtml(state.previewUrl)}" alt="Edicto seleccionado" />` : ""}
          <label>
            <span>Notas opcionales</span>
            <textarea name="textHint" rows="3" placeholder="Texto visible o referencia interna"></textarea>
          </label>
          <button class="primary" type="submit" ${state.busy ? "disabled" : ""}>Extraer datos</button>
        </form>
      </section>
    </main>
  `;
}

function renderReview() {
  const confidence = state.extraction?.confidence || {};
  return `
    <main class="content content--review">
      <section class="mobile-panel">
        <div class="section-head">
          <div>
            <div class="kicker">Confirmación</div>
            <h1>${escapeHtml(state.draft.title || "Remate inmobiliario")}</h1>
          </div>
          <span class="status-pill status-pill--published">Listo</span>
        </div>
        ${state.previewUrl ? `<img class="preview preview--small" src="${escapeHtml(state.previewUrl)}" alt="Edicto seleccionado" />` : ""}
        <div class="confidence-grid">
          ${confidenceChip("Juzgado", confidence.courtName)}
          ${confidenceChip("Avalúo", confidence.estimatedValueMxn)}
          ${confidenceChip("Postura", confidence.legalBidMxn)}
          ${confidenceChip("Fecha", confidence.auctionDate)}
          ${confidenceChip("Dirección", confidence.fullAddress)}
        </div>
        ${state.draft.legalBidWasComputed ? `<p class="notice">Postura legal calculada como dos terceras partes del avalúo.</p>` : ""}
        ${state.extraction?.rawNotes ? `<p class="notice notice--muted">${escapeHtml(state.extraction.rawNotes)}</p>` : ""}
      </section>
      <form class="mobile-panel stack" data-form="publish">
        <div class="form-section">
          <h2>Datos del remate</h2>
          <label>
            <span>Juzgado del remate</span>
            <select name="courtName" required>
              ${renderCourtOptions(state.draft.courtName)}
            </select>
          </label>
          <div class="two-col">
            <label>
              <span>Valor de avalúo</span>
              ${renderCurrencyInput("estimatedValueMxn", Number(state.draft.estimatedValueMxn || 0))}
            </label>
            <label>
              <span>Postura legal</span>
              ${renderCurrencyInput("legalBidMxn", Number(state.draft.legalBidMxn || 0))}
            </label>
          </div>
          <button class="secondary" data-action="recalculate-bid" type="button">Calcular 2/3</button>
          <div class="two-col">
            <label>
              <span>Fecha de almoneda</span>
              <input name="auctionDate" type="date" value="${escapeHtml(state.draft.auctionDate || "")}" required />
            </label>
            <label>
              <span>Hora de la almoneda</span>
              <input name="auctionTime" type="time" step="60" value="${fieldValue(state.draft.auctionTime)}" />
            </label>
          </div>
          <label>
            <span>Dirección del inmueble</span>
            <textarea name="fullAddress" rows="3" required>${fieldValue(state.draft.fullAddress)}</textarea>
          </label>
        </div>

        <div class="form-section">
          <h2>Publicación web</h2>
          <label>
            <span>Título</span>
            <input name="title" value="${fieldValue(state.draft.title)}" required />
          </label>
          <div class="two-col">
            <label>
              <span>Estado</span>
              <input name="state" value="${fieldValue(state.draft.state)}" required />
            </label>
            <label>
              <span>Ciudad o alcaldía</span>
              <input name="city" value="${fieldValue(state.draft.city)}" required />
            </label>
          </div>
          <label>
            <span>Colonia</span>
            <input name="zoneLabel" value="${fieldValue(state.draft.zoneLabel)}" required />
          </label>
          <div class="two-col">
            <label>
              <span>Descuento %</span>
              <input name="discountPct" type="number" inputmode="numeric" min="0" max="99" step="1" value="${Number(state.draft.discountPct || 0)}" required />
            </label>
            <label>
              <span>Almoneda</span>
              <select name="auctionRound">
                ${["PRIMERA", "SEGUNDA", "POSTERIOR"].map((item) => `<option value="${item}" ${state.draft.auctionRound === item ? "selected" : ""}>${auctionRoundLabel(item)}</option>`).join("")}
              </select>
            </label>
          </div>
          <label>
            <span>Descripción</span>
            <textarea name="shortDescription" rows="3" required>${fieldValue(state.draft.shortDescription)}</textarea>
          </label>
          <label>
            <span>Tags</span>
            <input name="tags" value="${escapeHtml((state.draft.tags || []).join(", "))}" />
          </label>
        </div>

        <div class="sticky-actions">
          <button class="secondary" data-action="back-to-capture" type="button">Nueva foto</button>
          <button class="primary" type="submit" ${state.busy ? "disabled" : ""}>Publicar inmueble</button>
        </div>
      </form>
    </main>
  `;
}

function renderPublished() {
  return `
    <main class="content">
      <section class="mobile-panel result-panel">
        <div class="result-mark">OK</div>
        <div>
          <div class="kicker">Publicado</div>
          <h1>${escapeHtml(state.published.item.title)}</h1>
          <p>${money(state.published.item.legalBidMxn)} de postura legal</p>
        </div>
        <a class="primary text-center" href="${escapeHtml(publicUrl(state.published.publicUrl))}">Abrir publicación</a>
        <button class="secondary" data-action="new-capture" type="button">Capturar otro remate</button>
      </section>
    </main>
  `;
}

function confidenceChip(label, score = 0) {
  const percent = Math.round(Number(score || 0) * 100);
  const tone = percent >= 75 ? "good" : percent >= 45 ? "mid" : "low";
  return `<span class="confidence confidence--${tone}"><strong>${escapeHtml(label)}</strong>${percent}%</span>`;
}

function renderToast() {
  return state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : "";
}

function auctionRoundLabel(value) {
  const labels = {
    PRIMERA: "Primera",
    SEGUNDA: "Segunda",
    POSTERIOR: "Posterior"
  };
  return labels[value] || value;
}

function renderCourtOptions(selectedCourt = "") {
  const selected = String(selectedCourt || "");
  const hasSelectedCourt = selected && !COURT_OPTIONS.includes(selected);
  return `
    <option value="">Selecciona juzgado</option>
    ${hasSelectedCourt ? `<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)}</option>` : ""}
    ${COURT_OPTIONS.map((court) => `<option value="${escapeHtml(court)}" ${selected === court ? "selected" : ""}>${escapeHtml(court)}</option>`).join("")}
  `;
}

function formToDraft(form) {
  const formData = new FormData(form);
  return {
    title: String(formData.get("title") || ""),
    slug: slugify(String(formData.get("slug") || formData.get("title") || "")),
    state: String(formData.get("state") || ""),
    city: String(formData.get("city") || ""),
    zoneLabel: String(formData.get("zoneLabel") || ""),
    estimatedValueMxn: parseCurrencyValue(formData.get("estimatedValueMxn")),
    legalBidMxn: parseCurrencyValue(formData.get("legalBidMxn")),
    discountPct: Number(formData.get("discountPct") || 0),
    auctionRound: String(formData.get("auctionRound") || "PRIMERA"),
    shortDescription: String(formData.get("shortDescription") || ""),
    fullAddress: String(formData.get("fullAddress") || ""),
    auctionDate: String(formData.get("auctionDate") || ""),
    auctionTime: String(formData.get("auctionTime") || ""),
    courtName: String(formData.get("courtName") || ""),
    legalSummary: String(formData.get("legalSummary") || ""),
    riskNotes: String(formData.get("riskNotes") || ""),
    featured: true,
    tags: String(formData.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  };
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

function publicUrl(path) {
  if (!path || String(path).startsWith("http")) {
    return path || nativeApiBaseUrl;
  }
  return isNativeShell ? `${nativeApiBaseUrl}${path}` : path;
}

async function imageFileToDataUrl(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No fue posible leer la foto"));
    image.src = src;
  });
}

function resetCapture() {
  if (state.previewUrl) {
    URL.revokeObjectURL(state.previewUrl);
  }
  state.draft = null;
  state.extraction = null;
  state.previewUrl = "";
  state.selectedFile = null;
  state.published = null;
  state.selectedFileName = "";
}

document.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.type !== "file") {
    return;
  }

  const file = input.files?.[0];
  state.selectedFile = file || null;
  state.selectedFileName = file?.name || "";
  if (state.previewUrl) {
    URL.revokeObjectURL(state.previewUrl);
  }
  state.previewUrl = file ? URL.createObjectURL(file) : "";
  render();
});

document.addEventListener("input", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.matches("[data-currency-input]")) {
    return;
  }

  input.value = formatCurrencyInputValue(input.value);
  input.setSelectionRange(input.value.length, input.value.length);
});

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-action]") : null;
  if (!target) {
    return;
  }

  if (target.dataset.action === "logout") {
    logout();
  }

  if (target.dataset.action === "new-capture" || target.dataset.action === "back-to-capture") {
    resetCapture();
    render();
  }

  if (target.dataset.action === "recalculate-bid") {
    const form = target.closest("form");
    const estimated = parseCurrencyValue(form?.querySelector('[name="estimatedValueMxn"]')?.value || 0);
    const legalBid = Math.round((estimated * 2) / 3);
    if (legalBid) {
      form.querySelector('[name="legalBidMxn"]').value = formatCurrencyInputValue(legalBid);
      form.querySelector('[name="discountPct"]').value = "33";
      state.draft = { ...state.draft, ...formToDraft(form), legalBidWasComputed: true };
      toast(`Postura recalculada: ${money(legalBid)}`);
    }
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }
  const formName = form.dataset.form;
  if (!formName) {
    return;
  }

  event.preventDefault();

  try {
    setBusy(true);
    const formData = new FormData(form);

    if (formName === "login") {
      const payload = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password")
        })
      });
      state.token = payload.token;
      localStorage.setItem(tokenKey, payload.token);
      await loadSession();
      toast("Sesión iniciada");
    }

    if (formName === "extract") {
      const file = state.selectedFile || formData.get("edict");
      if (!(file instanceof File) || !file.size) {
        throw new Error("Selecciona una foto del edicto");
      }
      const imageDataUrl = await imageFileToDataUrl(file);
      const payload = await api("/api/mobile/remates/extract", {
        method: "POST",
        body: JSON.stringify({
          imageDataUrl,
          textHint: formData.get("textHint")
        })
      });
      state.draft = payload.item;
      state.extraction = payload.extraction;
      toast("Datos extraídos");
    }

    if (formName === "publish") {
      const draft = formToDraft(form);
      const payload = await api("/api/mobile/remates/publish", {
        method: "POST",
        body: JSON.stringify({ item: draft })
      });
      state.published = payload;
      state.draft = null;
      state.extraction = null;
      toast("Remate publicado");
    }
  } catch (error) {
    toast(error.message);
  } finally {
    setBusy(false);
  }
});

function render() {
  app.innerHTML = state.me ? renderShell() : renderLogin();
}

(async function boot() {
  if (!isNativeShell && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  try {
    await loadSession();
  } catch {
    logout();
  }
  render();
})();
