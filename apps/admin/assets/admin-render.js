function renderLogin() {
  const authPanel = renderPasswordResetPanel();
  return `
    <div class="login-wrap">
        <div class="login-card">
          <div class="login-grid">
            <div>
              <div class="login-logo"><img src="/assets/legalflow-logo.png" alt="LegalFlow" /></div>
              <div class="kicker">Panel interno</div>
              <h1>Gestión de clientes y expedientes</h1>
            <div class="version-pill version-pill--login" aria-label="Versión actual">${APP_VERSION}</div>
            <p>Administra usuarios, inmuebles, pagos y seguimiento comercial desde una sola consola.</p>
            <div class="chips">
              <span class="chip">Usuarios</span>
              <span class="chip">Expedientes</span>
              <span class="chip">Pagos</span>
            </div>
          </div>
          <div>
            ${authPanel}
            <p class="small"><a href="/">Volver al sitio público</a></p>
          </div>
        </div>
        <div class="version-pill" aria-label="Versión actual">${APP_VERSION}</div>
      </div>
    </div>
  `;
}

function renderPasswordResetPanel() {
  if (state.passwordResetMode === "request") {
    return `
      <form data-form="password-reset-request">
        <input name="email" type="email" placeholder="Correo de la cuenta" required />
        <button class="primary" type="submit">Enviar correo de recuperación</button>
        <button class="ghost" data-action="password-reset-cancel" type="button">Volver a entrar</button>
      </form>
    `;
  }

  if (state.passwordResetMode === "sent") {
    return `
      <div class="stack">
        <p class="small">Si el correo existe, enviaremos instrucciones para recuperar la contraseña.</p>
        ${state.passwordResetUrl ? `<a class="primary text-center" href="${escapeHtml(state.passwordResetUrl)}">Abrir enlace de recuperación</a>` : ""}
        <button class="ghost" data-action="password-reset-cancel" type="button">Volver a entrar</button>
      </div>
    `;
  }

  if (state.passwordResetMode === "confirm") {
    return `
      <form data-form="password-reset-confirm">
        <input name="password" type="password" placeholder="Nueva contraseña" autocomplete="new-password" minlength="8" required />
        <button class="primary" type="submit">Guardar nueva contraseña</button>
        <button class="ghost" data-action="password-reset-cancel" type="button">Cancelar</button>
      </form>
    `;
  }

  return `
    <form data-form="login">
      <input name="email" type="email" placeholder="Correo" required />
      <input name="accessKey" type="password" placeholder="Contraseña" autocomplete="off" autocapitalize="none" spellcheck="false" required />
      <button class="primary" type="submit">Entrar</button>
    </form>
    <p class="small"><button class="link-button" data-action="password-reset-request" type="button">Olvidé mi contraseña</button></p>
  `;
}

function renderSidebar() {
  const sections = [
    ["users", "Usuarios internos"],
    ["externalUsers", "Usuarios externos"],
    ["properties", "Inmuebles"]
  ];

  return `
    <aside class="sidebar">
      <div>
        <div class="kicker">Sesión</div>
        <h3>${escapeHtml(state.me.fullName)}</h3>
        <p class="small">${escapeHtml(state.me.email)}</p>
      </div>
      <div class="menu">
        ${sections.map(([id, label]) => `<button data-action="section" data-section="${id}" class="${state.activeSection === id ? "active" : ""}">${label}</button>`).join("")}
      </div>
      <button class="ghost" data-action="logout">Cerrar sesión</button>
      <a class="ghost" href="/">Abrir sitio público</a>
    </aside>
  `;
}

function renderUsers() {
  const internalUsers = state.users.filter((user) => user.roles.some((role) => STAFF_ROLES.includes(role)));
  return `
    <section class="stack">
      <div class="section-heading">
        <div>
          <div class="kicker">Usuarios internos</div>
          <h2>Equipo interno</h2>
        </div>
        <button class="primary" data-action="toggle-internal-user-form" type="button">${state.showInternalUserForm ? "Cancelar" : "Crear usuario"}</button>
      </div>
      ${state.showInternalUserForm ? renderInternalUserForm() : ""}
    </section>
    ${renderUsersTable({
      users: internalUsers,
      emptyMessage: "No hay usuarios internos.",
      showTracking: false
    })}
  `;
}

function renderExternalUsers() {
  const externalUsers = state.users.filter((user) => !user.roles.some((role) => STAFF_ROLES.includes(role)));
  const selectedUser = externalUsers.find((user) => user.id === state.selectedExternalUserId) || externalUsers[0] || null;
  if (selectedUser && state.selectedExternalUserId !== selectedUser.id) {
    state.selectedExternalUserId = selectedUser.id;
  }

  return `
    <section class="stack">
      <div class="section-heading">
        <div>
          <div class="kicker">Usuarios externos</div>
          <h2>Clientes registrados</h2>
        </div>
        <button class="primary" data-action="toggle-external-user-form" type="button">${state.showExternalUserForm ? "Cancelar" : "Crear usuario"}</button>
      </div>
      ${state.showExternalUserForm ? renderExternalUserForm() : ""}
    </section>
    ${renderUsersTable({
      users: externalUsers,
      emptyMessage: "No hay usuarios externos.",
      showTracking: true
    })}
    ${selectedUser ? renderExternalUserTracking(selectedUser) : ""}
  `;
}

function renderInternalUserForm() {
  return `
    <div class="panel inline-form">
      <form data-form="internal-user-create">
        <div class="two-col">
          <input name="fullName" placeholder="Nombre completo" required />
          <input name="email" type="email" placeholder="Correo" required />
        </div>
        <input name="password" type="password" placeholder="Contraseña inicial" autocomplete="new-password" minlength="8" required />
        <button class="primary" type="submit">Guardar usuario interno</button>
      </form>
    </div>
  `;
}

function renderExternalUserForm() {
  return `
    <div class="panel inline-form">
      <form data-form="external-user-create">
        <div class="two-col">
          <input name="fullName" placeholder="Nombre completo" required />
          <input name="email" type="email" placeholder="Correo" required />
        </div>
        <div class="two-col">
          <input name="phone" placeholder="Teléfono" />
          <select name="gender">
            <option value="UNSPECIFIED">Género no especificado</option>
            <option value="FEMALE">Mujer</option>
            <option value="MALE">Hombre</option>
          </select>
        </div>
        <input name="password" type="password" placeholder="Contraseña inicial" autocomplete="new-password" minlength="8" required />
        <button class="primary" type="submit">Guardar usuario externo</button>
      </form>
    </div>
  `;
}

function renderUsersTable({ kicker = "", title = "", users, emptyMessage, showTracking }) {
  return `
    <section class="stack">
      ${kicker || title ? `
        <div>
          ${kicker ? `<div class="kicker">${kicker}</div>` : ""}
          ${title ? `<h2>${title}</h2>` : ""}
        </div>
      ` : ""}
      <div class="table-card">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Correo</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            ${users.length ? users.map((user) => renderUserRow(user, { showTracking })).join("") : `<tr><td colspan="3">${emptyMessage}</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderExternalUserTracking(user) {
  const userCases = state.cases.filter((item) => item.client?.id === user.id);
  const previewCases = state.clientPreview?.items || [];

  return `
    <section class="stack tracking-panel">
      <div>
        <div class="kicker">Seguimiento comercial</div>
        <h2>${escapeHtml(user.fullName)}</h2>
        <p class="small">${escapeHtml(user.email)} · ${escapeHtml(user.phone || "Sin teléfono")} · ${escapeHtml(user.gender === "FEMALE" ? "Bienvenida" : user.gender === "MALE" ? "Bienvenido" : "Saludo neutral")}</p>
      </div>
      <div class="tracking-list">
        ${userCases.length ? userCases.map((caseItem) => renderTrackingCard(caseItem)).join("") : `<div class="card"><p class="small">Este usuario aún no tiene inmuebles de interés registrados.</p></div>`}
      </div>
      <div class="stack">
        <div>
          <div class="kicker">Vista del cliente</div>
          <h2>Información visible en su cuenta</h2>
        </div>
        <div class="tracking-list">
          ${previewCases.length ? previewCases.map((caseItem) => renderClientPreviewCard(caseItem)).join("") : `<div class="card"><p class="small">Aún no hay datos de dashboard para este cliente.</p></div>`}
        </div>
      </div>
    </section>
  `;
}

function renderTrackingCard(caseItem) {
  const paidStages = caseItem.progress?.approvedCount || 0;
  const nextStage = caseItem.progress?.nextStageCode ? STAGE_LABELS[caseItem.progress.nextStageCode] || caseItem.progress.nextStageCode : "Proceso completo";
  const approvedPayments = caseItem.payments.filter((payment) => payment.status === "APPROVED");

  return `
    <div class="card tracking-card">
      <div>
        <div class="kicker">${escapeHtml(STATUS_LABELS[caseItem.status] || caseItem.status)}</div>
        <h3>${escapeHtml(caseItem.property.title)}</h3>
        <p class="small">${escapeHtml(caseItem.property.city)}, ${escapeHtml(caseItem.property.state)} · ${escapeHtml(caseItem.property.zoneLabel || "")}</p>
      </div>
      <div class="chips">
        <span class="chip">${escapeHtml(STAGE_LABELS[caseItem.currentStage] || caseItem.currentStage)}</span>
        <span class="chip">${paidStages}/3 etapas contratadas</span>
        <span class="chip">Siguiente: ${escapeHtml(nextStage)}</span>
        </div>
        <div class="tracking-grid">
          <div>
            <div class="kicker">Alta</div>
            <p>${date(caseItem.createdAt)}</p>
        </div>
        <div>
          <div class="kicker">Última actividad</div>
          <p>${date(caseItem.lastActivityAt)}</p>
        </div>
      </div>
      <form class="inline-form" data-form="case-update">
        <input type="hidden" name="caseId" value="${caseItem.id}" />
        <select name="currentStage">
          ${CLIENT_STAGES.map((stage) => `<option value="${stage}" ${caseItem.currentStage === stage ? "selected" : ""}>${escapeHtml(STAGE_LABELS[stage] || stage)}</option>`).join("")}
        </select>
        <button class="secondary" type="submit">Actualizar expediente</button>
      </form>
      <div>
        <div class="kicker">Contratación</div>
        ${approvedPayments.length ? `
          <div class="payment-list">
            ${approvedPayments.map((payment) => `
              <div class="payment-item">
                <span class="chip">${escapeHtml(STAGE_LABELS[payment.stageCode] || payment.stageCode)} · ${money(payment.amountMxn)}</span>
                <button class="ghost danger" data-action="void-payment" data-payment-id="${payment.id}" type="button">Anular</button>
              </div>
            `).join("")}
          </div>
        ` : `<p class="small">Sin pagos aprobados todavía.</p>`}
      </div>
    </div>
  `;
}

function renderClientPreviewCard(caseItem) {
  return `
    <div class="card tracking-card">
      <div>
        <div class="kicker">${escapeHtml(STATUS_LABELS[caseItem.status] || caseItem.status)}</div>
        <h3>${escapeHtml(caseItem.property.title)}</h3>
        <p class="small">${escapeHtml(caseItem.property.city)} · ${escapeHtml(caseItem.property.zoneLabel || "")}</p>
      </div>
      <div class="chips">
        <span class="chip">${escapeHtml(STAGE_LABELS[caseItem.currentStage] || caseItem.currentStage)}</span>
        <span class="chip">${caseItem.progress?.approvedCount || 0}/3 etapas contratadas</span>
      </div>
      <div class="tracking-grid">
        <div>
          <div class="kicker">Fecha visible</div>
          <p>${date(caseItem.property.auctionDate)}</p>
        </div>
        <div>
          <div class="kicker">Órgano visible</div>
          <p>${escapeHtml(caseItem.property.courtName || "Aún no" )}</p>
        </div>
        <div>
          <div class="kicker">Hora visible</div>
          <p>${escapeHtml(caseItem.property.auctionTime || "Aún no")}</p>
        </div>
        <div>
          <div class="kicker">Siguiente paso del cliente</div>
          <p>${caseItem.progress?.nextStageCode ? escapeHtml(STAGE_LABELS[caseItem.progress.nextStageCode] || caseItem.progress.nextStageCode) : "Proceso completo"}</p>
        </div>
        <div>
          <div class="kicker">Postura legal</div>
          <p>${money(caseItem.property.legalBidMxn)}</p>
        </div>
      </div>
      <p class="small">${caseItem.progress?.nextStageReason ? escapeHtml(caseItem.progress.nextStageReason) : "Sin restricciones pendientes en este momento."}</p>
    </div>
  `;
}

function renderUserRow(user, { showTracking = false } = {}) {
  const isEditing = state.editingUserId === user.id;
  const canDelete = user.id !== state.me.id;

  if (isEditing) {
    return `
      <tr data-user-id="${user.id}">
        <td><input data-field="fullName" value="${escapeHtml(user.fullName)}" required /></td>
        <td><input data-field="email" type="email" value="${escapeHtml(user.email)}" required /></td>
        <td>
          <div class="row-actions">
            <input data-field="password" type="password" placeholder="Nueva contraseña" autocomplete="new-password" minlength="8" />
            <button class="secondary" data-action="save-user" type="button">Guardar</button>
            <button class="ghost" data-action="cancel-user-edit" type="button">Cancelar</button>
          </div>
        </td>
      </tr>
    `;
  }

  return `
    <tr data-user-id="${user.id}">
      <td>${escapeHtml(user.fullName)}</td>
      <td>${escapeHtml(user.email)}</td>
      <td>
        <div class="row-actions">
          ${showTracking ? `<button class="secondary" data-action="view-user-tracking" type="button">Ver seguimiento</button>` : ""}
          <button class="secondary" data-action="edit-user" type="button">Editar</button>
          <button class="ghost danger" data-action="delete-user" type="button" ${canDelete ? "" : "disabled"}>Eliminar</button>
        </div>
      </td>
    </tr>
  `;
}

function renderCourtOptions(selectedCourt = "") {
  const hasSelectedCourt = selectedCourt && !COURT_OPTIONS.includes(selectedCourt);
  return `
    <option value="">Selecciona juzgado</option>
    ${hasSelectedCourt ? `<option value="${escapeHtml(selectedCourt)}" selected>${escapeHtml(selectedCourt)}</option>` : ""}
    ${COURT_OPTIONS.map((court) => `<option value="${escapeHtml(court)}" ${selectedCourt === court ? "selected" : ""}>${escapeHtml(court)}</option>`).join("")}
  `;
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

function renderPropertyEditForm(property) {
  return `
    <form class="property-edit-form" data-form="property-update">
      <input type="hidden" name="propertyId" value="${property.id}" />
      <div class="form-section">
        <h3>Editar inmueble</h3>
        <label class="field-label">
          <span>Título</span>
          <input name="title" value="${escapeHtml(property.title)}" required />
        </label>
        <div class="two-col">
          <label class="field-label">
            <span>Estado</span>
            <input name="state" value="${escapeHtml(property.state)}" required />
          </label>
          <label class="field-label">
            <span>Ciudad o alcaldía</span>
            <input name="city" value="${escapeHtml(property.city)}" required />
          </label>
        </div>
        <label class="field-label">
          <span>Colonia</span>
          <input name="zoneLabel" value="${escapeHtml(property.zoneLabel || "")}" required />
        </label>
        <div class="two-col">
          <label class="field-label">
            <span>Valor de avalúo</span>
            ${renderCurrencyInput("estimatedValueMxn", Number(property.estimatedValueMxn || 0))}
          </label>
          <label class="field-label">
            <span>Postura legal</span>
            ${renderCurrencyInput("legalBidMxn", Number(property.legalBidMxn || 0))}
          </label>
        </div>
        <div class="two-col">
          <label class="field-label">
            <span>Descuento %</span>
            <input name="discountPct" type="number" inputmode="numeric" min="0" max="99" step="1" value="${Number(property.discountPct || 0)}" required />
          </label>
          <label class="field-label">
            <span>Almoneda</span>
            <select name="auctionRound" required>
              ${["PRIMERA", "SEGUNDA", "POSTERIOR"].map((item) => `<option value="${item}" ${property.auctionRound === item ? "selected" : ""}>${escapeHtml(auctionRoundLabel(item))}</option>`).join("")}
            </select>
          </label>
        </div>
        <label class="field-label">
          <span>Descripción</span>
          <textarea name="shortDescription" rows="3" required>${escapeHtml(property.shortDescription || "")}</textarea>
        </label>
        <div class="two-col">
          <label class="field-label">
            <span>Fecha de almoneda</span>
            <input name="auctionDate" type="date" value="${escapeHtml(dateInputValue(property.auctionDate))}" required />
          </label>
          <label class="field-label">
            <span>Hora de la almoneda</span>
            <input name="auctionTime" type="time" step="60" value="${escapeHtml(property.auctionTime || "")}" />
          </label>
        </div>
        <label class="field-label">
          <span>Juzgado del remate</span>
          <select name="courtName" required>
            ${renderCourtOptions(property.courtName || "")}
          </select>
        </label>
        <label class="field-label">
          <span>Dirección del inmueble</span>
          <textarea name="fullAddress" rows="3" required>${escapeHtml(property.fullAddress || "")}</textarea>
        </label>
        <div class="two-col">
          <label class="field-label">
            <span>Estatus</span>
            <select name="publicStatus">
              ${PROPERTY_STATUS_OPTIONS.map(([value, label]) => `<option value="${value}" ${property.publicStatus === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
            </select>
          </label>
          <label class="field-label">
            <span>Vista</span>
            <select name="featured">
              <option value="false" ${!property.featured ? "selected" : ""}>Normal</option>
              <option value="true" ${property.featured ? "selected" : ""}>Destacado</option>
            </select>
          </label>
        </div>
        <div class="row-actions">
          <button class="secondary" type="submit">Guardar cambios</button>
          <button class="ghost" data-action="cancel-property-edit" type="button">Cancelar</button>
        </div>
      </div>
    </form>
  `;
}

function renderProperties() {
  return `
    <section class="stack">
      <div>
        <div class="kicker">Inmuebles</div>
        <h2>Alta y actualización de catálogo</h2>
      </div>
      <div class="two-col">
        <div class="panel">
          <form data-form="property-create">
            <div class="form-section">
              <h3>Datos del remate</h3>
              <label class="field-label">
                <span>Juzgado del remate</span>
                <select name="courtName" required>
                  <option value="" selected disabled>Selecciona juzgado</option>
                  ${COURT_OPTIONS.map((court) => `<option value="${escapeHtml(court)}">${escapeHtml(court)}</option>`).join("")}
                </select>
              </label>
              <div class="two-col">
                <label class="field-label">
                  <span>Valor de avalúo</span>
                  ${renderCurrencyInput("estimatedValueMxn")}
                </label>
                <label class="field-label">
                  <span>Postura legal</span>
                  ${renderCurrencyInput("legalBidMxn")}
                </label>
              </div>
              <button class="secondary" data-action="recalculate-property-bid" type="button">Calcular 2/3</button>
              <div class="two-col">
                <label class="field-label">
                  <span>Fecha de almoneda</span>
                  <input name="auctionDate" type="date" required />
                </label>
                <label class="field-label">
                  <span>Hora de la almoneda</span>
                  <input name="auctionTime" type="time" step="60" />
                </label>
              </div>
                <label class="field-label">
                  <span>Dirección del inmueble</span>
                <textarea name="fullAddress" rows="3" required></textarea>
              </label>
            </div>
            <div class="form-section">
              <h3>Publicación web</h3>
              <label class="field-label">
                <span>Título</span>
                <input name="title" required />
              </label>
              <div class="two-col">
                <label class="field-label">
                  <span>Estado</span>
                  <input name="state" required />
                </label>
                <label class="field-label">
                  <span>Ciudad o alcaldía</span>
                  <input name="city" required />
                </label>
              </div>
              <label class="field-label">
                <span>Colonia</span>
                <input name="zoneLabel" required />
              </label>
              <div class="two-col">
                <label class="field-label">
                  <span>Descuento %</span>
                  <input name="discountPct" type="number" inputmode="numeric" min="0" max="99" step="1" required />
                </label>
                <label class="field-label">
                  <span>Almoneda</span>
                  <select name="auctionRound" required>
                    ${["PRIMERA", "SEGUNDA", "POSTERIOR"].map((item) => `<option value="${item}">${escapeHtml(auctionRoundLabel(item))}</option>`).join("")}
                  </select>
                </label>
              </div>
              <label class="field-label">
                <span>Descripción</span>
                <textarea name="shortDescription" rows="3" required></textarea>
              </label>
              <label class="field-label">
                <span>Tags</span>
                <input name="tags" />
              </label>
              <label class="check-row">
                <input name="featured" type="checkbox" />
                <span>Destacado</span>
              </label>
            </div>
            <button class="primary" type="submit">Publicar inmueble</button>
          </form>
        </div>
        <div class="stack">
          ${state.properties.map((property, index) => `
            <div class="card" data-property-id="${property.id}">
              <div class="property-card-meta">
                <span class="chip property-id-chip">${escapeHtml(propertyDisplayLabel(property, index))}</span>
                <span class="kicker">${escapeHtml(propertyStatusLabel(property.publicStatus))}</span>
              </div>
              <h3>${escapeHtml(property.title)}</h3>
              <p class="small">${escapeHtml(property.city)}, ${escapeHtml(property.state)}</p>
              <div class="chips">
                <span class="chip">${money(property.estimatedValueMxn)}</span>
                <span class="chip">Postura ${money(property.legalBidMxn)}</span>
                <span class="chip">${escapeHtml(auctionRoundLabel(property.auctionRound))}</span>
                <span class="chip">-${property.discountPct}%</span>
                <span class="chip">${property.featured ? "Destacado" : "Normal"}</span>
              </div>
              ${state.editingPropertyId === property.id ? renderPropertyEditForm(property) : `
              <form data-form="property-update">
                <input type="hidden" name="propertyId" value="${property.id}" />
                <div class="two-col">
                  <select name="publicStatus" data-autosave-property-select>
                    ${PROPERTY_STATUS_OPTIONS.map(([value, label]) => `<option value="${value}" ${property.publicStatus === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
                  </select>
                  <select name="featured" data-autosave-property-select>
                    <option value="false" ${!property.featured ? "selected" : ""}>Normal</option>
                    <option value="true" ${property.featured ? "selected" : ""}>Destacado</option>
                  </select>
                </div>
                <button class="secondary" type="submit">Actualizar</button>
              </form>
              <button class="secondary block-action" data-action="edit-property" type="button">Editar</button>
              <button class="ghost danger block-action" data-action="delete-property" type="button">Eliminar inmueble</button>
              `}
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderMain() {
  let section = "";
  if (state.activeSection === "users") section = renderUsers();
  if (state.activeSection === "externalUsers") section = renderExternalUsers();
  if (state.activeSection === "properties") section = renderProperties();

  return `
    <div class="layout">
        <div class="topbar">
          <div class="brand">
            <div class="brand__logo"><img src="/assets/legalflow-logo.png" alt="LegalFlow" /></div>
            <div>
              <div class="brand__name">Remates Inmobiliarios México</div>
              <div class="small">Una app de LegalFlow · Panel interno de gestión</div>
            </div>
          </div>
        <div class="version-pill" aria-label="Versión actual">${APP_VERSION}</div>
      </div>
      <div class="shell">
        ${renderSidebar()}
        <main class="panel">${section}</main>
      </div>
    </div>
    ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ""}
  `;
}

function render() {
  app.innerHTML = state.me ? renderMain() : renderLogin();
  enhancePasswordFields();
}
