function renderDashboardHero() {
  const activeCase = getSelectedCase();
  const greeting = state.me ? `${welcomeLabel(state.me)}, ${escapeHtml(state.me.fullName)}.` : "Tu dashboard.";

  return `
    <section class="section shell dashboard-shell">
      <div class="section-card dashboard-hero">
        <div>
          <div class="kicker">Dashboard del cliente</div>
          <h1 class="section-title">${greeting}</h1>
          <p class="section-copy">Aquí ves exactamente en qué etapa está cada inmueble, qué información ya tienes desbloqueada, qué pago sigue y qué decisión debes tomar antes de avanzar.</p>
        </div>
        <div class="dashboard-hero__stats">
          <div class="stat">
            <strong>${state.cases.length}</strong>
            <span>expedientes abiertos en tu cuenta</span>
          </div>
          <div class="stat">
            <strong>${activeCase?.progress?.approvedCount || 0}/3</strong>
            <span>etapas contratadas en el expediente activo</span>
          </div>
          <div class="stat">
            <strong>${escapeHtml(STATUS_LABELS[activeCase?.status] || "Listo para empezar")}</strong>
            <span>estado actual del expediente seleccionado</span>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderStageCard(caseItem, stage) {
  const approved = Boolean(caseItem?.progress?.unlocked?.includes(stage.code));
  const isNext = caseItem?.progress?.nextStageCode === stage.code;
  const canPay = isNext && caseItem?.progress?.canPurchaseNextStage;
  const blockedReason = isNext && !canPay ? caseItem?.progress?.nextStageReason : "";
  const waitingForPrevious = !approved && !isNext;
  const button = canPay
    ? `<button class="primary" data-action="checkout" data-case-id="${caseItem.id}" data-stage-code="${stage.code}">Pagar ${formatMoney(stage.amountMxn)}</button>`
    : approved
      ? `<span class="chip chip--success">Etapa contratada</span>`
      : blockedReason
        ? `<p class="stage-note">${escapeHtml(blockedReason)}</p>`
        : waitingForPrevious
          ? `<p class="stage-note">Esta etapa se activará después de completar la anterior.</p>`
          : "";

  const cardClass = approved ? "stage-card stage-card--done" : canPay ? "stage-card stage-card--active" : "stage-card stage-card--pending";

  return `
    <article class="${cardClass}">
      <div class="stage-card__header">
        <div>
          <div class="kicker">Etapa</div>
          <h3>${escapeHtml(stage.title)}</h3>
        </div>
        <div class="stage-price">${formatMoney(stage.amountMxn)}</div>
      </div>
      <p>${escapeHtml(stage.summary)}</p>
      <ul class="clean-list">
        ${(stage.details || []).map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}
      </ul>
      <div class="stage-card__footer">
        ${button}
      </div>
    </article>
  `;
}

function renderClientEntitlements(caseItem) {
  const property = caseItem.property;
  return `
    <div class="detail-grid">
      <div class="detail-card">
          <div class="kicker">Fecha de subasta</div>
          <strong>${escapeHtml(formatDate(property.auctionDate))}</strong>
          <p>Visible desde la ficha pública del inmueble.</p>
        </div>
        <div class="detail-card">
          <div class="kicker">Dirección completa</div>
          <strong>${escapeHtml(property.fullAddress || "Pendiente")}</strong>
          <p>Visible desde la ficha pública del inmueble.</p>
        </div>
        <div class="detail-card">
          <div class="kicker">Órgano subastador</div>
          <strong>${property.courtName ? escapeHtml(property.courtName) : "Bloqueado"}</strong>
          <p>${property.courtName ? "Ya sabes qué órgano llevará a cabo la subasta." : `Se desbloquea con la asesoría inicial de ${formatMoney(3000)}.`}</p>
        </div>
        <div class="detail-card">
          <div class="kicker">Hora de subasta</div>
          <strong>${property.auctionTime ? escapeHtml(property.auctionTime) : "Pendiente"}</strong>
          <p>Visible desde la ficha pública cuando viene indicada en el remate.</p>
      </div>
        <div class="detail-card">
          <div class="kicker">Postura legal</div>
          <strong>${formatMoney(property.legalBidMxn)}</strong>
          <p>Precio base al que puede ser adquirido conforme a esta almoneda.</p>
        </div>
      </div>
  `;
}

function renderCaseDetail(caseItem) {
  if (!caseItem) {
    return `
      <div class="dashboard-card">
        <div class="empty">Abre tu primer expediente desde el catálogo para comenzar el proceso.</div>
      </div>
    `;
  }

  return `
    <div class="dashboard-card dashboard-detail">
      <div class="dashboard-detail__header">
        <div>
          <div class="kicker">Expediente seleccionado</div>
          <h2>${escapeHtml(caseItem.property.title)}</h2>
          <p>${escapeHtml(caseItem.property.city)} · ${escapeHtml(caseItem.property.zoneLabel || "")}</p>
        </div>
        <div class="stage-strip">
          <span class="chip">${escapeHtml(STAGE_LABELS[caseItem.currentStage] || caseItem.currentStage)}</span>
          <span class="chip">${escapeHtml(STATUS_LABELS[caseItem.status] || caseItem.status)}</span>
          <span class="chip">Avalúo ${formatMoney(caseItem.property.estimatedValueMxn)}</span>
          <span class="chip">Postura ${formatMoney(caseItem.property.legalBidMxn)}</span>
          <span class="chip">${escapeHtml(auctionRoundLabel(caseItem.property.auctionRound))}</span>
        </div>
      </div>

      ${renderClientEntitlements(caseItem)}

      <div class="clarity-card clarity-card--inline">
        <div class="kicker">Claridad legal y costos posteriores</div>
        <p>Si el inmueble te es adjudicado, la adquisición deriva de una resolución judicial. El juez reconoce al adjudicatario y puede ordenar la cancelación de gravámenes judicialmente procedentes, así como la entrega del inmueble.</p>
        <p><strong>También debes considerar:</strong> la adjudicación no necesariamente elimina adeudos de agua, predial, energía eléctrica ni cuotas de mantenimiento. Esos conceptos pueden tener que pagarse por separado.</p>
      </div>

      <div class="section-card detail-legal">
        ${caseItem.property.visibility?.showFullDetails ? `
            <div class="detail-grid detail-grid--legal">
            <div class="detail-card detail-card--wide">
              <div class="kicker">Detalle legal</div>
              <strong>${escapeHtml(caseItem.property.legalSummary || "Revisión legal disponible")}</strong>
              <p>${escapeHtml(caseItem.property.riskNotes || "Revisamos expediente, adeudos y estatus de posesión antes de recomendar participación.")}</p>
            </div>
          </div>
        ` : `
          <div class="detail-gate">
            <div class="kicker">Información ampliada</div>
            <h3>Tu siguiente desbloqueo abre la información operativa crítica.</h3>
            <p>Después del pago de asesoría podrás ver órgano subastador y revisión legal del inmueble. La idea es que tengas los datos operativos antes de decidir si avanzas.</p>
          </div>
        `}
      </div>

      <div class="stage-roadmap">
        ${STAGES.map((stage) => renderStageCard(caseItem, stage)).join("")}
      </div>

      <div class="dashboard-copy-card">
        <div class="kicker">Qué sigue</div>
        <p>${caseItem.progress.nextStageCode
          ? caseItem.progress.canPurchaseNextStage
            ? `Tu siguiente etapa disponible es ${escapeHtml(STAGE_LABELS[caseItem.progress.nextStageCode] || caseItem.progress.nextStageCode)}.`
            : escapeHtml(caseItem.progress.nextStageReason || "Aún no hay una siguiente etapa disponible.")
          : "Tu expediente ya recorrió todas las etapas disponibles en la plataforma."}</p>
      </div>

      <div class="case-grid">
        <div>
          <div class="kicker">Historial de pagos</div>
          <div class="case-list">
            ${caseItem.payments.length ? caseItem.payments.map((payment) => `
                <div class="case-item">
                  <strong>${escapeHtml(STAGE_LABELS[payment.stageCode] || payment.stageCode)}</strong>
                  <div>${formatMoney(payment.amountMxn)} · ${escapeHtml(paymentStatusLabel(payment.status))}</div>
                  <div class="small">${payment.paidAt ? `Pagado ${formatDate(payment.paidAt)}` : "Pendiente de confirmación"}</div>
                </div>
            `).join("") : `<div class="empty">Aún no tienes pagos registrados en este expediente.</div>`}
          </div>
        </div>
        <div>
          <div class="kicker">Mensajería</div>
          <div class="message-stream">
            ${state.messages.length ? state.messages.map((message) => `
              <div class="message ${message.sender?.id === state.me.id ? "message--mine" : ""}">
                <strong>${escapeHtml(message.sender?.fullName || "Equipo")}</strong>
                <p>${escapeHtml(message.body)}</p>
                <div class="small">${formatDate(message.createdAt)}</div>
              </div>
            `).join("") : `<div class="empty">Todavía no hay mensajes para este expediente.</div>`}
          </div>
          <form class="form-grid" data-form="message">
            <textarea name="body" placeholder="Escribe una pregunta sobre este expediente"></textarea>
            <button class="primary" type="submit">Enviar mensaje</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

function renderDashboardCases() {
  const activeCase = getSelectedCase();

  return `
    <section class="section shell" id="dashboard-cases">
      <div class="section-head">
        <div>
          <div class="kicker">Tus expedientes</div>
            <h2 class="section-title">Cada inmueble avanza por su propio proceso</h2>
            <p class="section-copy">Cada expediente muestra qué ya sabes, qué falta por desbloquear, qué pago sigue y qué implicaciones tiene la etapa actual.</p>
        </div>
      </div>
      <div class="dashboard-grid">
        <div class="dashboard-card">
          <div class="kicker">Lista de expedientes</div>
          <div class="case-list">
            ${state.cases.length ? state.cases.map((caseItem) => `
              <button class="case-item ${activeCase?.id === caseItem.id ? "active" : ""}" data-action="select-case" data-case-id="${caseItem.id}">
                <div class="kicker">${escapeHtml(STATUS_LABELS[caseItem.status] || caseItem.status)}</div>
                <strong>${escapeHtml(caseItem.property.title)}</strong>
                <p>${escapeHtml(caseItem.property.city)} · ${escapeHtml(caseItem.property.zoneLabel || "")}</p>
                <div class="progress"><span style="width:${Math.max(12, (caseItem.progress.approvedCount / 3) * 100)}%"></span></div>
                <div class="small">Etapa actual: ${escapeHtml(STAGE_LABELS[caseItem.currentStage] || caseItem.currentStage)}</div>
              </button>
            `).join("") : `<div class="empty">Aún no has abierto ningún expediente. Desde el catálogo puedes marcar un inmueble y empezar.</div>`}
          </div>
        </div>
        ${renderCaseDetail(activeCase)}
      </div>
    </section>
  `;
}
