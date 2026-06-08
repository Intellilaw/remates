function renderTopbar() {
  const accountActions = state.me
    ? `<a class="primary" href="${DASHBOARD_PATH}">Mi dashboard</a>`
    : `
      <button class="secondary" data-action="open-auth" data-mode="login">Entrar</button>
      <button class="primary" data-action="open-auth" data-mode="register">Crear cuenta</button>
    `;
  const userGreeting = state.me
    ? `<div class="user-greeting" aria-label="Usuario conectado"><span>${escapeHtml(welcomeLabel(state.me))}</span><strong>${escapeHtml(firstName(state.me))}</strong></div>`
    : "";
  const brand = `
    <a class="brand" href="/" aria-label="Subastas inmobiliarias México">
      <img class="brand__logo" src="/assets/subastas-logo.png" alt="Subastas inmobiliarias México by LegalFlow" />
    </a>
  `;

  if (isDashboardRoute) {
    return `
      <header class="topbar">
        <div class="shell topbar__row">
          <div class="topbar__identity">
            ${brand}
            <div class="version-pill" aria-label="Versión actual">${APP_VERSION}</div>
          </div>
          <div class="topbar__actions">
            ${userGreeting}
            <nav class="nav" aria-label="Navegación del dashboard">
              <a href="/">Inicio</a>
              <button data-action="scroll" data-target="#dashboard-cases">Mis inmuebles</button>
              <button data-action="scroll" data-target="#dashboard-catalog">Inmuebles</button>
              ${state.me ? `<button class="ghost" data-action="logout">Salir</button>` : `<button class="primary" data-action="open-auth" data-mode="login">Iniciar sesión</button>`}
            </nav>
          </div>
        </div>
      </header>
    `;
  }

  return `
    <header class="topbar">
      <div class="shell topbar__row">
        <div class="topbar__identity">
          ${brand}
          <div class="version-pill" aria-label="Versión actual">${APP_VERSION}</div>
        </div>
        <div class="topbar__actions">
          ${userGreeting}
          <nav class="nav" aria-label="Navegación principal">
            <button data-action="scroll" data-target="#listings">Inmuebles en subasta</button>
            <button data-action="scroll" data-target="#about-subastas">¿Qué son las subastas?</button>
            ${accountActions}
            ${state.me ? `<button class="ghost" data-action="logout">Salir</button>` : ""}
          </nav>
        </div>
      </div>
    </header>
  `;
}

function renderHomeHero() {
  return `
    <section class="hero shell">
      <div class="hero__grid">
        <div class="hero__panel">
          <h1>Subastas en CDMX, explicadas paso a paso.</h1>
          <p>Sabemos que una subasta judicial puede generar dudas. Por eso mostramos qué información es pública, qué se desbloquea con cada etapa y qué costos debes considerar antes de tomar una decisión.</p>
          <div class="hero__actions">
            <button class="primary" data-action="scroll" data-target="#listings">Ver subastas en CDMX</button>
            <button class="secondary" data-action="scroll" data-target="#about-subastas">Qué es una subasta</button>
          </div>
          <div class="hero__stats">
            <div class="stat"><strong>Antes de pagar</strong><span>ves avalúo, postura legal, almoneda y fecha</span></div>
            <div class="stat"><strong>Con asesoría</strong><span>desbloqueas órgano subastador y revisión guiada</span></div>
            <div class="stat"><strong>Sin sorpresas</strong><span>explicamos también adeudos y costos posteriores</span></div>
          </div>
        </div>
        <aside class="hero__aside hero__aside--catalog" id="hero-catalog">
          ${renderCatalogContent()}
        </aside>
      </div>
      <div class="metric-strip">
        <div class="metric"><strong>${state.properties.length}</strong><span>inmuebles disponibles en CDMX</span></div>
        <div class="metric"><strong>${formatMoney(3000)}</strong><span>asesoría inicial para desbloquear órgano y revisión</span></div>
        <div class="metric"><strong>${formatMoney(70000)}</strong><span>posesión solo después de adjudicación judicial</span></div>
      </div>
    </section>
  `;
}

const CATALOG_COPY = "Consulta avalúo, postura legal, almoneda, fecha de subasta y dirección completa. El expediente y el número de juzgado se reservan fuera de la ficha pública.";

function renderCatalogContent(title = "Catálogo", copy = CATALOG_COPY) {
  const items = filteredProperties();
  const boroughs = [...new Set(state.properties.map((item) => item.city))].sort((left, right) => left.localeCompare(right, "es-MX"));

  return `
    <div class="section-head">
      <div>
        <h2 class="section-title">${title}</h2>
        <p class="section-copy">${copy}</p>
      </div>
      <div class="filters">
        <select data-filter="borough">
          <option value="all">Todas las alcaldías</option>
          ${boroughs.map((item) => `<option value="${escapeHtml(item)}" ${state.filters.borough === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="properties-grid">
      ${items.length ? items.map((property) => {
        const auctionDate = property.auctionDate ? formatDate(property.auctionDate) : "Fecha por confirmar";
        return `
          <article class="property-card">
            ${renderPropertyCover(property, `
              <div class="property-cover__badges">
                <span class="badge">${escapeHtml(property.city)}</span>
                <span class="badge badge--discount">${escapeHtml(discountShortLabel(property))}</span>
                ${renderPropertyPublicStamp(property)}
              </div>
              <div>
                <div class="kicker">${escapeHtml(property.zoneLabel)}</div>
                <strong>${escapeHtml(property.title)}</strong>
              </div>
            `)}
              <div class="property-card__body">
                <div class="property-facts">
                  <div><span>Avalúo</span><strong>${formatMoney(property.estimatedValueMxn)}</strong></div>
                  <div><span>Postura legal</span><strong>${formatMoney(property.legalBidMxn)}</strong></div>
                  <div class="property-fact--highlight"><span>Descuento estimado</span><strong>${escapeHtml(discountLabel(property))}</strong></div>
                  <div><span>Almoneda</span><strong>${escapeHtml(auctionRoundLabel(property.auctionRound))}</strong></div>
                  <div><span>Fecha de subasta</span><strong>${escapeHtml(auctionDate)}</strong></div>
                </div>
                ${property.fullAddress ? `<p class="property-address-line"><strong>Dirección:</strong> ${escapeHtml(property.fullAddress)}</p>` : ""}
                <p>${escapeHtml(property.shortDescription)}</p>
                <button class="primary" data-action="open-property" data-slug="${property.slug}">Ver detalle</button>
            </div>
          </article>
        `;
      }).join("") : `<div class="empty-state">No hay inmuebles publicados con estos filtros.</div>`}
    </div>
  `;
}

function renderExplainer() {
  return `
    <section class="section shell" id="about-subastas">
      <div class="section-head">
        <div>
          <div class="kicker">Qué son las subastas</div>
          <h2 class="section-title">Una oportunidad patrimonial con reglas judiciales, no una compraventa común.</h2>
          <p class="section-copy">Una subasta inmobiliaria es una venta ordenada dentro de un procedimiento judicial. Puede permitir adquirir por debajo del valor comercial, pero exige entender la almoneda, la postura legal, la adjudicación, la entrega y los gastos posteriores.</p>
        </div>
      </div>
      <div class="section-card explain-grid">
        <div>
          <p>La plataforma está pensada para avanzar sin presión: primero ves datos públicos, después eliges si quieres abrir un expediente y, solo si te conviene, contratas la asesoría inicial.</p>
          <p>Desde tu cuenta puedes dar seguimiento a tus inmuebles de interés, pagos, fechas relevantes, mensajes y desbloqueos de información.</p>
        </div>
        <div class="explain-points">
          <div class="explain-point">
            <h3>1. Exploras</h3>
            <p>Ves inmuebles en CDMX con avalúo, postura legal, almoneda y fecha de subasta. No necesitas pagar para entender el panorama inicial.</p>
          </div>
          <div class="explain-point">
            <h3>2. Te asesoras</h3>
            <p>Con ${formatMoney(3000)} se desbloquea el órgano subastador y revisamos contigo qué significa participar en esa almoneda.</p>
          </div>
          <div class="explain-point">
            <h3>3. Participas acompañado</h3>
            <p>Con ${formatMoney(20000)} te acompañamos en la preparación, audiencia, billete de depósito y recuperación del billete si no hay adjudicación.</p>
          </div>
          <div class="explain-point">
            <h3>4. Tomas posesión</h3>
            <p>Si el inmueble te es adjudicado, puedes contratar la etapa de posesión por ${formatMoney(70000)} para que demos seguimiento a la entrega ordenada por el juez.</p>
          </div>
        </div>
      </div>
      <div class="clarity-grid">
        <div class="clarity-card clarity-card--blue">
          <div class="kicker">Adjudicación judicial</div>
          <h3>El inmueble se transmite por resolución de un juez.</h3>
          <p>Cuando la subasta concluye con adjudicación, el juez reconoce al adjudicatario y ordena las actuaciones necesarias para formalizar la transmisión, cancelar gravámenes judicialmente procedentes y, cuando corresponde, entregar la posesión.</p>
          <p>Esto da mayor certeza frente a cargas previas sobre el inmueble, porque la adquisición deriva de una orden judicial y no de una negociación privada.</p>
        </div>
        <div class="clarity-card">
          <div class="kicker">Importante</div>
          <h3>La adjudicación no borra todos los adeudos del inmueble.</h3>
          <p>Aun después de adjudicado, pueden existir adeudos de agua, predial, energía eléctrica o cuotas de mantenimiento. Esos conceptos no necesariamente se extinguen por la adjudicación y el adjudicatario debe considerarlos como costos separados.</p>
          <p>Por eso explicamos estos puntos desde el inicio y los revisamos antes de que el cliente decida avanzar.</p>
        </div>
      </div>
    </section>
  `;
}

function renderEducation() {
  return `
    <section class="section shell" id="education">
      <div class="section-head">
        <div>
          <div class="kicker">Acompañamiento</div>
          <h2 class="section-title">Qué obtienes en cada etapa</h2>
          <p class="section-copy">Cada pago tiene un propósito concreto. Nuestro objetivo es que sepas qué estás contratando, qué información se libera y qué decisión viene después.</p>
        </div>
      </div>
      <div class="section-card education-grid">
        <div class="education-video">
          <div>
            <div class="play-badge">▶</div>
            <h3>Guía del proceso</h3>
            <p>Conoce los pasos clave para evaluar una subasta, preparar la audiencia, entender la adjudicación y anticipar los costos posteriores.</p>
          </div>
        </div>
        <div>
          <div class="kicker">Información esencial</div>
          <h3>${escapeHtml(state.education?.title || "Qué es una subasta inmobiliaria")}</h3>
          <p>${escapeHtml(state.education?.bodyMarkdown || "")}</p>
          <div class="explain-points">
            ${STAGES.map((stage) => `
              <div class="explain-point">
                <h3>${escapeHtml(stage.title)}</h3>
                <p>${escapeHtml(stage.summary)}</p>
                <ul class="clean-list">
                  ${(stage.details || []).map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}
                </ul>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderListings(sectionId = "listings", title = "Catálogo", copy = CATALOG_COPY) {
  return `
    <section class="section shell" id="${sectionId}">
      ${renderCatalogContent(title, copy)}
    </section>
  `;
}

function renderDashboardAccess() {
  return `
    <section class="section shell dashboard-shell">
      <div class="section-card access-card">
        <div class="kicker">Acceso privado</div>
        <h1 class="section-title">Este dashboard es tu espacio de seguimiento.</h1>
        <p class="section-copy">Aquí verás tus inmuebles, fechas de almoneda, pagos por etapa, mensajes y, cuando corresponda, órgano subastador y revisión legal.</p>
        <div class="inline-actions">
          <button class="primary" data-action="open-auth" data-mode="login">Iniciar sesión</button>
          <a class="secondary" href="/">Volver al inicio</a>
        </div>
      </div>
    </section>
  `;
}
